import { useState, useMemo } from 'react'
import { motion } from 'framer-motion'
import { ChevronLeft, ChevronRight, CalendarDays, Zap } from 'lucide-react'
import type { Application } from '../../types'
import { getTodayIso } from '../../utils/dates'

// ─── Calendar Event ────────────────────────────────────────────────────────────
type CalEvent = {
  date: string       // YYYY-MM-DD
  type: 'interview' | 'followup' | 'deadline'
  label: string
  appId: number
  color: string
  bg: string
}

function buildEvents(applications: Application[]): CalEvent[] {
  const events: CalEvent[] = []

  for (const app of applications) {
    if (app.stage === 'Closed') continue

    // Interview date
    if (app.interviewDate) {
      const dateStr = app.interviewDate.slice(0, 10)
      events.push({
        date: dateStr,
        type: 'interview',
        label: `${app.company} — Interview`,
        appId: app.id,
        color: 'var(--brand)',
        bg: 'var(--brand-dim)',
      })
    }

    // Follow-up due
    if (app.followUpOn && app.stage !== 'Offer') {
      events.push({
        date: app.followUpOn,
        type: 'followup',
        label: `${app.company} — Follow up`,
        appId: app.id,
        color: 'var(--gold)',
        bg: 'var(--gold-dim)',
      })
    }
  }

  return events
}

// ─── Month grid helpers ────────────────────────────────────────────────────────
function getDaysInMonth(year: number, month: number) {
  return new Date(year, month + 1, 0).getDate()
}

function getFirstDayOfWeek(year: number, month: number) {
  return new Date(year, month, 1).getDay() // 0 = Sun
}

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December']
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

