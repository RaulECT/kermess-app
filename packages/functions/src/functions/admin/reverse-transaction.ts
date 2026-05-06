import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { reverseTransactionSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const reverseTransaction = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin, txId, reason } = reverseTransactionSchema.parse(request.data)
    const { adminId, name: adminName } = await validateAdminPin(adminPin)

    const db = getFirestore()
    const txRef = db.collection('transactions').doc(txId)
    const txDoc = await txRef.get()

    if (!txDoc.exists) throw new HttpsError('not-found', 'Transacción no encontrada')

    const tx = txDoc.data()!

    if (tx.reversedByTx) {
      throw new HttpsError('failed-precondition', 'Esta transacción ya fue revertida')
    }
    if (tx.type === 'reversal') {
      throw new HttpsError('failed-precondition', 'No se puede revertir una reversión')
    }

    const reversalId = uuidv4()
    const reversalRef = db.collection('transactions').doc(reversalId)
    const userRef = db.collection('users').doc(tx.userId as string)

    await db.runTransaction(async (t) => {
      const userDoc = await t.get(userRef)
      if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado')

      const currentBalance = userDoc.data()!.balance as number
      const restoreAmount = -(tx.amount as number) // invertir el monto original

      // Restaurar balance (suma si el original era negativo, resta si era positivo)
      t.update(userRef, { balance: currentBalance + restoreAmount })

      // Crear transacción de reversión
      t.set(reversalRef, {
        type: 'reversal',
        userId: tx.userId,
        userName: tx.userName,
        amount: restoreAmount,
        clientTxId: reversalId,
        reverses: txId,
        reason,
        reversedBy: adminId,
        timestamp: FieldValue.serverTimestamp(),
      })

      // Marcar la tx original como revertida
      t.update(txRef, { reversedByTx: reversalId })
    })

    // Si era un topup, revertir el conteo de metas
    if (tx.type === 'topup' && tx.goalId && tx.pesosReceived) {
      const eventRef = db.collection('config').doc('event')
      await db.runTransaction(async (t) => {
        const eventDoc = await t.get(eventRef)
        if (!eventDoc.exists) return
        const data = eventDoc.data()!
        const goals = data.goals as Array<{ id: string; name: string; target: number; raised: number }>
        const updatedGoals = goals.map((g) =>
          g.id === tx.goalId ? { ...g, raised: Math.max(0, g.raised - (tx.pesosReceived as number)) } : g
        )
        t.update(eventRef, {
          totalRaised: FieldValue.increment(-(tx.pesosReceived as number)),
          goals: updatedGoals,
        })
      })
    }

    await writeAudit({
      action: 'reverse_tx',
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      targetType: 'transaction',
      targetId: txId,
      targetName: tx.userName as string,
      details: { reason, reversalId, originalType: tx.type },
    })

    return { reversalId }
  } catch (e) {
    throw toHttpsError(e)
  }
})
