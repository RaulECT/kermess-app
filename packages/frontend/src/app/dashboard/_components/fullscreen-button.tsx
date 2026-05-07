'use client'

import { useEffect, useState } from 'react'

export function FullscreenButton() {
  const [isFullscreen, setIsFullscreen] = useState(false)

  useEffect(() => {
    function onChange() {
      setIsFullscreen(!!document.fullscreenElement)
    }
    document.addEventListener('fullscreenchange', onChange)
    return () => document.removeEventListener('fullscreenchange', onChange)
  }, [])

  function toggle() {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen().catch(() => {})
    } else {
      document.exitFullscreen().catch(() => {})
    }
  }

  return (
    <button
      onClick={toggle}
      className="fixed right-5 top-5 flex items-center gap-2 rounded-xl border border-border-default bg-surface-secondary px-4 py-2.5 text-[13px] font-medium text-fg-secondary transition-colors hover:border-fg-muted hover:text-fg-primary"
      title={isFullscreen ? 'Salir de pantalla completa' : 'Pantalla completa'}
    >
      <span className="text-base">{isFullscreen ? '⛶' : '⛶'}</span>
      {isFullscreen ? 'Salir' : 'Pantalla Completa'}
    </button>
  )
}