// ─── Calendar View ─────────────────────────────────────────────────────────────
export function CalendarView({
  applications,
  onSelectApp,
}: {
  applications: Application[]
  onSelectApp: (id: number) => void
}) {
  const today = getTodayIso()
  const [year, setYear] = useState(() => new Date().getFullYear())
  const [month, setMonth] = useState(() => new Date().getMonth())

  const events = useMemo(() => buildEvents(applications), [applications])

  const daysInMonth = getDaysInMonth(year, month)
  const firstDay = getFirstDayOfWeek(year, month)

  // Build a map: date string → events
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalEvent[]> = {}
    for (const e of events) {
      if (!map[e.date]) map[e.date] = []
      map[e.date].push(e)
    }
    return map
  }, [events])

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1) }
    else setMonth(m => m - 1)
  }

  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1) }
    else setMonth(m => m + 1)
  }

  function goToday() {
    setYear(new Date().getFullYear())
    setMonth(new Date().getMonth())
  }

  // This month's event summary
  const monthPrefix = `${year}-${String(month + 1).padStart(2, '0')}`
  const thisMonthInterviews = events.filter(e => e.date.startsWith(monthPrefix) && e.type === 'interview').length
  const thisMonthFollowUps = events.filter(e => e.date.startsWith(monthPrefix) && e.type === 'followup').length

  // Build grid cells (blanks + days)
  const cells: (number | null)[] = []
  for (let i = 0; i < firstDay; i++) cells.push(null)
  for (let d = 1; d <= daysInMonth; d++) cells.push(d)
  // Pad to complete last week
  while (cells.length % 7 !== 0) cells.push(null)

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1000 }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Calendar
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {thisMonthInterviews > 0 && `${thisMonthInterviews} interview${thisMonthInterviews !== 1 ? 's' : ''}`}
            {thisMonthInterviews > 0 && thisMonthFollowUps > 0 && ' · '}
            {thisMonthFollowUps > 0 && `${thisMonthFollowUps} follow-up${thisMonthFollowUps !== 1 ? 's' : ''} due`}
            {thisMonthInterviews === 0 && thisMonthFollowUps === 0 && 'No events this month'}
          </div>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Integration coming soon badge */}
          <div style={{
            padding: '5px 12px', borderRadius: 99, fontSize: 11, fontWeight: 600,
            background: 'var(--purple-dim)', border: '1px solid rgba(167,139,250,0.2)',
            color: 'var(--purple)', display: 'flex', alignItems: 'center', gap: 5,
          }}>
            <Zap size={10} />
            Google Calendar integration coming soon
          </div>

          <button onClick={goToday} style={{
            padding: '7px 14px', borderRadius: 8,
            border: '1px solid var(--border)', background: 'var(--surface)',
            color: 'var(--text-soft)', fontSize: 12, fontFamily: 'var(--font-body)',
            cursor: 'pointer', fontWeight: 500,
          }}>
            Today
          </button>

          <div style={{ display: 'flex', gap: 4 }}>
            <button onClick={prevMonth} style={{
              padding: '7px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-soft)', cursor: 'pointer', display: 'flex',
            }}>
              <ChevronLeft size={14} />
            </button>
            <button onClick={nextMonth} style={{
              padding: '7px 10px', borderRadius: 8,
              border: '1px solid var(--border)', background: 'var(--surface)',
              color: 'var(--text-soft)', cursor: 'pointer', display: 'flex',
            }}>
              <ChevronRight size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* Month + year */}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em', marginBottom: 20 }}>
        {MONTH_NAMES[month]} {year}
      </div>

      {/* Calendar grid */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, overflow: 'hidden' }}>
        {/* Day headers */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: '1px solid var(--border)' }}>
          {DAY_NAMES.map(d => (
            <div key={d} style={{
              padding: '10px 0', textAlign: 'center',
              fontSize: 11, fontWeight: 700, color: 'var(--muted)',
              textTransform: 'uppercase', letterSpacing: '0.08em',
              borderRight: '1px solid var(--border)',
            }}>
              {d}
            </div>
          ))}
        </div>

        {/* Day cells — grouped into weeks */}
        {Array.from({ length: cells.length / 7 }, (_, weekIdx) => (
          <div key={weekIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', borderBottom: weekIdx < cells.length / 7 - 1 ? '1px solid var(--border)' : 'none' }}>
            {cells.slice(weekIdx * 7, weekIdx * 7 + 7).map((day, idx) => {
              const dateStr = day ? `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}` : null
              const isToday = dateStr === today
              const dayEvents = dateStr ? (eventsByDate[dateStr] ?? []) : []

              return (
                <div
                  key={idx}
                  style={{
                    minHeight: 90, padding: '8px',
                    borderRight: idx < 6 ? '1px solid var(--border)' : 'none',
                    background: isToday ? 'rgba(126,232,162,0.04)' : 'transparent',
                    transition: 'background 0.1s',
                  }}
                >
                  {day && (
                    <>
                      {/* Day number */}
                      <div style={{
                        width: 26, height: 26, borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        marginBottom: 4,
                        background: isToday ? 'var(--brand)' : 'transparent',
                        fontSize: 13, fontWeight: isToday ? 700 : 400,
                        color: isToday ? '#08090D' : 'var(--text-soft)',
                      }}>
                        {day}
                      </div>

                      {/* Events */}
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                        {dayEvents.slice(0, 3).map((ev, evIdx) => (
                          <motion.div
                            key={evIdx}
                            whileHover={{ scale: 1.02 }}
                            onClick={() => onSelectApp(ev.appId)}
                            style={{
                              padding: '2px 6px', borderRadius: 4, cursor: 'pointer',
                              background: ev.bg, border: `1px solid ${ev.color}30`,
                              fontSize: 10, fontWeight: 600, color: ev.color,
                              overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap',
                            }}
                          >
                            {ev.type === 'interview' ? '📅' : '📌'} {ev.label.split('—')[0].trim()}
                          </motion.div>
                        ))}
                        {dayEvents.length > 3 && (
                          <div style={{ fontSize: 10, color: 'var(--muted)', padding: '0 6px' }}>
                            +{dayEvents.length - 3} more
                          </div>
                        )}
                      </div>
                    </>
                  )}
                </div>
              )
            })}
          </div>
        ))}
      </div>

      {/* Legend */}
      <div style={{ display: 'flex', gap: 16, marginTop: 16, fontSize: 12, color: 'var(--muted)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--brand)' }} />
          Interview
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <div style={{ width: 10, height: 10, borderRadius: 3, background: 'var(--gold)' }} />
          Follow-up due
        </div>
        <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
          <CalendarDays size={12} />
          Events pull from your interview dates and follow-up dates
        </div>
      </div>
    </div>
  )
}
