import { MonitorDashboard } from './_components/monitor-dashboard'

export default async function MonitorPage({
  searchParams,
}: {
  searchParams: Promise<{ key?: string }>
}) {
  const { key } = await searchParams
  const validKey = process.env.MONITOR_KEY

  if (!validKey || key !== validKey) return null

  return <MonitorDashboard />
}
