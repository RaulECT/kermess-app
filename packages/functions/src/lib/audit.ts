import { getFirestore, FieldValue } from 'firebase-admin/firestore'
import type { AuditAction, ActorRole } from '@kermess/shared'

interface AuditEntry {
  action: AuditAction
  actorId: string
  actorRole: ActorRole
  targetType: string
  targetId: string
  details: Record<string, unknown>
}

export async function writeAudit(entry: AuditEntry): Promise<void> {
  const db = getFirestore()
  await db.collection('auditLog').add({
    ...entry,
    timestamp: FieldValue.serverTimestamp(),
  })
}
