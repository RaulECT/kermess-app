import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { AuditAction, ActorRole } from '@kermess/shared'

interface AuditEntry {
  action: AuditAction
  actorId: string
  actorName?: string
  actorRole: ActorRole
  targetType: string
  targetId: string
  targetName?: string
  details: Record<string, unknown>
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const db = getFirestore()
  try {
    await db.collection('auditLog').add({
      ...entry,
      timestamp: FieldValue.serverTimestamp(),
    })
  } catch (e) {
    console.error('writeAudit failed (non-critical):', e)
  }
}
