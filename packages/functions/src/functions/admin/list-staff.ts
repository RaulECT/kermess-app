import { onCall } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { validateAdminPin } from '../../lib/validate-pin'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({ adminPin: z.string() })

export const listStaff = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { adminPin } = schema.parse(request.data)
    await validateAdminPin(adminPin)

    const db = getFirestore()
    const [operatorsSnap, adminsSnap] = await Promise.all([
      db.collection('operators').get(),
      db.collection('admins').get(),
    ])

    const operators = operatorsSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string, role: 'cashier' as const }))
    const admins = adminsSnap.docs.map((d) => ({ id: d.id, name: d.data().name as string, role: 'admin' as const }))

    return { operators, admins }
  } catch (e) {
    throw toHttpsError(e)
  }
})
