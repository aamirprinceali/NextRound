import React from 'react'
import { motion } from 'framer-motion'
import {
  LayoutDashboard, Inbox, Kanban, List, CalendarDays,
  BarChart2, XCircle, FileText, Archive, Settings,
  Zap, Target, ChevronRight, TrendingUp
} from 'lucide-react'
import type { View, HuntSession } from '../../types'
import { huntDaysElapsed } from '../../utils/dates'

// ─── Nav item definition ───────────────────────────────────────────────────────
type NavItem = {
  id: View
  label: string
  icon: React.ElementType
  badge?: number | string
}

const NAV_MAIN: NavItem[] = [
  { id: 'dashboard',   label: 'Command Center', icon: LayoutDashboard },
  { id: 'applied',     label: 'Applied',        icon: Inbox },
  { id: 'tracker',     label: 'In Play',        icon: List },
  { id: 'pipeline',    label: 'Pipeline',       icon: Kanban },
]

const NAV_TOOLS: NavItem[] = [
  { id: 'interviews',  label: 'Interviews',     icon: CalendarDays },
  { id: 'stats',       label: 'Stats',          icon: BarChart2 },
  { id: 'rejections',  label: 'Rejections',     icon: XCircle },
  { id: 'resume-vault',label: 'Resume Vault',   icon: FileText },
  { id: 'archive',     label: 'Archive',        icon: Archive },
]

// ─── Props ─────────────────────────────────────────────────────────────────────
type SidebarProps = {
  currentView: View
  setView: (v: View) => void
  huntSession: HuntSession | null
  appliedCount: number
  rejectionCount: number
  onStartHunt: () => void
  onGorillaModeOpen: () => void
  gorillaActive: boolean
}

// ─── Nav Item ──────────────────────────────────────────────────────────────────
function NavLink({
  item, active, onClick, badge
}: {
  item: NavItem
  active: boolean
  onClick: () => void
  badge?: number | string
}) {
  const Icon = item.icon
  return (
    <button
      onClick={onClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 10,
        width: '100%',
        padding: '9px 12px',
        borderRadius: 8,
        border: 'none',
        background: active ? 'var(--brand-dim)' : 'transparent',
        borderLeft: active ? '2px solid var(--brand)' : '2px solid transparent',
        color: active ? 'var(--brand)' : 'var(--text-soft)',
        fontSize: 13.5,
        fontFamily: 'var(--font-body)',
        fontWeight: active ? 600 : 400,
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        textAlign: 'left',
        paddingLeft: active ? 10 : 12,
      }}
      onMouseEnter={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.04)'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text)'
        }
      }}
      onMouseLeave={e => {
        if (!active) {
          (e.currentTarget as HTMLElement).style.background = 'transparent'
          ;(e.currentTarget as HTMLElement).style.color = 'var(--text-soft)'
        }
      }}
    >
      <Icon size={15} style={{ flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{item.label}</span>
      {badge !== undefined && badge !== 0 && (
        <span style={{
          background: 'var(--danger)',
          color: '#fff',
          fontSize: 10,
          fontWeight: 700,
          padding: '1px 6px',
          borderRadius: 99,
          lineHeight: 1.6,
        }}>
          {badge}
        </span>
      )}
    </button>
  )
}

