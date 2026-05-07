'use client'

import { useEffect, useRef } from 'react'
import { Html5Qrcode } from 'html5-qrcode'

interface QRScannerProps {
  onScan: (result: string) => void
  onError?: (error: string) => void
}

export function QRScanner({ onScan, onError }: QRScannerProps) {
  const onScanRef = useRef(onScan)
  const onErrorRef = useRef(onError)
  const elementId = 'qr-scanner-container'

  onScanRef.current = onScan
  onErrorRef.current = onError

  useEffect(() => {
    let destroyed = false
    let scanner: Html5Qrcode | null = null

    async function start() {
      scanner = new Html5Qrcode(elementId)
      const config = { fps: 10, qrbox: { width: 250, height: 250 } }
      const cb = (text: string) => onScanRef.current(text)

      try {
        await scanner.start({ facingMode: 'environment' }, config, cb, undefined)
      } catch {
        try {
          await scanner.start({ facingMode: 'user' }, config, cb, undefined)
        } catch (err) {
          if (!destroyed) {
            const msg = err instanceof Error ? err.message : 'Error al iniciar cámara'
            onErrorRef.current?.(msg)
          }
          return
        }
      }

      // Si el efecto fue destruido mientras arrancábamos, parar de inmediato
      if (destroyed) {
        await scanner.stop().catch(() => {})
        scanner.clear()
      }
    }

    start()

    return () => {
      destroyed = true
      if (scanner?.isScanning) {
        scanner.stop().then(() => scanner!.clear()).catch(() => {})
      }
    }
  }, [])

  return (
    <div className="overflow-hidden rounded-xl">
      <div id={elementId} className="w-full" />
    </div>
  )
}
