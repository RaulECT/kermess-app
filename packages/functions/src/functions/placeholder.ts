import { onCall } from 'firebase-functions/v2/https'

// Placeholder para que el proyecto compile en Fase 1.
// Se reemplaza en Fase 2.
export const healthCheck = onCall({ region: 'us-central1' }, async (_request) => {
  return { status: 'ok', message: 'Kermes Functions v1' }
})
