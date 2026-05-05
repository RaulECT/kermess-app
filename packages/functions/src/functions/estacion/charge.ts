import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { chargeSchema } from '@kermess/shared'
import { comparePin } from '../../lib/hash'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const charge = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { operatorPin, stationId, userId, clientTxId, items } =
      chargeSchema.parse(request.data)

    const db = getFirestore()
    const stationRef = db.collection('stations').doc(stationId)
    const userRef = db.collection('users').doc(userId)
    const txRef = db.collection('transactions').doc(clientTxId)

    // Idempotencia: si la tx ya existe, retornar sin duplicar
    const existingTx = await txRef.get()
    if (existingTx.exists) {
      const d = existingTx.data()!
      return { txId: clientTxId, couponsCharged: Math.abs(d.amount as number), idempotent: true }
    }

    // Leer estación y validar PIN
    const stationDoc = await stationRef.get()
    if (!stationDoc.exists) throw new HttpsError('not-found', 'Estación no encontrada')

    const station = stationDoc.data()!
    if (!station.active) throw new HttpsError('failed-precondition', 'Estación inactiva')

    const pinValid = await comparePin(operatorPin, station.operatorPin as string)
    if (!pinValid) throw new HttpsError('unauthenticated', 'PIN de estación incorrecto')

    // Verificar estado del evento
    const eventDoc = await db.collection('config').doc('event').get()
    if (!eventDoc.exists) throw new HttpsError('failed-precondition', 'Evento no configurado')
    const event = eventDoc.data()!
    if (event.status !== 'live') {
      throw new HttpsError('failed-precondition', 'El evento no está activo')
    }

    // Calcular costo total usando siempre precios del servidor
    let totalCost: number
    let resolvedItems: Array<{ name: string; price: number; qty: number }> | undefined

    if (station.type === 'simple') {
      totalCost = station.simplePrice as number
    } else {
      // Menú: items requeridos
      if (!items || items.length === 0) {
        throw new HttpsError('invalid-argument', 'Se requieren items para estación con menú')
      }
      const stationMenu = station.menu as Array<{ id: string; name: string; price: number; active: boolean }>
      resolvedItems = []
      totalCost = 0
      for (const item of items) {
        const menuItem = stationMenu.find((m) => m.name === item.name && m.active)
        if (!menuItem) {
          throw new HttpsError('invalid-argument', `Item no encontrado en el menú: "${item.name}"`)
        }
        resolvedItems.push({ name: menuItem.name, price: menuItem.price, qty: item.qty })
        totalCost += menuItem.price * item.qty
      }
    }

    if (totalCost <= 0) throw new HttpsError('invalid-argument', 'El costo debe ser mayor a 0')

    // Transacción atómica: validar saldo y debitar
    await db.runTransaction(async (tx) => {
      const userDoc = await tx.get(userRef)
      if (!userDoc.exists) throw new HttpsError('not-found', 'Usuario no encontrado')

      const user = userDoc.data()!
      const currentBalance = user.balance as number

      if (currentBalance < totalCost) {
        throw new HttpsError(
          'failed-precondition',
          `Saldo insuficiente. Saldo: ${currentBalance}, Costo: ${totalCost}`
        )
      }

      const newBalance = currentBalance - totalCost

      tx.update(userRef, { balance: newBalance })

      const txData: Record<string, unknown> = {
        type: 'purchase',
        userId,
        userName: user.name as string,
        amount: -totalCost,
        clientTxId,
        stationId,
        stationName: station.name as string,
        timestamp: FieldValue.serverTimestamp(),
      }

      if (resolvedItems && resolvedItems.length > 0) {
        txData.items = resolvedItems
      }

      tx.set(txRef, txData)

      // Actualizar totalSales de la estación
      tx.update(stationRef, {
        totalSales: FieldValue.increment(totalCost),
      })
    })

    await writeAudit({
      action: 'charge',
      actorId: stationId,
      actorRole: 'operator',
      targetType: 'user',
      targetId: userId,
      details: {
        totalCost,
        stationName: station.name as string,
        ...(items ? { items } : {}),
      },
    })

    return { txId: clientTxId, couponsCharged: totalCost }
  } catch (e) {
    throw toHttpsError(e)
  }
})
