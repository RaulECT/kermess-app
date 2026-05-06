import { onCall } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { registerUserSchema } from '@kermess/shared'
import { validateCashierPin } from '../../lib/validate-pin'
import { writeAudit } from '../../lib/audit'
import { toHttpsError } from '../../lib/errors'
import {
  sendWelcomeWhatsApp,
  TWILIO_ACCOUNT_SID,
  TWILIO_AUTH_TOKEN,
  TWILIO_WA_FROM,
  APP_BASE_URL,
} from '../../lib/whatsapp'

export const registerUser = onCall(
  {
    region: 'us-central1',
    timeoutSeconds: 30,
    secrets: [TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, TWILIO_WA_FROM, APP_BASE_URL],
  },
  async (request) => {
    try {
      const { cashierPin, name, phone: rawPhone } = registerUserSchema.parse(request.data)
      const phone = rawPhone.startsWith('+') ? rawPhone : `+521${rawPhone}`
      const { cashierId, name: cashierName } = await validateCashierPin(cashierPin)

      const db = getFirestore()
      const userId = uuidv4() // userId === qrToken

      await db.collection('users').doc(userId).set({
        name,
        phone,
        qrToken: userId,
        balance: 0,
        totalLoaded: 0,
        createdAt: FieldValue.serverTimestamp(),
        createdBy: cashierId,
      })

      await writeAudit({
        action: 'create_user',
        actorId: cashierId,
        actorName: cashierName,
        actorRole: 'cashier',
        targetType: 'user',
        targetId: userId,
        targetName: name,
        details: { name, phone },
      })

      try {
        await sendWelcomeWhatsApp({ to: phone, name, token: userId })
      } catch (err) {
        console.error('WhatsApp send failed:', err)
      }

      return { userId, qrToken: userId }
    } catch (e) {
      throw toHttpsError(e)
    }
  }
)
