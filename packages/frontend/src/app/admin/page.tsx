'use client'

import { useState } from 'react'
import { useAdminSession } from '@/context/admin-session'
import { AdminLogin } from './_components/admin-login'
import { ConfigTab } from './_components/config-tab'
import { StationsTab } from './_components/stations-tab'
import { PersonalTab } from './_components/personal-tab'
import { ReportsTab } from './_components/reports-tab'
import { TransactionsTab } from './_components/transactions-tab'
import { AuditTab } from './_components/audit-tab'

type Tab = 'reportes' | 'transacciones' | 'config' | 'estaciones' | 'personal' | 'auditoria'

const NAV_ITEMS: { id: Tab; icon: string; label: string }[] = [
  { id: 'reportes', icon: '📊', label: 'Reportes' },
  { id: 'transacciones', icon: '⇄', label: 'Transacciones' },
  { id: 'config', icon: '⚙', label: 'Configuración' },
  { id: 'estaciones', icon: '🏪', label: 'Estaciones' },
  { id: 'personal', icon: '👥', label: 'Personal' },
  { id: 'auditoria', icon: '🛡', label: 'Auditoría' },
]

// ── Desktop sidebar (full labels) ─────────────────────────────────────────────
function AdminSidebarDesktop({
  tab,
  onNavigate,
  onLogout,
  adminName,
}: {
  tab: Tab
  onNavigate: (t: Tab) => void
  onLogout: () => void
  adminName: string
}) {
  const initials = adminName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden w-[240px] flex-shrink-0 flex-col bg-surface-secondary p-4 lg:flex" style={{ paddingTop: 24, paddingBottom: 24 }}>
      {/* Logo */}
      <div className="mb-8 flex items-center gap-2.5 px-2">
        <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-primary">
          <span className="text-[18px] font-bold text-fg-inverse">K</span>
        </div>
        <span className="text-[18px] font-semibold text-fg-primary">Kermess</span>
      </div>

      {/* Nav */}
      <nav className="flex flex-col gap-1">
        {NAV_ITEMS.map((item) => {
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex w-full items-center gap-2.5 rounded-lg px-3 py-2.5 text-[14px] transition-colors ${
                isActive
                  ? 'bg-accent-primary font-medium text-fg-inverse'
                  : 'text-fg-secondary hover:bg-surface-elevated hover:text-fg-primary'
              }`}
            >
              <span>{item.icon}</span>
              {item.label}
            </button>
          )
        })}
      </nav>

      <div className="flex-1" />

      {/* Admin info + logout */}
      <div className="flex items-center justify-between rounded-lg px-2">
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-full bg-accent-primary text-[12px] font-semibold text-fg-inverse">
            {initials}
          </div>
          <span className="text-[13px] text-fg-secondary">{adminName}</span>
        </div>
        <button onClick={onLogout} className="text-[13px] text-accent-rose hover:underline">
          Salir
        </button>
      </div>
    </aside>
  )
}

// ── Tablet sidebar (icon only) ────────────────────────────────────────────────
function AdminSidebarTablet({
  tab,
  onNavigate,
  onLogout,
  adminName,
}: {
  tab: Tab
  onNavigate: (t: Tab) => void
  onLogout: () => void
  adminName: string
}) {
  const initials = adminName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <aside className="hidden w-16 flex-shrink-0 flex-col items-center gap-4 bg-surface-secondary py-6 md:flex lg:hidden">
      {/* Logo icon */}
      <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-accent-primary">
        <span className="text-[18px] font-bold text-fg-inverse">K</span>
      </div>

      <nav className="flex flex-1 flex-col items-center gap-1 pt-2">
        {NAV_ITEMS.map((item) => {
          const isActive = tab === item.id
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              title={item.label}
              className={`flex h-10 w-10 items-center justify-center rounded-xl text-xl transition-colors ${
                isActive
                  ? 'bg-accent-primary text-fg-inverse'
                  : 'text-fg-muted hover:bg-surface-elevated hover:text-fg-primary'
              }`}
            >
              {item.icon}
            </button>
          )
        })}
      </nav>

      <div className="flex flex-col items-center gap-3">
        <button
          onClick={onLogout}
          title="Cerrar sesión"
          className="flex h-10 w-10 items-center justify-center rounded-xl text-accent-rose hover:bg-surface-elevated"
        >
          ↩
        </button>
        <div
          className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-[12px] font-semibold text-fg-inverse"
          title={adminName}
        >
          {initials}
        </div>
      </div>
    </aside>
  )
}

// ── Mobile bottom nav ─────────────────────────────────────────────────────────
function AdminBottomNav({
  tab,
  onNavigate,
}: {
  tab: Tab
  onNavigate: (t: Tab) => void
}) {
  // Show only 4 items on mobile for space
  const items = NAV_ITEMS.slice(0, 4)
  return (
    <nav className="fixed bottom-0 left-0 right-0 flex justify-around border-t border-border-subtle bg-surface-secondary px-2 pb-7 pt-2 md:hidden">
      {items.map((item) => {
        const isActive = tab === item.id
        return (
          <button
            key={item.id}
            onClick={() => onNavigate(item.id)}
            className={`flex flex-col items-center gap-1 text-[10px] transition-colors ${
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

// ── Top bar ───────────────────────────────────────────────────────────────────
function AdminTopBar({
  tab,
  adminName,
  onLogout,
}: {
  tab: Tab
  adminName: string
  onLogout: () => void
}) {
  const current = NAV_ITEMS.find((n) => n.id === tab)
  const initials = adminName
    .split(' ')
    .map((w) => w[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <header className="flex items-center justify-between border-b border-border-subtle px-5 py-4 md:px-6">
      <div className="flex items-center gap-3">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 md:hidden">
            <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-accent-primary">
              <span className="text-[14px] font-bold text-fg-inverse">K</span>
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-[18px] font-bold text-fg-primary md:text-[24px]">
                Kermess 2026
              </h1>
              <div className="flex items-center gap-1.5 rounded-full bg-[#22C55E1A] px-2.5 py-0.5">
                <span className="h-1.5 w-1.5 rounded-full bg-accent-green" />
                <span className="text-[11px] font-medium text-accent-green">En Vivo</span>
              </div>
            </div>
            <p className="text-[12px] text-fg-muted md:hidden">
              {current?.label}
            </p>
          </div>
        </div>
      </div>
      <div className="flex items-center gap-3">
        <span className="hidden text-[13px] text-fg-secondary md:block">{adminName}</span>
        <div className="flex h-9 w-9 items-center justify-center rounded-full bg-accent-primary text-[13px] font-semibold text-fg-inverse">
          {initials}
        </div>
        <button
          onClick={onLogout}
          className="hidden rounded-lg border border-border-default px-3 py-1.5 text-[13px] text-fg-secondary transition-colors hover:border-accent-rose hover:text-accent-rose md:block"
        >
          Salir
        </button>
      </div>
    </header>
  )
}

// ── Main dashboard ────────────────────────────────────────────────────────────
function AdminDashboard() {
  const { session, logout } = useAdminSession()
  const [tab, setTab] = useState<Tab>('reportes')

  if (!session) return null

  return (
    <div className="flex h-screen overflow-hidden bg-surface-primary">
      {/* Desktop sidebar */}
      <AdminSidebarDesktop
        tab={tab}
        onNavigate={setTab}
        onLogout={logout}
        adminName={session.name}
      />
      {/* Tablet icon sidebar */}
      <AdminSidebarTablet
        tab={tab}
        onNavigate={setTab}
        onLogout={logout}
        adminName={session.name}
      />

      {/* Main area */}
      <div className="flex flex-1 flex-col overflow-hidden">
        <AdminTopBar tab={tab} adminName={session.name} onLogout={logout} />

        <main className="flex-1 overflow-y-auto p-4 pb-24 md:p-6 md:pb-6">
          {tab === 'reportes' && <ReportsTab />}
          {tab === 'transacciones' && <TransactionsTab />}
          {tab === 'config' && <ConfigTab />}
          {tab === 'estaciones' && <StationsTab />}
          {tab === 'personal' && <PersonalTab />}
          {tab === 'auditoria' && <AuditTab />}
        </main>
      </div>

      {/* Mobile bottom nav */}
      <AdminBottomNav tab={tab} onNavigate={setTab} />
    </div>
  )
}

// ── Page entry ────────────────────────────────────────────────────────────────
export default function AdminPage() {
  const { session } = useAdminSession()

  if (!session) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-surface-primary p-4">
        <AdminLogin />
      </div>
    )
  }

  return <AdminDashboard />
}