// ─── Sidebar ───────────────────────────────────────────────────────────────────
export function Sidebar({
  currentView, setView, huntSession,
  appliedCount, rejectionCount,
  onStartHunt, onGorillaModeOpen, gorillaActive
}: SidebarProps) {
  const daysActive = huntSession ? huntDaysElapsed(huntSession.startedAt) : 0

  return (
    <motion.aside
      initial={{ x: -20, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      transition={{ duration: 0.3, ease: 'easeOut' }}
      style={{
        width: 240,
        minHeight: '100vh',
        background: 'var(--surface)',
        borderRight: '1px solid var(--border)',
        display: 'flex',
        flexDirection: 'column',
        position: 'sticky',
        top: 0,
        height: '100vh',
        overflow: 'hidden',
        flexShrink: 0,
      }}
    >
      {/* ── Brand ── */}
      <div style={{ padding: '20px 16px 16px', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          {/* Dot logo */}
          <div style={{
            width: 28, height: 28,
            background: 'var(--brand)',
            borderRadius: 8,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            flexShrink: 0,
          }}>
            <Target size={14} color="#08090D" strokeWidth={2.5} />
          </div>
          <div>
            <div style={{
              fontFamily: 'var(--font-display)',
              fontWeight: 700,
              fontSize: 16,
              color: 'var(--text)',
              letterSpacing: '-0.03em',
              lineHeight: 1.1,
            }}>
              Prospect
            </div>
            <div style={{
              fontSize: 10,
              color: 'var(--muted)',
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              fontWeight: 500,
            }}>
              Job Hunt HQ
            </div>
          </div>
        </div>
      </div>

      {/* ── Hunt Session Banner ── */}
      {huntSession ? (
        <div style={{
          margin: '12px 12px 0',
          padding: '10px 12px',
          background: 'var(--gold-dim)',
          border: '1px solid rgba(251,191,36,0.2)',
          borderRadius: 8,
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 2 }}>
            <TrendingUp size={12} color="var(--gold)" />
            <span style={{ fontSize: 10, color: 'var(--gold)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
              {huntSession.mode === 'active' ? 'Active Hunt' : 'Casual Search'}
            </span>
          </div>
          <div style={{ fontSize: 13, color: 'var(--text)', fontWeight: 600 }}>
            Day {daysActive}
          </div>
          {huntSession.targetRole && (
            <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 2, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {huntSession.targetRole}
            </div>
          )}
        </div>
      ) : (
        <button
          onClick={onStartHunt}
          style={{
            margin: '12px 12px 0',
            padding: '10px 12px',
            background: 'var(--brand-dim)',
            border: '1px solid rgba(126,232,162,0.2)',
            borderRadius: 8,
            color: 'var(--brand)',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            width: 'calc(100% - 24px)',
            transition: 'all 0.15s ease',
          }}
          onMouseEnter={e => (e.currentTarget.style.background = 'var(--brand-hover)')}
          onMouseLeave={e => (e.currentTarget.style.background = 'var(--brand-dim)')}
        >
          <Target size={13} />
          Start a New Hunt
          <ChevronRight size={12} style={{ marginLeft: 'auto' }} />
        </button>
      )}

      {/* ── Nav Scroll Area ── */}
      <div style={{ flex: 1, overflow: 'auto', padding: '16px 8px 8px' }}>
        {/* Main nav group */}
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            Main
          </div>
          {NAV_MAIN.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={() => setView(item.id)}
              badge={item.id === 'applied' ? appliedCount : undefined}
            />
          ))}
        </div>

        {/* Tools nav group */}
        <div>
          <div style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', padding: '0 12px', marginBottom: 6 }}>
            Tools
          </div>
          {NAV_TOOLS.map(item => (
            <NavLink
              key={item.id}
              item={item}
              active={currentView === item.id}
              onClick={() => setView(item.id)}
              badge={item.id === 'rejections' ? rejectionCount : undefined}
            />
          ))}
        </div>
      </div>

      {/* ── Gorilla Mode Button ── */}
      <div style={{ padding: '8px 12px 4px', borderTop: '1px solid var(--border)' }}>
        <button
          onClick={onGorillaModeOpen}
          style={{
            width: '100%',
            padding: '9px 12px',
            borderRadius: 8,
            border: gorillaActive
              ? '1px solid rgba(251,146,60,0.4)'
              : '1px solid rgba(255,255,255,0.06)',
            background: gorillaActive
              ? 'rgba(251,146,60,0.1)'
              : 'rgba(255,255,255,0.03)',
            color: gorillaActive ? 'var(--warning)' : 'var(--text-soft)',
            fontSize: 13,
            fontFamily: 'var(--font-body)',
            fontWeight: 600,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
            transition: 'all 0.15s ease',
            boxShadow: gorillaActive ? '0 0 12px rgba(251,146,60,0.15)' : 'none',
          }}
        >
          <Zap size={14} />
          {gorillaActive ? 'Gorilla Mode — Active' : 'Gorilla Mode'}
        </button>
      </div>

      {/* ── Settings ── */}
      <div style={{ padding: '4px 8px 16px' }}>
        <NavLink
          item={{ id: 'settings', label: 'Settings', icon: Settings }}
          active={currentView === 'settings'}
          onClick={() => setView('settings')}
        />
      </div>
    </motion.aside>
  )
}
