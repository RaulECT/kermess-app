'use client'

import { useState } from 'react'
import { useStationSession } from '@/context/station-session'
import { QrChargeFlow } from './qr-charge-flow'
import { StationHistory } from './station-history'

type View = 'scan' | 'menu' | 'history'

// ── Sidebar (desktop) ─────────────────────────────────────────────────────────
function StationSidebar({
  view,
  stationName,
  onNavigate,
  onLogout,
}: {
  view: View
  stationName: string
  onNavigate: (v: View) => void
  onLogout: () => void
}) {
  const navItems: { id: View; icon: string; label: string }[] = [
    { id: 'scan', icon: '⊡', label: 'Cobrar' },
    { id: 'menu', icon: '◫', label: 'Menú' },
    { id: 'history', icon: '⟳', label: 'Historial' },
  ]

  return (
    <aside className="hidden w-[260px] flex-col bg-surface-secondary p-5 md:flex" style={{ paddingTop: 32 }}>
      {/* Logo */}
      <div className="mb-6 flex items-center gap-3">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-amber">
          <span className="text-xl">🏪</span>
        </div>
        <span className="text-[18px] font-semibold text-fg-primary">Estación</span>
      </div>

      {/* Station info card */}
      <div className="mb-6 flex flex-col gap-2 rounded-xl bg-surface-elevated p-4">
        <p className="text-[16px] font-semibold text-fg-primary">{stationName}</p>
        <div className="flex items-center gap-1.5 rounded-full bg-[#22C55E1A] px-2.5 py-1 w-fit">
          <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
          <span className="text-[11px] font-medium text-accent-green">Activa</span>
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
                  ? 'bg-accent-amber font-medium text-fg-inverse'
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
function StationBottomNav({
  view,
  onNavigate,
}: {
  view: View
  onNavigate: (v: View) => void
}) {
  const items: { id: View; icon: string; label: string }[] = [
    { id: 'scan', icon: '⊡', label: 'Cobrar' },
    { id: 'menu', icon: '◫', label: 'Menú' },
    { id: 'history', icon: '⟳', label: 'Historial' },
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
              isActive ? 'text-accent-amber' : 'text-fg-muted'
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

// ── Mobile Header ─────────────────────────────────────────────────────────────
function StationMobileHeader({
  stationName,
  onLogout,
}: {
  stationName: string
  onLogout: () => void
}) {
  return (
    <header className="flex items-center justify-between border-b border-border-subtle bg-surface-secondary px-5 py-4 md:hidden">
      <div className="flex items-center gap-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-accent-amber">
          <span>🏪</span>
        </div>
        <div>
          <p className="text-[14px] font-semibold text-fg-primary">{stationName}</p>
          <div className="flex items-center gap-1">
            <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
            <span className="text-[11px] text-accent-green">Activa</span>
          </div>
        </div>
      </div>
      <button
        onClick={onLogout}
        className="text-[13px] text-accent-rose"
      >
        Salir
      </button>
    </header>
  )
}

// ── Desktop Top Bar ────────────────────────────────────────────────────────────
function StationDesktopTopBar({ stationName }: { stationName: string }) {
  return (
    <div className="mb-6 flex items-start justify-between">
      <div>
        <h1 className="text-3xl font-bold text-fg-primary">Cobrar</h1>
        <p className="mt-1 text-[14px] text-fg-secondary">
          Escanea el QR del asistente para realizar un cobro
        </p>
      </div>
      <span className="hidden text-[14px] font-medium text-fg-muted md:block">
        {stationName}
      </span>
    </div>
  )
}

// ── Dashboard ─────────────────────────────────────────────────────────────────
export function StationDashboard() {
  const { session, logout } = useStationSession()
  const [view, setView] = useState<View>('scan')

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-surface-primary">
      {/* Desktop sidebar */}
      <StationSidebar
        view={view}
        stationName={session.name}
        onNavigate={setView}
        onLogout={logout}
      />

      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Mobile header */}
        <StationMobileHeader stationName={session.name} onLogout={logout} />

        {/* Main */}
        <main className="flex-1 overflow-y-auto pb-20 md:pb-0">
          {view === 'scan' && (
            <div className="p-5 md:p-8">
              <StationDesktopTopBar stationName={session.name} />
              <QrChargeFlow />
            </div>
          )}
          {view === 'menu' && (
            <div className="p-5 md:p-8">
              <h2 className="mb-4 text-xl font-bold text-fg-primary">Menú</h2>
              {session.type === 'menu' && session.menu ? (
                <div className="flex flex-col gap-2">
                  {session.menu.filter((i) => i.active).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center justify-between rounded-xl bg-surface-secondary p-4"
                    >
                      <span className="text-[15px] text-fg-primary">{item.name}</span>
                      <span className="font-mono text-[15px] font-semibold text-accent-amber">
                        {item.price} cupones
                      </span>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-fg-muted">Esta estación no tiene menú configurado.</p>
              )}
            </div>
          )}
          {view === 'history' && (
            <div className="p-5 md:p-8">
              <StationHistory onBack={() => setView('scan')} />
            </div>
          )}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <StationBottomNav view={view} onNavigate={setView} />
    </div>
  )
}
