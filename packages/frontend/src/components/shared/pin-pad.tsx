'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'

interface PinPadProps {
  onSubmit: (pin: string) => void
  loading?: boolean
  error?: string
  label?: string
}

const KEYS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '', '0', '⌫']

export function PinPad({ onSubmit, loading = false, error, label = 'Ingresa tu PIN' }: PinPadProps) {
  const [pin, setPin] = useState('')
  const MAX_PIN = 6

  function handleKey(key: string) {
    if (key === '⌫') {
      setPin((p) => p.slice(0, -1))
    } else if (pin.length < MAX_PIN) {
      const next = pin + key
      setPin(next)
    }
  }

  function handleSubmit() {
    if (pin.length >= 4) {
      onSubmit(pin)
      setPin('')
    }
  }

  return (
    <div className="flex flex-col items-center gap-4 p-6">
      <p className="text-lg font-semibold text-gray-700">{label}</p>

      {/* Dots */}
      <div className="flex gap-3">
        {Array.from({ length: MAX_PIN }).map((_, i) => (
          <div
            key={i}
            className={`h-4 w-4 rounded-full border-2 transition-colors ${
              i < pin.length ? 'border-gray-900 bg-gray-900' : 'border-gray-300'
            }`}
          />
        ))}
      </div>

      {error && <p className="text-sm text-red-600">{error}</p>}

      {/* Keypad */}
      <div className="grid grid-cols-3 gap-3">
        {KEYS.map((key, i) => (
          <Button
            key={i}
            variant="outline"
            className="h-16 w-16 text-xl font-semibold"
            disabled={!key || loading}
            onClick={() => handleKey(key)}
            type="button"
          >
            {key}
          </Button>
        ))}
      </div>

      <Button
        className="w-48"
        disabled={pin.length < 4 || loading}
        onClick={handleSubmit}
        type="button"
      >
        {loading ? 'Verificando...' : 'Entrar'}
      </Button>
    </div>
  )
}
