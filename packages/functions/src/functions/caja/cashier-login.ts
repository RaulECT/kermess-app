import { onCall } from 'firebase-functions/v2/https'
import { z } from 'zod'
import { validateCashierPin } from '../../lib/validate-pin'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({ pin: z.string().min(4).max(6) })

export const cashierLogin = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { pin } = schema.parse(request.data)
    const cashier = await validateCashierPin(pin)
    return { cashierId: cashier.cashierId, name: cashier.name }
  } catch (e) {
    throw toHttpsError(e)
  }
})
