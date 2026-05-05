import { onCall } from 'firebase-functions/v2/https'
import { HttpsError } from 'firebase-functions/v2/https'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import { v4 as uuidv4 } from 'uuid'
import { z } from 'zod'
import { hashPin } from '../../lib/hash'
import { toHttpsError } from '../../lib/errors'

const schema = z.object({
  name: z.string().min(2).max(100),
  pin: z.string().min(4).max(6),
})

export const createInitialAdmin = onCall({ region: 'us-central1', timeoutSeconds: 30 }, async (request) => {
  try {
    const { name, pin } = schema.parse(request.data)

    const db = getFirestore()
    const existing = await db.collection('admins').limit(1).get()

    if (!existing.empty) {
      throw new HttpsError(
        'failed-precondition',
        'Ya existe un administrador. Usa tu PIN para acceder.'
      )
    }

    const adminId = uuidv4()
    await db.collection('admins').doc(adminId).set({
      name,
      pin: await hashPin(pin),
      active: true,
      createdAt: FieldValue.serverTimestamp(),
    })

    // Inicializar config/event si no existe
    const eventRef = db.collection('config').doc('event')
    const eventDoc = await eventRef.get()
    if (!eventDoc.exists) {
      await eventRef.set({
        name: 'Kermes App',
        couponRate: 1,
        goals: [
          { id: uuidv4(), name: 'Meta 1', target: 10000, raised: 0 },
          { id: uuidv4(), name: 'Meta 2', target: 10000, raised: 0 },
          { id: uuidv4(), name: 'Meta 3', target: 10000, raised: 0 },
        ],
        totalRaised: 0,
        status: 'setup',
        startedAt: null,
        endedAt: null,
      })
    }

    return { adminId, name }
  } catch (e) {
    throw toHttpsError(e)
  }
})
