'use client'

import { useState } from 'react'
import { collection, getDocs, orderBy, query } from 'firebase/firestore'
import { toast } from 'sonner'
import { db } from '@/lib/firebase/client'
import { resendUserLink } from '@/lib/firebase/callables'
import { useCashierSession } from '@/context/cashier-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import type { User } from '@kermess/shared'

interface FoundUser { id: string; name: string; phone: string }

export function ResendLink({ onBack }: { onBack: () => void }) {
  const { session } = useCashierSession()
  const [search, setSearch] = useState('')
  const [results, setResults] = useState<FoundUser[]>([])
  const [sending, setSending] = useState<string | null>(null)
  const [sent, setSent] = useState<string | null>(null)

  async function handleSearch() {
    if (!search.trim()) return
    const snap = await getDocs(query(collection(db, 'users'), orderBy('name')))
    const q = search.toLowerCase()
    setResults(
      snap.docs
        .filter((d) => {
          const data = d.data() as User
          return data.name.toLowerCase().includes(q) || data.phone.includes(q)
        })
        .slice(0, 10)
        .map((d) => ({ id: d.id, name: (d.data() as User).name, phone: (d.data() as User).phone }))
    )
  }

  async function handleSend(user: FoundUser) {
    if (!session) return
    setSending(user.id)
    try {
      await resendUserLink({ cashierPin: session.pin, userId: user.id })
      setSent(user.id)
      toast.success(`Link enviado a ${user.name}`)
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al enviar')
    } finally {
      setSending(null)
    }
  }

  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
        <h2 className="text-lg font-semibold">Reenviar link por SMS</h2>
      </div>

      <div className="flex gap-2">
        <Input
          placeholder="Buscar por nombre o teléfono…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
        />
        <Button onClick={handleSearch}>Buscar</Button>
      </div>

      <div className="flex flex-col gap-2">
        {results.length === 0 && search && (
          <p className="py-6 text-center text-sm text-muted-foreground">Sin resultados</p>
        )}
        {results.map((user) => (
          <div key={user.id} className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <div>
              <p className="font-medium">{user.name}</p>
              <p className="text-xs text-muted-foreground">{user.phone}</p>
            </div>
            <Button
              size="sm"
              variant={sent === user.id ? 'outline' : 'default'}
              disabled={sending === user.id}
              onClick={() => handleSend(user)}
            >
              {sending === user.id ? 'Enviando…' : sent === user.id ? 'Enviado ✓' : 'Enviar SMS'}
            </Button>
          </div>
        ))}
      </div>
    </div>
  )
}
