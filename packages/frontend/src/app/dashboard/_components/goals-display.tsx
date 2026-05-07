'use client'

import { CountUp } from '@/components/shared/count-up'
import { formatPesos } from '@/lib/utils/formatters'
import type { Goal } from '@kermess/shared'

interface GoalsDisplayProps {
  goals: Goal[]
  totalRaised: number
  eventName: string
}

const GOAL_COLORS = [
  {
    barGradient: 'linear-gradient(90deg, #A855F7, #C084FC)',
    pctColor: 'text-accent-primary',
    shadow: '0 4px 24px #A855F715',
  },
  {
    barGradient: 'linear-gradient(90deg, #F43F5E, #FB7185)',
    pctColor: 'text-accent-rose',
    shadow: '0 4px 24px #F43F5E15',
  },
  {
    barGradient: 'linear-gradient(90deg, #F59E0B, #FBBF24)',
    pctColor: 'text-accent-amber',
    shadow: '0 4px 24px #F59E0B15',
  },
]

export function GoalsDisplay({ goals, totalRaised, eventName }: GoalsDisplayProps) {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-10 bg-surface-primary px-5 py-12 md:px-16">
      {/* Header */}
      <div className="flex flex-col items-center gap-3 text-center">
        <div className="flex items-center gap-2 rounded-full bg-[#22C55E22] px-3.5 py-1.5">
          <span className="h-2 w-2 rounded-full bg-accent-green" />
          <span className="text-[13px] font-medium text-accent-green">Evento En Vivo</span>
        </div>
        <h1 className="text-5xl font-extrabold tracking-tight text-fg-primary md:text-6xl">
          {eventName}
        </h1>
        <p className="text-lg text-fg-muted">Recaudación en tiempo real</p>
      </div>

      {/* Goals row — 3 columnas en desktop, stack en mobile */}
      <div className="flex w-full max-w-6xl flex-col gap-6 md:flex-row">
        {goals.map((goal, i) => {
          const pct = goal.target > 0 ? Math.min((goal.raised / goal.target) * 100, 100) : 0
          const c = GOAL_COLORS[i] ?? GOAL_COLORS[0]

          return (
            <div
              key={goal.id}
              className="flex flex-1 flex-col items-center gap-4 rounded-2xl bg-surface-secondary p-8"
              style={{ boxShadow: c.shadow }}
            >
              <p className="text-[15px] font-medium text-fg-secondary">{goal.name}</p>
              <p className="font-mono text-5xl font-bold text-fg-primary">
                <CountUp value={goal.raised} formatFn={(n) => formatPesos(n)} />
              </p>
              <p className="text-[13px] text-fg-muted">Meta: {formatPesos(goal.target)}</p>
              {/* Progress track */}
              <div className="h-3 w-full overflow-hidden rounded-full bg-surface-elevated">
                <div
                  className="h-full rounded-full transition-all duration-1000 ease-out"
                  style={{ width: `${pct}%`, background: c.barGradient }}
                />
              </div>
              <p className={`font-mono text-2xl font-bold ${c.pctColor}`}>
                <CountUp value={Math.round(pct)} formatFn={(n) => `${n}%`} />
              </p>
            </div>
          )
        })}
      </div>

      {/* Total */}
      <div className="flex flex-col items-center gap-2 text-center">
        <p className="text-[13px] font-semibold uppercase tracking-[0.2em] text-fg-muted">
          Total Recaudado
        </p>
        <p
          className="font-mono text-6xl font-extrabold md:text-7xl"
          style={{
            background: 'linear-gradient(90deg, #A855F7, #F43F5E 50%, #F59E0B)',
            WebkitBackgroundClip: 'text',
            WebkitTextFillColor: 'transparent',
            backgroundClip: 'text',
          }}
        >
          <CountUp value={totalRaised} formatFn={(n) => formatPesos(n)} />
        </p>
        <p className="text-lg text-fg-secondary">¡Gracias por su generosidad!</p>
      </div>
    </div>
  )
}
