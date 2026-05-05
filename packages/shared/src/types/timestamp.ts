/**
 * Interfaz mínima compatible con firebase/firestore Timestamp
 * y firebase-admin/firestore Timestamp.
 * Usamos esta en lugar de importar Firebase directamente en shared.
 */
export interface Timestamp {
  seconds: number
  nanoseconds: number
  toDate(): Date
}
