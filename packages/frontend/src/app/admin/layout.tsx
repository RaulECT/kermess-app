import { AdminSessionProvider } from '@/context/admin-session'
import { Toaster } from '@/components/ui/sonner'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <AdminSessionProvider>
      {children}
      <Toaster richColors position="top-right" />
    </AdminSessionProvider>
  )
}
