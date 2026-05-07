'use client'

import { QRCodeSVG } from 'qrcode.react'

interface QRDisplayProps {
  value: string
  size?: number
  label?: string
}

export function QRDisplay({ value, size = 256, label }: QRDisplayProps) {
  return (
    <div className="flex flex-col items-center gap-3">
      <div className="rounded-2xl border-2 border-gray-200 bg-white p-4 shadow-sm">
        <QRCodeSVG
          value={value}
          size={size}
          level="M"
          includeMargin={false}
        />
      </div>
      {label && <p className="text-sm text-gray-500">{label}</p>}
    </div>
  )
}
