import React, { useMemo, useEffect, useRef, useState } from 'react'
import { motion } from 'framer-motion'
import {
  Target, ChevronRight, Clock,
  CalendarDays, Bell, ArrowRight, Flame, TrendingUp,
  Zap, BookOpen, CheckSquare
} from 'lucide-react'
import type { Application, QueuedApp, HuntSession, Task } from '../../types'
import { STAGE_CONFIG, STAGE_ORDER } from '../../utils/stages'
import { daysAgo, daysUntil, formatDate, formatDateTime, isSameWeek, huntDaysElapsed, getTodayIso } from '../../utils/dates'

// ─── Count-up hook — video game style number animations ───────────────────────
function useCountUp(target: number, duration = 900, delay = 0): number {
  const [current, setCurrent] = useState(0)
  const started = useRef(false)

  useEffect(() => {
    if (started.current && current === target) return
    const timer = setTimeout(() => {
      started.current = true
      if (target === 0) { setCurrent(0); return }
      const startTime = performance.now()
      const startVal = 0
      function step(now: number) {
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        // Ease out cubic — shoots up fast, slows at the end
        const eased = 1 - Math.pow(1 - progress, 3)
        const val = Math.round(startVal + (target - startVal) * eased)
        setCurrent(val)
        if (progress < 1) requestAnimationFrame(step)
      }
      requestAnimationFrame(step)
    }, delay)
    return () => clearTimeout(timer)
  }, [target]) // eslint-disable-line
  return current
}

// ─── Animate-on-change count — for when values increase live ──────────────────
function AnimatedCount({ value, color, size = 32 }: { value: number; color: string; size?: number }) {
  const count = useCountUp(value, 700, 0)
  const prev = useRef(value)
  const [flash, setFlash] = useState(false)

  useEffect(() => {
    if (value > prev.current) {
      setFlash(true)
      setTimeout(() => setFlash(false), 600)
    }
    prev.current = value
  }, [value])

  return (
    <motion.span
      animate={flash ? { scale: [1, 1.15, 1] } : { scale: 1 }}
      transition={{ duration: 0.4 }}
      style={{
        fontFamily: 'var(--font-display)',
        fontSize: size,
        fontWeight: 700,
        color: flash ? 'var(--brand)' : color,
        letterSpacing: '-0.04em',
        lineHeight: 1,
        display: 'inline-block',
        transition: 'color 0.3s',
      }}
    >
      {count}
    </motion.span>
  )
}

// ─── Nudge messages ────────────────────────────────────────────────────────────
function getNudge(
  apps: Application[],
  queue: QueuedApp[],
  session: HuntSession | null,
  weeklyGoal: number
): string {
  const daysIn = session ? huntDaysElapsed(session.startedAt) : 0
  const weekApps = apps.filter(a => isSameWeek(a.appliedOn)).length
  const queueApps = queue.filter(q => isSameWeek(q.receivedOn)).length
  const totalThisWeek = weekApps + queueApps
  const remaining = Math.max(0, weeklyGoal - totalThisWeek)

  const overdueFollowups = apps.filter(a =>
    a.followUpOn && daysAgo(a.followUpOn) > 0 && a.stage !== 'Closed'
  )
  const upcomingInterviews = apps.filter(a =>
    a.interviewDate && daysUntil(a.interviewDate) <= 2 && daysUntil(a.interviewDate) >= 0
  )

  if (upcomingInterviews.length > 0) {
    const co = upcomingInterviews[0].company
    const days = daysUntil(upcomingInterviews[0].interviewDate)
    if (days === 0) return `Interview at ${co} is today. You've got this — go get it.`
    if (days === 1) return `Interview at ${co} is tomorrow. If you haven't prepped, now's the time.`
    return `Interview at ${co} in ${days} days. Prep something. Even 20 minutes makes a difference.`
  }

  if (overdueFollowups.length > 0) {
    const co = overdueFollowups[0].company
    return `${co} is overdue for a follow-up. A quick email keeps you top of mind.`
  }

  if (remaining > 0 && weeklyGoal > 0) {
    return `${totalThisWeek} of ${weeklyGoal} apps this week. ${remaining} to go — lock in and let's get it.`
  }

  if (weeklyGoal > 0 && totalThisWeek >= weeklyGoal) {
    return `Weekly goal hit. Seriously, well done. Now keep the momentum going.`
  }

  if (daysIn === 30) return `30 days in. Most people quit before this. The fact you're still here? That matters.`
  if (daysIn === 60) return `60 days. The job hunt is a marathon. You're running it. Keep going.`
  if (daysIn > 0) return `Day ${daysIn} of your hunt. Every application is a bet on yourself. Keep placing them.`

  return `Start a hunt to unlock your command center — goal tracking, daily focus, nudges, and more.`
}

