import { onCall, HttpsError } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { validateAdminPin } from '../../lib/validate-pin'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({ pin: z.string().min(4).max(6) })

export const adminLogin = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { pin } = schema.parse(request.data)
    const admin = await validateAdminPin(pin)
    return { adminId: admin.adminId, name: admin.name }
  } catch (e) {
    throw toHttpsError(e)
  }
})
