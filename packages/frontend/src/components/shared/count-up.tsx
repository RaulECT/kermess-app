'use client'

import { useEffect, useRef, useState } from 'react'

interface CountUpProps {
  value: number
  duration?: number // ms
  formatFn?: (n: number) => string
  className?: string
}

export function CountUp({
  value,
  duration = 800,
  formatFn = (n) => n.toLocaleString('es-MX'),
  className,
}: CountUpProps) {
  const [display, setDisplay] = useState(value)
  const prevRef = useRef(value)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const start = prevRef.current
    const end = value
    const diff = end - start
    if (diff === 0) return

    const startTime = performance.now()

    function step(now: number) {
      const elapsed = now - startTime
      const progress = Math.min(elapsed / duration, 1)
      // easeOutCubic
      const eased = 1 - Math.pow(1 - progress, 3)
      setDisplay(Math.round(start + diff * eased))
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(step)
      } else {
        prevRef.current = end
      }
    }

    rafRef.current = requestAnimationFrame(step)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  return <span className={className}>{formatFn(display)}</span>
}
