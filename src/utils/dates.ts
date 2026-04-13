export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateShort(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso + 'T00:00:00')
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return (
    d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' +
    d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
  )
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime()
  const b = new Date(dateB).getTime()
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24))
}

export function daysAgo(iso: string): number {
  return daysBetween(iso, getTodayIso())
}

export function daysUntil(iso: string): number {
  const today = new Date(getTodayIso()).getTime()
  const target = new Date(iso.includes('T') ? iso : iso + 'T00:00:00').getTime()
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export function getWeekStartIso(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  const mon = new Date(d)
  mon.setDate(diff)
  return mon.toISOString().slice(0, 10)
}

export function isSameWeek(iso: string): boolean {
  const weekStart = getWeekStartIso()
  const weekEnd = new Date(weekStart)
  weekEnd.setDate(weekEnd.getDate() + 6)
  const d = new Date(iso + 'T00:00:00')
  return d >= new Date(weekStart) && d <= weekEnd
}

export function huntDaysElapsed(startedAt: string): number {
  return daysBetween(startedAt, getTodayIso()) + 1
}
