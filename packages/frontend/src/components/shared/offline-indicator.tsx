'use client'

import { useEffect } from 'react'
import { toast } from 'sonner'

export function OfflineIndicator() {
  useEffect(() => {
    let toastId: string | number | undefined

    function handleOffline() {
      toastId = toast.warning('Sin conexión a internet', {
        description: 'Las operaciones no están disponibles hasta recuperar la conexión.',
        duration: Infinity,
        id: 'offline',
      })
    }

    function handleOnline() {
      toast.dismiss(toastId)
      toast.success('Conexión restaurada', { duration: 3000, id: 'online' })
    }

    if (!navigator.onLine) handleOffline()

    window.addEventListener('offline', handleOffline)
    window.addEventListener('online', handleOnline)
    return () => {
      window.removeEventListener('offline', handleOffline)
      window.removeEventListener('online', handleOnline)
    }
  }, [])

  return null
}