// ─── Sub components ────────────────────────────────────────────────────────────
function Card({ children, style, onClick }: { children: React.ReactNode; style?: React.CSSProperties; onClick?: () => void }) {
  return (
    <motion.div
      whileHover={onClick ? { borderColor: 'rgba(255,255,255,0.12)' } : {}}
      onClick={onClick}
      style={{
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 12,
        padding: '20px',
        cursor: onClick ? 'pointer' : 'default',
        transition: 'border-color 0.15s',
        ...style
      }}
    >
      {children}
    </motion.div>
  )
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      fontSize: 11,
      fontWeight: 700,
      color: 'var(--muted)',
      letterSpacing: '0.1em',
      textTransform: 'uppercase',
      marginBottom: 12,
    }}>
      {children}
    </div>
  )
}

// ─── Props ─────────────────────────────────────────────────────────────────────
type DashboardProps = {
  applications: Application[]
  queue: QueuedApp[]
  huntSession: HuntSession | null
  tasks: Task[]
  onStartHunt: () => void
  onViewChange: (view: string, appId?: number) => void
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard({ applications, queue, huntSession, tasks, onStartHunt, onViewChange }: DashboardProps) {
  const today = getTodayIso()
  const weeklyGoal = huntSession?.weeklyGoal ?? 0
  const daysIn = huntSession ? huntDaysElapsed(huntSession.startedAt) : 0

  const weekAppsTracker = useMemo(() =>
    applications.filter(a => isSameWeek(a.appliedOn)).length,
    [applications]
  )
  const weekAppsQueue = useMemo(() =>
    queue.filter(q => isSameWeek(q.receivedOn)).length,
    [queue]
  )
  const totalThisWeek = weekAppsTracker + weekAppsQueue
  const totalAllTime = applications.length + queue.filter(q => q.status !== 'dismissed').length

  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of STAGE_ORDER) counts[stage] = 0
    for (const a of applications) counts[a.stage] = (counts[a.stage] ?? 0) + 1
    counts['Applied'] = (counts['Applied'] ?? 0) + queue.filter(q => q.status === 'pending').length
    return counts
  }, [applications, queue])

  const inPlayCount = useMemo(() =>
    applications.filter(a => ['Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer'].includes(a.stage)).length,
    [applications]
  )

  // Upcoming interviews (next 7 days)
  const upcomingInterviews = useMemo(() =>
    applications
      .filter(a => a.interviewDate && daysUntil(a.interviewDate) >= 0 && daysUntil(a.interviewDate) <= 7)
      .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
      .slice(0, 4),
    [applications]
  )

  // Today's calendar events
  const todayEvents = useMemo(() => {
    const events: { type: 'interview' | 'followup'; app: Application; color: string }[] = []
    for (const app of applications) {
      if (app.stage === 'Closed') continue
      if (app.interviewDate?.slice(0, 10) === today) {
        events.push({ type: 'interview', app, color: 'var(--brand)' })
      } else if (app.followUpOn === today) {
        events.push({ type: 'followup', app, color: 'var(--gold)' })
      }
    }
    return events
  }, [applications, today])

  // Follow-ups due soon (today or overdue)
  const urgentFollowups = useMemo(() =>
    applications.filter(a =>
      a.followUpOn && a.followUpOn <= today && a.stage !== 'Closed' && a.stage !== 'Offer'
    ).slice(0, 2),
    [applications, today]
  )

  // Today's focus items
  const focusItems = useMemo(() => {
    const items: { icon: React.ElementType; color: string; text: string; action: () => void }[] = []

    // Overdue tasks first
    const overdueTasks = tasks
      .filter(t => !t.done && t.dueDate && t.dueDate < today)
      .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
      .slice(0, 2)
    for (const task of overdueTasks) {
      items.push({
        icon: CheckSquare,
        color: 'var(--danger)',
        text: `${task.title} — overdue`,
        action: () => onViewChange('tasks'),
      })
    }

    // Today's tasks
    const todayTasks = tasks.filter(t => !t.done && t.dueDate === today).slice(0, 2)
    for (const task of todayTasks) {
      items.push({
        icon: CheckSquare,
        color: 'var(--gold)',
        text: `${task.title} — due today`,
        action: () => onViewChange('tasks'),
      })
    }

    // Upcoming interviews
    const soonInterviews = applications.filter(a =>
      a.interviewDate && daysUntil(a.interviewDate) <= 1 && daysUntil(a.interviewDate) >= 0
    )
    for (const app of soonInterviews.slice(0, 2)) {
      const days = daysUntil(app.interviewDate)
      items.push({
        icon: CalendarDays,
        color: days === 0 ? 'var(--danger)' : 'var(--warning)',
        text: days === 0
          ? `Interview at ${app.company} — TODAY`
          : `Interview at ${app.company} tomorrow — prep: ${app.prepStatus}`,
        action: () => onViewChange('prep-room', app.id),
      })
    }

    for (const app of urgentFollowups) {
      items.push({
        icon: Clock,
        color: 'var(--warning)',
        text: `Follow up with ${app.company} — ${daysAgo(app.followUpOn)}d overdue`,
        action: () => onViewChange('tracker', app.id),
      })
    }

    const newQueue = queue.filter(q => q.status === 'pending').length
    if (newQueue > 0) {
      items.push({
        icon: Bell,
        color: 'var(--blue)',
        text: `${newQueue} new application${newQueue > 1 ? 's' : ''} in your inbox`,
        action: () => onViewChange('applied'),
      })
    }

    return items.slice(0, 5)
  }, [applications, queue, tasks, today, urgentFollowups, onViewChange])

  const responseRate = useMemo(() => {
    const totalApplied = applications.length + queue.length
    const gotResponse = applications.filter(a =>
      ['Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer'].includes(a.stage)
    ).length
    if (totalApplied === 0) return null
    return Math.round((gotResponse / totalApplied) * 100)
  }, [applications, queue])

  const nudge = getNudge(applications, queue, huntSession, weeklyGoal)
  const goalPct = weeklyGoal > 0 ? Math.min(100, Math.round((totalThisWeek / weeklyGoal) * 100)) : 0
  const goalHit = weeklyGoal > 0 && totalThisWeek >= weeklyGoal

  return (
    <div style={{ padding: '28px 32px', maxWidth: 1100, margin: '0 auto' }}>

      {/* ── Hunt Header ── */}
      {huntSession ? (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'linear-gradient(135deg, rgba(126,232,162,0.08) 0%, rgba(251,191,36,0.04) 100%)',
            border: '1px solid rgba(126,232,162,0.15)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 20,
            display: 'flex', alignItems: 'center', gap: 24,
            position: 'relative', overflow: 'hidden',
          }}
        >
          <div style={{ position: 'absolute', top: -40, left: -20, width: 200, height: 120, background: 'radial-gradient(ellipse, rgba(126,232,162,0.12) 0%, transparent 70%)', pointerEvents: 'none' }} />
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Flame size={14} color="var(--brand)" />
              <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {huntSession.mode === 'active' ? 'Active Hunt' : 'Casual Search'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>· Started {formatDate(huntSession.startedAt)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 6 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.04em' }}>
                  Day {daysIn}
                </span>
              </div>
              {huntSession.targetRole && (
                <span style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                  Targeting: <strong style={{ color: 'var(--text)' }}>{huntSession.targetRole}</strong>
                </span>
              )}
              {huntSession.targetSalary && (
                <span style={{ fontSize: 14, color: 'var(--text-soft)' }}>
                  Goal: <strong style={{ color: 'var(--text)' }}>{huntSession.targetSalary}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Weekly goal progress */}
          {weeklyGoal > 0 && (
            <div style={{ minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: goalHit ? 'var(--brand)' : 'var(--muted)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {goalHit ? '✓ Weekly Goal Hit' : 'Weekly Goal'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                <AnimatedCount value={totalThisWeek} color={goalHit ? 'var(--brand)' : 'var(--gold)'} size={28} />
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ {weeklyGoal}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  style={{ height: '100%', background: goalHit ? 'var(--brand)' : 'var(--gold)', borderRadius: 99 }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface)',
            border: '1px dashed rgba(126,232,162,0.25)',
            borderRadius: 14, padding: '28px',
            marginBottom: 20, textAlign: 'center',
          }}
        >
          <Target size={32} color="var(--brand)" style={{ marginBottom: 12 }} />
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700, color: 'var(--text)', marginBottom: 8 }}>
            Ready to find your next role?
          </div>
          <div style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 20, maxWidth: 420, margin: '0 auto 20px' }}>
            Start a hunt to unlock your command center — goal tracking, daily focus, nudges, and everything you need to land the job.
          </div>
          <button
            onClick={onStartHunt}
            style={{
              background: 'var(--brand)', color: '#08090D', border: 'none',
              borderRadius: 8, padding: '11px 24px', fontSize: 14,
              fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
              display: 'inline-flex', alignItems: 'center', gap: 8,
            }}
          >
            <Target size={14} /> Start a New Hunt
          </button>
        </motion.div>
      )}

      {/* ── Hero stat row ── */}
      <motion.div
        initial={{ opacity: 0, y: 8 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 12, marginBottom: 16 }}
      >
        {[
          { label: 'Total Applied', value: totalAllTime, color: 'var(--blue)', target: 'applied' },
          { label: 'In Play',       value: inPlayCount,  color: 'var(--brand)', target: 'tracker' },
          { label: 'Response Rate', value: responseRate ?? 0, color: responseRate != null && responseRate >= 8 ? 'var(--brand)' : responseRate != null && responseRate >= 5 ? 'var(--gold)' : 'var(--danger)', suffix: '%', target: 'stats' },
          { label: 'Interviews',    value: upcomingInterviews.length, color: 'var(--gold)', target: 'interviews' },
        ].map((stat, i) => (
          <motion.div
            key={stat.label}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 + i * 0.06 }}
            whileHover={{ borderColor: `${stat.color}40`, background: 'rgba(255,255,255,0.02)' }}
            onClick={() => onViewChange(stat.target)}
            style={{
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 12, padding: '16px 18px',
              cursor: 'pointer', transition: 'all 0.15s',
            }}
          >
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {stat.label}
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 2 }}>
              <AnimatedCount value={stat.value} color={stat.color} size={30} />
              {stat.suffix && <span style={{ fontSize: 18, fontWeight: 700, color: stat.color, fontFamily: 'var(--font-display)' }}>{stat.suffix}</span>}
            </div>
          </motion.div>
        ))}
      </motion.div>

      {/* ── Today's Calendar Snapshot ── */}
      {(todayEvents.length > 0 || urgentFollowups.length > 0) && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          style={{
            background: 'linear-gradient(135deg, rgba(96,165,250,0.06) 0%, rgba(126,232,162,0.04) 100%)',
            border: '1px solid rgba(96,165,250,0.15)',
            borderRadius: 12, padding: '14px 18px', marginBottom: 16,
            display: 'flex', alignItems: 'center', gap: 14, flexWrap: 'wrap',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexShrink: 0 }}>
            <CalendarDays size={13} color="var(--blue)" />
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--blue)', textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              Today
            </span>
          </div>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {todayEvents.map((ev, i) => (
              <button
                key={i}
                onClick={() => ev.type === 'interview' ? onViewChange('prep-room', ev.app.id) : onViewChange('tracker', ev.app.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                  background: ev.type === 'interview' ? 'var(--brand-dim)' : 'var(--gold-dim)',
                  border: `1px solid ${ev.type === 'interview' ? 'rgba(126,232,162,0.25)' : 'rgba(251,191,36,0.25)'}`,
                  color: ev.color, fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600,
                }}
              >
                {ev.type === 'interview' ? <CalendarDays size={11} /> : <Clock size={11} />}
                {ev.app.company}
                {ev.type === 'interview' && ev.app.interviewDate && ` · ${ev.app.interviewDate.slice(11, 16)}`}
              </button>
            ))}
            {urgentFollowups.filter(a => a.followUpOn !== today).map((app, i) => (
              <button
                key={`fu-${i}`}
                onClick={() => onViewChange('tracker', app.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 6,
                  padding: '5px 12px', borderRadius: 99, cursor: 'pointer',
                  background: 'var(--warning-dim)', border: '1px solid rgba(251,146,60,0.25)',
                  color: 'var(--warning)', fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600,
                }}
              >
                <Clock size={11} />
                {app.company} — overdue follow-up
              </button>
            ))}
          </div>
          <button
            onClick={() => onViewChange('calendar')}
            style={{
              marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 4,
              background: 'none', border: 'none', cursor: 'pointer',
              fontSize: 12, color: 'var(--blue)', fontFamily: 'var(--font-body)',
            }}
          >
            Full calendar <ChevronRight size={11} />
          </button>
        </motion.div>
      )}

      {/* ── Main grid ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 16 }}>

        {/* Today's Focus — 2/3 width */}
        <Card style={{ gridColumn: 'span 2' }}>
          <SectionLabel>Today's Focus</SectionLabel>
          {focusItems.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14, padding: '8px 0' }}>
              Nothing urgent today. Keep the pipeline moving.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {focusItems.map((item, i) => {
                const Icon = item.icon
                return (
                  <motion.button
                    key={i}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.08 }}
                    onClick={item.action}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '12px 14px',
                      background: 'var(--surface-2)', border: '1px solid var(--border)',
                      borderRadius: 8, color: 'var(--text)', fontSize: 13.5,
                      fontFamily: 'var(--font-body)', cursor: 'pointer',
                      textAlign: 'left', transition: 'all 0.15s ease', width: '100%',
                    }}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.13)', x: 2 }}
                  >
                    <Icon size={14} color={item.color} style={{ flexShrink: 0 }} />
                    <span style={{ flex: 1 }}>{item.text}</span>
                    <ArrowRight size={13} color="var(--muted)" />
                  </motion.button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Nudge Card — 1/3 */}
        <Card style={{ background: 'linear-gradient(135deg, var(--surface) 0%, rgba(126,232,162,0.04) 100%)' }}>
          <SectionLabel>Your Buddy Says</SectionLabel>
          <div style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.7, fontStyle: 'italic' }}>
            "{nudge}"
          </div>
          {huntSession && (
            <div style={{ marginTop: 14, paddingTop: 14, borderTop: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <TrendingUp size={12} color="var(--muted)" />
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>Day {daysIn} · {totalAllTime} apps sent</span>
            </div>
          )}
        </Card>

        {/* Pipeline at a Glance — full width */}
        <Card style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel>Pipeline at a Glance</SectionLabel>
            <button
              onClick={() => onViewChange('tracker')}
              style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
            >
              View Active <ChevronRight size={12} />
            </button>
          </div>
          <div style={{ display: 'flex', gap: 0, alignItems: 'stretch' }}>
            {STAGE_ORDER.filter(s => s !== 'Closed').map((stage, i, arr) => {
              const cfg = STAGE_CONFIG[stage]
              const count = stageCounts[stage] ?? 0
              const isLast = i === arr.length - 1
              return (
                <React.Fragment key={stage}>
                  <motion.button
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.06 }}
                    onClick={() => onViewChange(stage === 'Applied' ? 'applied' : 'tracker')}
                    style={{
                      flex: 1, padding: '16px 12px',
                      background: count > 0 ? cfg.bg : 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 8, cursor: 'pointer',
                      textAlign: 'center', transition: 'all 0.15s ease',
                    }}
                    whileHover={{ background: cfg.bg, borderColor: `${cfg.color}40`, y: -2 }}
                  >
                    <div style={{ lineHeight: 1, marginBottom: 6 }}>
                      <AnimatedCount value={count} color={count > 0 ? cfg.color : 'var(--muted)'} size={26} />
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>{cfg.label}</div>
                  </motion.button>
                  {!isLast && (
                    <div style={{ display: 'flex', alignItems: 'center', padding: '0 4px', color: 'var(--muted)', fontSize: 14 }}>›</div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </Card>

        {/* Upcoming Interviews — 2/3 */}
        <Card style={{ gridColumn: 'span 2' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
            <SectionLabel>Upcoming Interviews</SectionLabel>
            <button
              onClick={() => onViewChange('interviews')}
              style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4, fontFamily: 'var(--font-body)' }}
            >
              Schedule <ChevronRight size={12} />
            </button>
          </div>
          {upcomingInterviews.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>No interviews in the next 7 days.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingInterviews.map(app => {
                const days = daysUntil(app.interviewDate)
                const urgency = days === 0 ? 'var(--danger)' : days === 1 ? 'var(--warning)' : 'var(--brand)'
                const prepColor = app.prepStatus === 'Ready' ? 'var(--brand)' : app.prepStatus === 'Light prep' ? 'var(--gold)' : 'var(--muted)'
                return (
                  <div key={app.id} style={{ display: 'flex', gap: 8 }}>
                    {/* Main button */}
                    <button
                      onClick={() => onViewChange('tracker', app.id)}
                      style={{
                        flex: 1, display: 'flex', alignItems: 'center', gap: 12,
                        padding: '10px 12px', background: 'var(--surface-2)',
                        border: '1px solid var(--border)', borderRadius: 8,
                        cursor: 'pointer', textAlign: 'left', transition: 'border-color 0.15s',
                        fontFamily: 'var(--font-body)',
                      }}
                      onMouseEnter={e => (e.currentTarget.style.borderColor = 'rgba(255,255,255,0.13)')}
                      onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border)')}
                    >
                      <CalendarDays size={14} color={urgency} style={{ flexShrink: 0 }} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                          {app.company}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>
                          {app.role} · <span style={{ color: prepColor }}>{app.prepStatus}</span>
                        </div>
                      </div>
                      <div style={{ textAlign: 'right', flexShrink: 0 }}>
                        <div style={{ fontSize: 12, color: urgency, fontWeight: 600 }}>
                          {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                        </div>
                        <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDateTime(app.interviewDate)}</div>
                      </div>
                    </button>
                    {/* Prep Room shortcut */}
                    <button
                      onClick={() => onViewChange('prep-room', app.id)}
                      title="Open Prep Room"
                      style={{
                        padding: '0 12px', borderRadius: 8,
                        border: '1px solid var(--border)', background: 'var(--surface-2)',
                        cursor: 'pointer', display: 'flex', alignItems: 'center',
                        color: 'var(--muted)', transition: 'all 0.15s',
                      }}
                      onMouseEnter={e => { (e.currentTarget as HTMLElement).style.borderColor = 'rgba(126,232,162,0.3)'; (e.currentTarget as HTMLElement).style.color = 'var(--brand)' }}
                      onMouseLeave={e => { (e.currentTarget as HTMLElement).style.borderColor = 'var(--border)'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
                    >
                      <BookOpen size={14} />
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </Card>

        {/* Response Rate — 1/3 */}
        <Card onClick={() => onViewChange('stats')}>
          <SectionLabel>Response Rate</SectionLabel>
          {responseRate === null ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Apply to jobs to see your rate.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, marginBottom: 12 }}>
                <AnimatedCount
                  value={responseRate}
                  color={responseRate >= 8 ? 'var(--brand)' : responseRate >= 5 ? 'var(--gold)' : 'var(--danger)'}
                  size={36}
                />
                <span style={{ fontSize: 22, fontWeight: 700, color: responseRate >= 8 ? 'var(--brand)' : responseRate >= 5 ? 'var(--gold)' : 'var(--danger)', fontFamily: 'var(--font-display)' }}>%</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, responseRate)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.5 }}
                  style={{
                    height: '100%',
                    background: responseRate >= 8 ? 'var(--brand)' : responseRate >= 5 ? 'var(--gold)' : 'var(--danger)',
                    borderRadius: 99,
                  }}
                />
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                National avg: ~5–8%.{' '}
                <span style={{ color: responseRate >= 5 ? 'var(--brand)' : 'var(--warning)' }}>
                  {responseRate >= 8 ? 'Above average. ✓' :
                   responseRate >= 5 ? 'On track.' :
                   'Consider refreshing your resume.'}
                </span>
              </div>
              <div style={{ marginTop: 12, fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                <Zap size={11} /> Tap to see full stats
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  )
}
