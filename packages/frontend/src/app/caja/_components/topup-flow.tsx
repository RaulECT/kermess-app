'use client'

import { useState, useEffect } from 'react'
import { collection, getDocs, doc, getDoc, onSnapshot, query, orderBy, limit } from 'firebase/firestore'
import { toast } from 'sonner'
import { v4 as uuidv4 } from 'uuid'
import { db } from '@/lib/firebase/client'
import { topup } from '@/lib/firebase/callables'
import { useCashierSession } from '@/context/cashier-session'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { QRScanner } from '@/components/shared/qr-scanner'
import type { User, EventConfig } from '@kermess/shared'

type Step = 'search' | 'amount' | 'confirm' | 'success'

interface FoundUser { id: string; name: string; phone: string; balance: number }

export function TopupFlow({ onBack }: { onBack: () => void }) {
  const { session } = useCashierSession()
  const [step, setStep] = useState<Step>('search')
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState<FoundUser[]>([])
  const [selectedUser, setSelectedUser] = useState<FoundUser | null>(null)
  const [showScanner, setShowScanner] = useState(false)
  const [pesos, setPesos] = useState('')
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'transfer'>('cash')
  const [selectedGoalId, setSelectedGoalId] = useState('')
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null)
  const [saving, setSaving] = useState(false)
  const [resultCoupons, setResultCoupons] = useState(0)

  useEffect(() => {
    return onSnapshot(doc(db, 'config', 'event'), (snap) => {
      if (snap.exists()) setEventConfig(snap.data() as EventConfig)
    })
  }, [])

  async function handleSearch() {
    if (!searchQuery.trim()) return
    const snap = await getDocs(query(collection(db, 'users'), orderBy('name'), limit(100)))
    const q = searchQuery.toLowerCase()
    const results = snap.docs
      .filter((d) => {
        const data = d.data() as User
        return data.name.toLowerCase().includes(q) || data.phone.includes(q)
      })
      .map((d) => {
        const data = d.data() as User
        return { id: d.id, name: data.name, phone: data.phone, balance: data.balance }
      })
    setSearchResults(results)
  }

  async function handleQRScan(token: string) {
    setShowScanner(false)
    const snap = await getDoc(doc(db, 'users', token))
    if (!snap.exists()) { toast.error('QR no válido'); return }
    const data = snap.data() as User
    selectUser({ id: snap.id, name: data.name, phone: data.phone, balance: data.balance })
  }

  function selectUser(user: FoundUser) {
    setSelectedUser(user)
    setStep('amount')
    setSearchResults([])
    setSearchQuery('')
  }

  const coupons = eventConfig ? Math.floor(parseFloat(pesos || '0') * eventConfig.couponRate) : 0
  const selectedGoal = eventConfig?.goals.find((g) => g.id === selectedGoalId)
  const canConfirm = parseFloat(pesos) > 0 && coupons > 0 && selectedGoalId && selectedUser

  async function handleTopup() {
    if (!session || !selectedUser || !canConfirm) return
    setSaving(true)
    try {
      const res = await topup({
        cashierPin: session.pin,
        userId: selectedUser.id,
        pesos: parseFloat(pesos),
        paymentMethod,
        goalId: selectedGoalId,
        clientTxId: uuidv4(),
      })
      setResultCoupons(res.coupons)
      setStep('success')
    } catch (e: unknown) {
      toast.error(e instanceof Error ? e.message : 'Error al recargar')
    } finally {
      setSaving(false)
    }
  }

  // ── Paso: éxito ──
  if (step === 'success') {
    return (
      <div className="flex flex-col items-center gap-6 p-6 text-center">
        <div className="flex h-20 w-20 items-center justify-center rounded-full bg-green-100 text-4xl">✓</div>
        <div>
          <h2 className="text-xl font-bold text-green-600">¡Recarga exitosa!</h2>
          <p className="text-muted-foreground">{selectedUser?.name}</p>
          <p className="mt-2 text-3xl font-extrabold">{resultCoupons} cupones</p>
          <p className="text-sm text-muted-foreground">+${parseFloat(pesos).toFixed(0)} — {paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</p>
          <p className="text-sm text-muted-foreground">Meta: {selectedGoal?.name}</p>
        </div>
        <div className="flex w-full max-w-xs flex-col gap-2">
          <Button onClick={() => { setStep('search'); setSelectedUser(null); setPesos(''); setSelectedGoalId('') }}>
            Nueva recarga
          </Button>
          <Button variant="ghost" onClick={onBack}>Volver al menú</Button>
        </div>
      </div>
    )
  }

  // ── Paso: confirmar ──
  if (step === 'confirm') {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="ghost" size="sm" onClick={() => setStep('amount')}>← Editar</Button>
        <h2 className="text-lg font-semibold">Confirmar recarga</h2>
        <Card>
          <CardContent className="flex flex-col gap-3 pt-4">
            <div className="flex justify-between"><span className="text-muted-foreground">Asistente</span><strong>{selectedUser?.name}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Monto</span><strong>${parseFloat(pesos).toFixed(0)} MXN</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Método</span><strong>{paymentMethod === 'cash' ? 'Efectivo' : 'Transferencia'}</strong></div>
            <div className="flex justify-between"><span className="text-muted-foreground">Meta</span><strong>{selectedGoal?.name}</strong></div>
            <div className="flex justify-between border-t pt-2 text-lg"><span className="text-muted-foreground">Cupones</span><strong className="text-green-600">{coupons} cupones</strong></div>
          </CardContent>
        </Card>
        <Button onClick={handleTopup} disabled={saving} className="w-full h-12 text-base">
          {saving ? 'Procesando...' : `Confirmar — ${coupons} cupones`}
        </Button>
      </div>
    )
  }

  // ── Paso: monto ──
  if (step === 'amount' && selectedUser) {
    return (
      <div className="flex flex-col gap-4 p-4">
        <Button variant="ghost" size="sm" onClick={() => { setStep('search'); setSelectedUser(null) }}>← Cambiar asistente</Button>
        <div className="rounded-lg border bg-muted/40 p-3">
          <p className="font-semibold">{selectedUser.name}</p>
          <p className="text-sm text-muted-foreground">{selectedUser.phone} · Saldo actual: {selectedUser.balance} cupones</p>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Monto a recargar ($)</Label>
          <Input type="number" inputMode="decimal" min="1" value={pesos}
            onChange={(e) => setPesos(e.target.value)} placeholder="0" className="text-2xl h-14 text-center" autoFocus />
          {coupons > 0 && (
            <p className="text-center text-sm text-muted-foreground">= <strong>{coupons} cupones</strong> (tasa: {eventConfig?.couponRate} c/peso)</p>
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Método de pago</Label>
          <div className="grid grid-cols-2 gap-2">
            {(['cash', 'transfer'] as const).map((m) => (
              <button key={m} type="button"
                onClick={() => setPaymentMethod(m)}
                className={`rounded-lg border px-4 py-3 text-sm font-medium transition-colors ${paymentMethod === m ? 'border-primary bg-primary text-primary-foreground' : 'hover:bg-muted/60'}`}
              >
                {m === 'cash' ? '💵 Efectivo' : '📲 Transferencia'}
              </button>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>Asignar a meta</Label>
          <div className="flex flex-col gap-2">
            {eventConfig?.goals.map((g) => (
              <button key={g.id} type="button"
                onClick={() => setSelectedGoalId(g.id)}
                className={`flex items-center justify-between rounded-lg border px-4 py-3 text-sm transition-colors ${selectedGoalId === g.id ? 'border-primary bg-primary/10 font-semibold' : 'hover:bg-muted/60'}`}
              >
                <span>{g.name}</span>
                <span className="text-xs text-muted-foreground">${g.raised.toLocaleString('es-MX')} / ${g.target.toLocaleString('es-MX')}</span>
              </button>
            ))}
          </div>
        </div>

        <Button disabled={!canConfirm} onClick={() => setStep('confirm')} className="w-full h-12">
          Continuar
        </Button>
      </div>
    )
  }

  // ── Paso: buscar asistente ──
  return (
    <div className="flex flex-col gap-4 p-4">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="sm" onClick={onBack}>← Volver</Button>
        <h2 className="text-lg font-semibold">Recargar cupones</h2>
      </div>

      {showScanner ? (
        <div className="flex flex-col gap-3">
          <Button variant="outline" onClick={() => setShowScanner(false)}>Cancelar escáner</Button>
          <QRScanner onScan={handleQRScan} onError={(e) => toast.error(e)} />
        </div>
      ) : (
        <>
          <Button variant="outline" onClick={() => setShowScanner(true)} className="w-full">
            Escanear QR del asistente
          </Button>
          <div className="relative flex items-center">
            <div className="flex-1 border-t" />
            <span className="mx-3 text-xs text-muted-foreground">o buscar por nombre / teléfono</span>
            <div className="flex-1 border-t" />
          </div>
          <div className="flex gap-2">
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Nombre o teléfono..."
              autoFocus
            />
            <Button onClick={handleSearch}>Buscar</Button>
          </div>

          {searchResults.length > 0 && (
            <div className="flex flex-col gap-1">
              {searchResults.map((u) => (
                <button key={u.id} type="button" onClick={() => selectUser(u)}
                  className="flex items-center justify-between rounded-lg border px-4 py-3 text-sm hover:bg-muted/60 text-left">
                  <div>
                    <p className="font-medium">{u.name}</p>
                    <p className="text-xs text-muted-foreground">{u.phone}</p>
                  </div>
                  <Badge variant="outline">{u.balance} cupones</Badge>
                </button>
              ))}
            </div>
          )}

          {searchResults.length === 0 && searchQuery && (
            <p className="text-center text-sm text-muted-foreground">Sin resultados. Verifica el nombre o teléfono.</p>
          )}
        </>
      )}
    </div>
  )
}
