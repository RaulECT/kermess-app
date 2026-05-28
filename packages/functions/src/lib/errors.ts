import { HttpsError } from 'firebase-functions/v2/https'
import { ZodError } from 'zod'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export function toHttpsError(e: unknown): HttpsError {
  if (e instanceof HttpsError) return e
  if (e instanceof ZodError) {
    const msg = e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
    return new HttpsError('invalid-argument', `Datos inválidos — ${msg}`)
  }
  console.error('Unexpected error:', e)
  return new HttpsError('internal', 'Error interno del servidor')
}

// Returns true for errors that need developer attention:
// unexpected runtime errors, ZodErrors, and systemic HttpsErrors (config/data issues).
// Returns false for normal user-input errors (wrong PIN, insufficient balance).
export function isSystemicError(e: unknown): boolean {
  if (!(e instanceof HttpsError)) return true
  if (e.code === 'unauthenticated') return false
  if (e.code === 'invalid-argument') return false
  if (e.message.includes('Saldo insuficiente')) return false
  if (e.message.includes('no genera cupones')) return false
  return true
}

export function logSystemError(
  functionName: string,
  error: unknown,
  context: Record<string, unknown>,
): void {
  const message = error instanceof Error ? error.message : String(error)
  const code =
    error instanceof HttpsError
      ? error.code
      : 'internal'

  try {
    getFirestore()
      .collection('systemErrors')
      .add({
        function: functionName,
        code,
        message,
        context,
        resolved: false,
        timestamp: FieldValue.serverTimestamp(),
      })
      .catch(() => {/* fire-and-forget, never throws */})
  } catch {
    // never block the caller
  }
}
