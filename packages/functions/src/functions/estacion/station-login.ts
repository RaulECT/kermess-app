import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { comparePin } from '../../lib/hash'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({
  stationId: z.string().min(1),
  operatorPin: z.string().min(4).max(6),
})

export const stationLogin = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { stationId, operatorPin } = schema.parse(request.data)

    const db = getFirestore()
    const stationDoc = await db.collection('stations').doc(stationId).get()

    if (!stationDoc.exists) {
      throw new HttpsError('not-found', 'Estación no encontrada')
    }

    const station = stationDoc.data()!

    if (!station.active) {
      throw new HttpsError('failed-precondition', 'Estación inactiva')
    }

    const valid = await comparePin(operatorPin, station.operatorPin as string)
    if (!valid) {
      throw new HttpsError('unauthenticated', 'PIN incorrecto')
    }

    return {
      stationId,
      name: station.name as string,
      type: station.type as string,
      simplePrice: station.simplePrice as number | null,
      menu: station.menu ?? null,
    }
  } catch (e) {
    throw toHttpsError(e)
  }
})
