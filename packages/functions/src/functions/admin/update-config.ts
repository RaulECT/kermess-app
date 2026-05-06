import { onCall } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { updateConfigSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const updateConfig = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin, patch } = updateConfigSchema.parse(request.data)
    const { adminId, name: adminName } = await validateAdminPin(adminPin)

    const db = getFirestore()
    const eventRef = db.collection('config').doc('event')
    const update: Record<string, unknown> = {}

    if (patch.name !== undefined) update.name = patch.name
    if (patch.couponRate !== undefined) update.couponRate = patch.couponRate
    if (patch.status !== undefined) {
      update.status = patch.status
      if (patch.status === 'live') update.startedAt = FieldValue.serverTimestamp()
      if (patch.status === 'closed') update.endedAt = FieldValue.serverTimestamp()
    }

    if (patch.goals !== undefined) {
      const current = await eventRef.get()
      const currentGoals = (current.data()?.goals ?? []) as Array<{ id: string; raised: number }>

      update.goals = patch.goals.map((g) => ({
        id: g.id,
        name: g.name,
        target: g.target,
        raised: currentGoals.find((cg) => cg.id === g.id)?.raised ?? 0,
      }))
    }

    await eventRef.set(update, { merge: true })

    await writeAudit({
      action: 'update_config',
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      targetType: 'config',
      targetId: 'event',
      targetName: 'Configuración del evento',
      details: patch as Record<string, unknown>,
    })

    return { success: true }
  } catch (e) {
    throw toHttpsError(e)
  }
})
