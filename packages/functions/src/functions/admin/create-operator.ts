import { onCall } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { createOperatorSchema } from '@kermess/shared'
import { validateAdminPin } from '../../lib/validate-pin'
import { hashPin } from '../../lib/hash'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'

export const createOperator = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin, name, pin } = createOperatorSchema.parse(request.data)
    const { adminId } = await validateAdminPin(adminPin)

    const db = getFirestore()
    const operatorId = uuidv4()

    await db.collection('operators').doc(operatorId).set({
      name,
      pin: await hashPin(pin),
      role: 'cashier',
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    await writeAudit({
      action: 'create_operator',
      actorId: adminId,
      actorRole: 'admin',
      targetType: 'operator',
      targetId: operatorId,
      details: { name },
    })

    return { operatorId }
  } catch (e) {
    throw toHttpsError(e)
  }
})
