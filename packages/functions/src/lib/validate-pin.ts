import { getFirestore } from 'firebase-admin/firestore'
import { HttpsError } from 'firebase-functions/v2/https'
import { comparePin } from './hash'

export async function validateAdminPin(pin: string): Promise<{ adminId: string; name: string }> {
  const db = getFirestore()
  const snapshot = await db.collection('admins').get()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.active && await comparePin(pin, data.pin as string)) {
      return { adminId: doc.id, name: data.name as string }
    }
  }

  throw new HttpsError('unauthenticated', 'PIN de administrador incorrecto')
}

export async function validateCashierPin(pin: string): Promise<{ cashierId: string; name: string }> {
  const db = getFirestore()
  // Query simple (sin índice compuesto) — filtramos active y role en memoria
  const snapshot = await db.collection('operators').get()

  for (const doc of snapshot.docs) {
    const data = doc.data()
    if (data.active && data.role === 'cashier' && await comparePin(pin, data.pin as string)) {
      return { cashierId: doc.id, name: data.name as string }
    }
  }

  throw new HttpsError('unauthenticated', 'PIN de cajero incorrecto')
}
