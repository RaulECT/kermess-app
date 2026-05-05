import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { upsertStationSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { hashPin } from '../../lib/hash'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const upsertStation = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin, station } = upsertStationSchema.parse(request.data)
    const { adminId } = await validateAdminPin(adminPin)

    const db = getFirestore()
    const isNew = !station.id || station.id === null
    const stationId = station.id ?? uuidv4()
    const stationRef = db.collection('stations').doc(stationId)

    if (isNew && !station.operatorPin) {
      throw new HttpsError('invalid-argument', 'Se requiere PIN para nuevas estaciones')
    }

    const data: Record<string, unknown> = {
      name: station.name,
      type: station.type,
      simplePrice: station.simplePrice,
      menu: station.menu,
      active: station.active,
      order: station.order,
    }

    if (station.operatorPin) {
      data.operatorPin = await hashPin(station.operatorPin)
    }

    if (isNew) {
      data.totalSales = 0
      data.createdAt = FieldValue.serverTimestamp()
      await stationRef.set(data)
    } else {
      await stationRef.set(data, { merge: true })
    }

    await writeAudit({
      action: 'upsert_station',
      actorId: adminId,
      actorRole: 'admin',
      targetType: 'station',
      targetId: stationId,
      details: { isNew, name: station.name },
    })

    return { stationId }
  } catch (e) {
    throw toHttpsError(e)
  }
})
