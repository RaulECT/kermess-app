import type { Timestamp } from './timestamp'

export type EventStatus = 'setup' | 'live' | 'closed'

export interface Goal {
  id: string
  name: string
  target: number
  raised: number
}

export interface EventConfig {
  name: string
  couponRate: number // cupones por peso
  goals: Goal[] // exactamente 3
  totalRaised: number // denormalizado
  status: EventStatus
  startedAt: Timestamp | null
  endedAt: Timestamp | null
}
