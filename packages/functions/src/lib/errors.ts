import { HttpsError } from 'firebase-functions/v2/https'
import { ZodError } from 'zod'

export function toHttpsError(e: unknown): HttpsError {
  if (e instanceof HttpsError) return e
  if (e instanceof ZodError) {
    const msg = e.errors.map((err) => `${err.path.join('.')}: ${err.message}`).join(', ')
    return new HttpsError('invalid-argument', `Datos inválidos — ${msg}`)
  }
  console.error('Unexpected error:', e)
  return new HttpsError('internal', 'Error interno del servidor')
}
