import { initializeApp, getApps, getApp } from 'firebase/app'
import { getFirestore, connectFirestoreEmulator } from 'firebase/firestore'
import { getAuth, connectAuthEmulator, signInAnonymously } from 'firebase/auth'
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions'

const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY!,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN!,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID!,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET!,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID!,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID!,
}

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp()

export const db = getFirestore(app)
export const auth = getAuth(app)
export const functions = getFunctions(app, 'us-central1')

// Conectar a emuladores en desarrollo (solo una vez por módulo)
let _emulatorsConnected = false
if (process.env.NEXT_PUBLIC_USE_EMULATOR === 'true' && process.env.NODE_ENV !== 'production' && !_emulatorsConnected) {
  _emulatorsConnected = true
  // Usa la IP de red si está definida (para probar desde otros dispositivos en LAN),
  // de lo contrario usa localhost
  const emulatorHost = process.env.NEXT_PUBLIC_EMULATOR_HOST ?? 'localhost'
  connectFirestoreEmulator(db, emulatorHost, 8080)
  connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true })
  connectFunctionsEmulator(functions, emulatorHost, 5001)
}

// Autenticación anónima lazy
let authReady = false
export async function ensureAuth(): Promise<void> {
  if (authReady) return
  if (!auth.currentUser) {
    try {
      await signInAnonymously(auth)
    } catch {
      throw new Error('No se pudo conectar con el servidor. Verifica tu conexión.')
    }
  }
  authReady = true
}
