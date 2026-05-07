import { onCall } from 'firebase-functions/v2/https'
import { getFirestore } from 'firebase-admin/firestore'
import { z } from 'zod'
import { validateCashierPin } from '../../lib/validate-pin'
import { sendWelcomeSMS, TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, APP_BASE_URL } from '../../lib/sms'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({
  cashierPin: z.string().min(4).max(6),
  userId: z.string().min(1),
})

export const resendUserLink = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_SMS_FROM, APP_BASE_URL],
  },
  async (request) => {
    try {
      const { cashierPin, userId } = schema.parse(request.data)
      await validateCashierPin(cashierPin)

      const db = getFirestore()
      const snap = await db.collection('users').doc(userId).get()
      if (!snap.exists) throw new Error('Usuario no encontrado')

      const data = snap.data()!
      const phone = (data.phone as string).startsWith('+') ? data.phone as string : `+521${data.phone}`

      await sendWelcomeSMS({ to: phone, name: data.name as string, token: userId })

      return { ok: true }
    } catch (e) {
      throw toHttpsError(e)
    }
  }
)
