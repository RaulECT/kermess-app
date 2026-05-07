import type { Metadata } from 'next'
import { AttendeeView } from './_components/attendee-view'

export const metadata: Metadata = {
  title: 'Mis cupones — Kermes App',
}

export default function AttendeeTokenPage({ params }: { params: Promise<{ token: string }> }) {
  return <AttendeeView paramsPromise={params} />
}
