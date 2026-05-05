import { onDocumentCreated } from 'firebase-functions/v2/firestore'
import { getFirestore, FieldValue } from 'firebase-admin/firestore'

export const onTransactionCreate = onDocumentCreated(
  { document: 'transactions/{txId}', region: 'us-central1' },
  async (event) => {
    const tx = event.data?.data()
    if (!tx) return

    // Solo los topups contribuyen a las metas de recaudación
    if (tx.type !== 'topup') return

    const pesosReceived = tx.pesosReceived as number
    const goalId = tx.goalId as string

    if (!pesosReceived || !goalId) return

    const db = getFirestore()
    const eventRef = db.collection('config').doc('event')

    await db.runTransaction(async (t) => {
      const eventDoc = await t.get(eventRef)
      if (!eventDoc.exists) return

      const data = eventDoc.data()!
      const goals = data.goals as Array<{
        id: string
        name: string
        target: number
        raised: number
      }>

      const updatedGoals = goals.map((g) =>
        g.id === goalId ? { ...g, raised: g.raised + pesosReceived } : g
      )

      t.update(eventRef, {
        totalRaised: FieldValue.increment(pesosReceived),
        goals: updatedGoals,
      })
    })
  }
)
