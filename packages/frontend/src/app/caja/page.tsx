'use client'

import { useState } from 'react'
import { useCashierSession } from '@/context/cashier-session'
import { CashierLogin } from './_components/cashier-login'
import { RegisterUser } from './_components/register-user'
import { TopupFlow } from './_components/topup-flow'
import { ShiftHistory } from './_components/shift-history'
import { ResendLink } from './_components/resend-link'

type View = 'menu' | 'register' | 'topup' | 'history' | 'resend'

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function CajaSidebar({
  view,
  onNavigate,
  onLogout,
  operatorName,
}: {
  view: View
  onNavigate: (v: View) => void
  onLogout: () => void
  operatorName: string
}) {
  const initials = operatorName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  const navItems: { id: View; icon: string; label: string }[] = [
    { id: 'menu', icon: '⊞', label: 'Menú Principal' },
    { id: 'register', icon: '👤', label: 'Registrar Asistente' },
    { id: 'topup', icon: '◎', label: 'Recargar Cupones' },
    { id: 'history', icon: '⟳', label: 'Mis Recargas' },
    { id: 'resend', icon: '✉', label: 'Reenviar Link' },
  ]

  return (
    <aside className="hidden w-[260px] flex-col bg-surface-secondary p-5 md:flex" style={{ paddingTop: 32 }}>
      {/* Logo */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary">
          <span className="font-mono text-[22px] font-bold text-fg-inverse">K</span>
        </div>
        <span className="text-[18px] font-semibold text-fg-primary">Kermess Caja</span>
      </div>

      {/* Operator card */}
      <div className="mb-6 flex items-center gap-3 rounded-xl bg-surface-elevated p-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary">
          <span className="text-[13px] font-semibold text-fg-inverse">{initials}</span>
        </div>
        <div>
          <p className="text-[13px] font-medium text-fg-primary">{operatorName}</p>
          <p className="text-[11px] text-fg-muted">Cajera · Turno Activo</p>
        </div>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {navItems.map((item) => {
          const isActive = view === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] transition-colors ${
                isActive
                  ? 'bg-accent-primary font-medium text-fg-inverse'
                  : 'text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary'
              }`}
            >
              <span className="text-base">{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Logout */}
      <button
        onClick={onLogout}
        className="flex w-full items-center gap-3 rounded-xl px-3.5 py-2.5 text-[14px] text-accent-rose transition-colors hover:bg-surface-elevated"
      >
        <span>↩</span>
        Cerrar Sesión
      </button>
    </aside>
  )
}

// ── Bottom Nav (mobile) ───────────────────────────────────────────────────────
function CajaBottomNav({
  view,
  onNavigate,
}: {
  view: View
  onNavigate: (v: View) => void
}) {
  const items: { id: View; icon: string; label: string }[] = [
    { id: 'menu', icon: '⊞', label: 'Menú' },
    { id: 'register', icon: '👤', label: 'Registro' },
    { id: 'topup', icon: '◎', label: 'Recarga' },
    { id: 'history', icon: '⟳', label: 'Historial' },
    { id: 'resend', icon: '✉', label: 'Reenviar' },
  ]

  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-border-subtle bg-surface-secondary px-4 pb-7 pt-2 md:hidden">
      {items.map((item) => {
        const isActive = view === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 text-[11px] transition-colors ${
              isActive ? 'text-accent-primary' : 'text-fg-muted'
            }`}
          >
            <span className="text-xl">{item.icon}</span>
            {item.label}
          </button>
        )
      })}
    </nav>
  )
}

// ── Menú Principal (main content) ─────────────────────────────────────────────
function MenuPrincipal({ onNavigate }: { onNavigate: (v: View) => void }) {
  const cards: {
    view: View
    icon: string
    iconBg: string
    title: string
    desc: string
  }[] = [
    {
      view: 'register',
      icon: '👤',
      iconBg: '#A855F71A',
      title: 'Registrar Nuevo\nAsistente',
      desc: 'Registra un nuevo asistente y genera su código QR para el evento',
    },
    {
      view: 'topup',
      icon: '◎',
      iconBg: '#22C55E1A',
      title: 'Recargar\nCupones',
      desc: 'Añade cupones a la cuenta de un asistente registrado',
    },
    {
      view: 'history',
      icon: '⟳',
      iconBg: '#3B82F61A',
      title: 'Mis Recargas\ndel Turno',
      desc: 'Consulta el historial de transacciones de tu turno actual',
    },
    {
      view: 'resend',
      icon: '✉',
      iconBg: '#F59E0B1A',
      title: 'Reenviar\nLink por SMS',
      desc: 'Reenvía el link de cupones a un asistente por SMS',
    },
  ]

  return (
    <div className="flex flex-col gap-6 p-6 md:p-8">
      {/* Top bar */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-2xl font-bold text-fg-primary md:text-3xl">Menú Principal</h1>
          <p className="mt-1 text-[14px] text-fg-secondary">Selecciona una acción para continuar</p>
        </div>
        <div className="hidden items-center gap-3 md:flex">
          <div className="flex items-center gap-2 rounded-full bg-[#22C55E1A] px-3.5 py-1.5">
            <span className="h-2 w-2 rounded-full bg-accent-green" />
            <span className="text-[13px] font-medium text-accent-green">En Vivo</span>
          </div>
          <span className="text-[14px] font-medium text-fg-secondary">Kermess 2026</span>
        </div>
      </div>

      {/* Action cards — 2x2 grid */}
      <div className="grid grid-cols-2 gap-5">
        {cards.map((card) => (
          <button
            key={card.title}
            onClick={() => onNavigate(card.view)}
            className="flex flex-col gap-4 rounded-2xl bg-surface-secondary p-5 text-left transition-colors hover:bg-surface-elevated md:p-6"
          >
            <div
              className="flex h-[52px] w-[52px] items-center justify-center rounded-xl text-2xl"
              style={{ background: card.iconBg }}
            >
              {card.icon}
            </div>
            <div>
              <p className="whitespace-pre-line text-[15px] font-semibold leading-snug text-fg-primary md:text-[18px]">
                {card.title}
              </p>
              <p className="mt-1 hidden text-[13px] text-fg-muted md:block">{card.desc}</p>
            </div>
          </button>
        ))}
      </div>
    </div>
  )
}

// ── Dashboard wrapper ──────────────────────────────────────────────────────────
function CajaDashboard() {
  const { session, logout } = useCashierSession()
  const [view, setView] = useState<View>('menu')

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-surface-primary">
      <CajaSidebar
        view={view}
        onNavigate={setView}
        onLogout={logout}
        operatorName={session.name}
      />

      <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
        {view === 'menu' && <MenuPrincipal onNavigate={setView} />}
        {view === 'register' && (
          <RegisterUser onBack={() => setView('menu')} />
        )}
        {view === 'topup' && (
          <TopupFlow onBack={() => setView('menu')} />
        )}
        {view === 'history' && (
          <ShiftHistory onBack={() => setView('menu')} />
        )}
        {view === 'resend' && (
          <ResendLink onBack={() => setView('menu')} />
        )}
      </main>

      <CajaBottomNav view={view} onNavigate={setView} />
    </div>
  )
}

export default function CajaPage() {
  const { session } = useCashierSession()
  if (!session) return <CashierLogin />
  return <CajaDashboard />
}
