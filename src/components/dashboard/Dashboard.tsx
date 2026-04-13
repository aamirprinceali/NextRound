import React, { useMemo } from 'react'
import { motion } from 'framer-motion'
import {
  Target, ChevronRight, Clock,
  CalendarDays, Bell, ArrowRight, Flame
} from 'lucide-react'
import type { Application, QueuedApp, HuntSession } from '../../types'
import { STAGE_CONFIG, STAGE_ORDER } from '../../utils/stages'
import { daysAgo, daysUntil, formatDate, formatDateTime, isSameWeek, huntDaysElapsed, getTodayIso } from '../../utils/dates'

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

  return `Start a hunt to unlock your personalized nudges and goal tracking.`
}

// ─── Sub components ────────────────────────────────────────────────────────────
function Card({ children, style }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <div style={{
      background: 'var(--surface)',
      border: '1px solid var(--border)',
      borderRadius: 12,
      padding: '20px',
      ...style
    }}>
      {children}
    </div>
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
  onStartHunt: () => void
  onViewChange: (view: string, appId?: number) => void
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export function Dashboard({ applications, queue, huntSession, onStartHunt, onViewChange }: DashboardProps) {
  const today = getTodayIso()
  const weeklyGoal = huntSession?.weeklyGoal ?? 0
  const daysIn = huntSession ? huntDaysElapsed(huntSession.startedAt) : 0

  // Apps applied this week (from tracker + queue combined)
  const weekAppsTracker = useMemo(() =>
    applications.filter(a => isSameWeek(a.appliedOn)).length,
    [applications]
  )
  const weekAppsQueue = useMemo(() =>
    queue.filter(q => isSameWeek(q.receivedOn)).length,
    [queue]
  )
  const totalThisWeek = weekAppsTracker + weekAppsQueue

  // Stage counts
  const stageCounts = useMemo(() => {
    const counts: Record<string, number> = {}
    for (const stage of STAGE_ORDER) counts[stage] = 0
    for (const a of applications) counts[a.stage] = (counts[a.stage] ?? 0) + 1
    // Also count queue items as "Applied"
    counts['Applied'] = (counts['Applied'] ?? 0) + queue.filter(q => q.status === 'pending').length
    return counts
  }, [applications, queue])

  // Upcoming interviews (next 7 days)
  const upcomingInterviews = useMemo(() =>
    applications
      .filter(a => a.interviewDate && daysUntil(a.interviewDate) >= 0 && daysUntil(a.interviewDate) <= 7)
      .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
      .slice(0, 5),
    [applications]
  )

  // Today's focus items
  const focusItems = useMemo(() => {
    const items: { icon: React.ElementType; color: string; text: string; action: () => void }[] = []

    // Interview today or tomorrow
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
        action: () => onViewChange('tracker', app.id),
      })
    }

    // Overdue follow-ups
    const overdue = applications.filter(a =>
      a.followUpOn && a.followUpOn < today && a.stage !== 'Closed' && a.stage !== 'Offer'
    ).slice(0, 2)
    for (const app of overdue) {
      items.push({
        icon: Clock,
        color: 'var(--warning)',
        text: `Follow up with ${app.company} — ${daysAgo(app.followUpOn)}d overdue`,
        action: () => onViewChange('tracker', app.id),
      })
    }

    // New queue items
    const newQueue = queue.filter(q => q.status === 'pending').length
    if (newQueue > 0) {
      items.push({
        icon: Bell,
        color: 'var(--blue)',
        text: `${newQueue} new application${newQueue > 1 ? 's' : ''} in your Applied queue`,
        action: () => onViewChange('applied'),
      })
    }

    return items.slice(0, 4)
  }, [applications, queue, today, onViewChange])

  // Response rate (applied → next steps only, not acknowledgments)
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
            background: 'linear-gradient(135deg, rgba(126,232,162,0.08) 0%, rgba(251,191,36,0.05) 100%)',
            border: '1px solid rgba(126,232,162,0.15)',
            borderRadius: 14,
            padding: '20px 24px',
            marginBottom: 24,
            display: 'flex',
            alignItems: 'center',
            gap: 24,
          }}
        >
          <div style={{ flex: 1 }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 6 }}>
              <Flame size={14} color="var(--brand)" />
              <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase' }}>
                {huntSession.mode === 'active' ? 'Active Hunt' : 'Casual Search'}
              </span>
              <span style={{ fontSize: 11, color: 'var(--muted)' }}>· Started {formatDate(huntSession.startedAt)}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: 16, flexWrap: 'wrap' }}>
              <div>
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
                  Goal salary: <strong style={{ color: 'var(--text)' }}>{huntSession.targetSalary}</strong>
                </span>
              )}
            </div>
          </div>

          {/* Weekly goal mini-progress */}
          {weeklyGoal > 0 && (
            <div style={{ minWidth: 160, textAlign: 'center' }}>
              <div style={{ fontSize: 11, color: goalHit ? 'var(--brand)' : 'var(--muted)', fontWeight: 700, marginBottom: 6, letterSpacing: '0.06em', textTransform: 'uppercase' }}>
                {goalHit ? '✓ Weekly Goal Hit' : 'Weekly Goal'}
              </div>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 4, justifyContent: 'center', marginBottom: 8 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 24, fontWeight: 700, color: goalHit ? 'var(--brand)' : 'var(--gold)' }}>{totalThisWeek}</span>
                <span style={{ fontSize: 14, color: 'var(--muted)' }}>/ {weeklyGoal}</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.08)', borderRadius: 99, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${goalPct}%` }}
                  transition={{ duration: 0.8, ease: 'easeOut', delay: 0.3 }}
                  style={{
                    height: '100%',
                    background: goalHit ? 'var(--brand)' : 'var(--gold)',
                    borderRadius: 99,
                  }}
                />
              </div>
            </div>
          )}
        </motion.div>
      ) : (
        /* No active hunt — CTA */
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          style={{
            background: 'var(--surface)',
            border: '1px dashed rgba(126,232,162,0.25)',
            borderRadius: 14,
            padding: '28px',
            marginBottom: 24,
            textAlign: 'center',
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
              background: 'var(--brand)',
              color: '#08090D',
              border: 'none',
              borderRadius: 8,
              padding: '11px 24px',
              fontSize: 14,
              fontFamily: 'var(--font-body)',
              fontWeight: 700,
              cursor: 'pointer',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 8,
            }}
          >
            <Target size={14} />
            Start a New Hunt
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
              Nothing urgent. Keep applying and check back tomorrow.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
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
                      display: 'flex',
                      alignItems: 'center',
                      gap: 12,
                      padding: '12px 14px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      color: 'var(--text)',
                      fontSize: 13.5,
                      fontFamily: 'var(--font-body)',
                      cursor: 'pointer',
                      textAlign: 'left',
                      transition: 'border-color 0.15s ease',
                      width: '100%',
                    }}
                    whileHover={{ borderColor: 'rgba(255,255,255,0.13)' }}
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

        {/* Nudge Card — 1/3 width */}
        <Card style={{ background: 'linear-gradient(135deg, var(--surface) 0%, rgba(126,232,162,0.04) 100%)' }}>
          <SectionLabel>From Your Buddy</SectionLabel>
          <div style={{ fontSize: 14, color: 'var(--text-soft)', lineHeight: 1.65, fontStyle: 'italic' }}>
            "{nudge}"
          </div>
        </Card>

        {/* Pipeline at a Glance — full width */}
        <Card style={{ gridColumn: 'span 3' }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <SectionLabel>Pipeline at a Glance</SectionLabel>
            <button
              onClick={() => onViewChange('tracker')}
              style={{ fontSize: 12, color: 'var(--brand)', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 4 }}
            >
              View all <ChevronRight size={12} />
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
                      flex: 1,
                      padding: '14px 12px',
                      background: count > 0 ? cfg.bg : 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'center',
                      transition: 'all 0.15s ease',
                    }}
                    whileHover={{ background: cfg.bg, borderColor: `${cfg.color}40` }}
                  >
                    <div style={{
                      fontFamily: 'var(--font-display)',
                      fontSize: 24,
                      fontWeight: 700,
                      color: count > 0 ? cfg.color : 'var(--muted)',
                      lineHeight: 1,
                      marginBottom: 4,
                    }}>
                      {count}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500 }}>
                      {cfg.label}
                    </div>
                  </motion.button>
                  {!isLast && (
                    <div style={{
                      display: 'flex', alignItems: 'center', padding: '0 4px',
                      color: 'var(--muted)', fontSize: 14,
                    }}>›</div>
                  )}
                </React.Fragment>
              )
            })}
          </div>
        </Card>

        {/* Upcoming Interviews */}
        <Card style={{ gridColumn: 'span 2' }}>
          <SectionLabel>Upcoming Interviews</SectionLabel>
          {upcomingInterviews.length === 0 ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>No interviews scheduled in the next 7 days.</div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {upcomingInterviews.map(app => {
                const days = daysUntil(app.interviewDate)
                const urgency = days === 0 ? 'var(--danger)' : days === 1 ? 'var(--warning)' : 'var(--brand)'
                return (
                  <button
                    key={app.id}
                    onClick={() => onViewChange('tracker', app.id)}
                    style={{
                      display: 'flex', alignItems: 'center', gap: 12,
                      padding: '10px 12px',
                      background: 'var(--surface-2)',
                      border: '1px solid var(--border)',
                      borderRadius: 8,
                      cursor: 'pointer',
                      textAlign: 'left',
                      width: '100%',
                      transition: 'border-color 0.15s',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    <CalendarDays size={14} color={urgency} style={{ flexShrink: 0 }} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                        {app.company}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{app.role}</div>
                    </div>
                    <div style={{ textAlign: 'right', flexShrink: 0 }}>
                      <div style={{ fontSize: 12, color: urgency, fontWeight: 600 }}>
                        {days === 0 ? 'Today' : days === 1 ? 'Tomorrow' : `${days}d`}
                      </div>
                      <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDateTime(app.interviewDate)}</div>
                    </div>
                  </button>
                )
              })}
            </div>
          )}
        </Card>

        {/* Response Rate */}
        <Card>
          <SectionLabel>Response Rate</SectionLabel>
          {responseRate === null ? (
            <div style={{ color: 'var(--muted)', fontSize: 14 }}>Apply to jobs to see your response rate.</div>
          ) : (
            <>
              <div style={{ display: 'flex', alignItems: 'baseline', gap: 8, marginBottom: 12 }}>
                <span style={{ fontFamily: 'var(--font-display)', fontSize: 36, fontWeight: 700, color: responseRate >= 8 ? 'var(--brand)' : responseRate >= 5 ? 'var(--gold)' : 'var(--danger)', letterSpacing: '-0.04em' }}>
                  {responseRate}%
                </span>
                <span style={{ fontSize: 12, color: 'var(--muted)' }}>applied → response</span>
              </div>
              <div style={{ height: 4, background: 'rgba(255,255,255,0.06)', borderRadius: 99, marginBottom: 12, overflow: 'hidden' }}>
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(100, responseRate)}%` }}
                  transition={{ duration: 1, ease: 'easeOut', delay: 0.4 }}
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
                  {responseRate >= 8 ? 'You\'re above average. Keep it up.' :
                   responseRate >= 5 ? 'You\'re tracking with the average.' :
                   'Below average — consider refreshing your resume.'}
                </span>
              </div>
            </>
          )}
        </Card>

      </div>
    </div>
  )
}
