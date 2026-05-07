import { CashierSessionProvider } from '@/context/cashier-session'
import { Toaster } from '@/components/ui/sonner'

export default function CajaLayout({ children }: { children: React.ReactNode }) {
  return (
    <CashierSessionProvider>
      {children}
      <Toaster richColors position="top-right" />
    </CashierSessionProvider>
  )
}
