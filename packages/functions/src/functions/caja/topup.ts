import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { topupSchema } from '@kermess/shared'
import { validateCashierPin } from '../../lib/validate-pin'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const topup = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { cashierPin, userId, pesos, paymentMethod, goalId, clientTxId } =
      topupSchema.parse(request.data)

    const { cashierId, name: cashierName } = await validateCashierPin(cashierPin)

    const db = getFirestore()
    const userRef = db.collection('users').doc(userId)
    const txRef = db.collection('transactions').doc(clientTxId)
    const eventRef = db.collection('config').doc('event')

    // Idempotencia: si ya existe la tx, retornar sin duplicar
    const existingTx = await txRef.get()
    if (existingTx.exists) {
      const d = existingTx.data()!
      return { txId: clientTxId, coupons: d.amount as number, idempotent: true }
    }

    // Leer config para couponRate y validar goalId
    const eventDoc = await eventRef.get()
    if (!eventDoc.exists) throw new HttpsError('failed-precondition', 'Evento no configurado')

    const event = eventDoc.data()!
    if (event.status !== 'live') {
      throw new HttpsError('failed-precondition', 'El evento no está activo')
    }
    const couponRate = event.couponRate as number
    const goals = event.goals as Array<{ id: string; name: string; raised: number; target: number }>
    const goal = goals.find((g) => g.id === goalId)
    if (!goal) throw new HttpsError('not-found', 'Meta no encontrada')

    const coupons = Math.floor(pesos * couponRate)
    if (coupons <= 0) throw new HttpsError('invalid-argument', 'El monto no genera cupones')

    // Transacción atómica: actualizar balance + crear tx
    let targetName = ''
    await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef)
      if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado')

      const user = userDoc.data()!
      targetName = user.name as string
      const newBalance = (user.balance as number) + coupons
      const newTotalLoaded = (user.totalLoaded as number) + coupons

      tx.update(userRef, { balance: newBalance, totalLoaded: newTotalLoaded })

      tx.set(txRef, {
        type: 'topup',
        userId,
        userName: user.name as string,
        amount: coupons,
        clientTxId,
        pesosReceived: pesos,
        paymentMethod,
        goalId,
        cashierId,
        timestamp: FieldValue.serverTimestamp(),
      })
    })

    await writeAudit({
      action: 'topup',
      actorId: cashierId,
      actorName: cashierName,
      actorRole: 'cashier',
      targetType: 'user',
      targetId: userId,
      targetName,
      details: { pesos, coupons, paymentMethod, goalId },
    })

    return { txId: clientTxId, coupons }
  } catch (e) {
    throw toHttpsError(e)
  }
})
