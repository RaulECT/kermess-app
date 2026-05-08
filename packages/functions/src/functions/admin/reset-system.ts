import { onCall } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { resetSystemSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

async function deleteCollection(collectionPath: string): Promise<void> {
  const db = getFirestore()
  const refs = await db.collection(collectionPath).listDocuments()
  for (let i = 0; i < refs.length; i += 500) {
    const batch = db.batch()
    refs.slice(i, i + 500).forEach((ref) => batch.delete(ref))
    await batch.commit()
  }
}

export const resetSystem = onCall({ region: 'us-central1', timeoutSeconds: 120 }, async (request) => {
  try {
    const { adminPin } = resetSystemSchema.parse(request.data)
    const { adminId, name: adminName } = await validateAdminPin(adminPin)

    const db = getFirestore()

    await Promise.all([
      deleteCollection('stations'),
      deleteCollection('operators'),
      deleteCollection('users'),
      deleteCollection('transactions'),
      deleteCollection('auditLog'),
    ])

    // Reset event config: back to setup, totals to 0
    const configRef = db.collection('config').doc('event')
    const configSnap = await configRef.get()
    if (configSnap.exists) {
      const data = configSnap.data()!
      const resetGoals = (data.goals as Array<Record<string, unknown>>).map((g) => ({ ...g, raised: 0 }))
      await configRef.update({
        status: 'setup',
        totalRaised: 0,
        goals: resetGoals,
        startedAt: null,
        endedAt: null,
      })
    }

    await writeAudit({
      action: 'reset_system',
      actorId: adminId,
      actorName: adminName,
      actorRole: 'admin',
      targetType: 'config',
      targetId: 'event',
      targetName: 'Sistema',
      details: {},
    })

    return { ok: true }
  } catch (e) {
    throw toHttpsError(e)
  }
})
