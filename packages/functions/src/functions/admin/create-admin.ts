import { onCall } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { createAdminSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { hashPin } from '../../lib/hash'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const createAdmin = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin, name, pin } = createAdminSchema.parse(request.data)
    const { adminId } = await validateAdminPin(adminPin)

    const db = getFirestore()
    const newAdminId = uuidv4()

    await db.collection('admins').doc(newAdminId).set({
      name,
      pin: await hashPin(pin),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    await writeAudit({
      action: 'create_admin',
      actorId: adminId,
      actorRole: 'admin',
      targetType: 'admin',
      targetId: newAdminId,
      details: { name },
    })

    return { adminId: newAdminId }
  } catch (e) {
    throw toHttpsError(e)
  }
})
