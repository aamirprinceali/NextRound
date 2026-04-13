import React, { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Kanban, CalendarDays, BarChart2, XCircle,
  FileText, Archive, Settings as SettingsIcon, Plus,
  Search, Flag, ChevronDown, ChevronUp,
  Copy, ExternalLink, X, Check,
  Save
} from 'lucide-react'

import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { HuntActivationModal } from './components/hunt/HuntActivationModal'

import type {
  Application, QueuedApp, HuntSession, UserSettings,
  CareerStats, View, DetailTab, MainStage, SubStage,
  HistoryEntry
} from './types'
import {
  loadApplications, saveApplications,
  loadQueue, saveQueue,
  loadHuntSession, saveHuntSession,
  loadSettings, saveSettings,
  loadCareerStats, saveCareerStats,
} from './utils/storage'
import { STAGE_CONFIG, SUB_STAGES, IN_PLAY_STAGES, STAGE_ORDER } from './utils/stages'
import { getTodayIso, formatDate } from './utils/dates'

// ─── Email template logic (preserved from original) ───────────────────────────
type EmailTemplateKey = 'followUp' | 'thankYou' | 'availability' | 'withdrawal' | 'scheduleConfirm'

function buildEmailTemplate(key: EmailTemplateKey, app: Application, settings: UserSettings): string {
  const { availabilityNote, emailSignature } = settings
  const recruiterFirst = (app.recruiter || 'Hiring Team').split(' ')[0].split('/')[0].trim()
  const { company, role } = app
  const interviewDateStr = app.interviewDate
    ? new Intl.DateTimeFormat('en-US', { weekday: 'long', month: 'long', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(app.interviewDate))
    : ''

  switch (key) {
    case 'followUp':
      return `Hi ${recruiterFirst},\n\nI hope you're doing well. I wanted to follow up on my application for the ${role} role at ${company}. I submitted my application on ${app.appliedOn} and wanted to reiterate my strong interest in the position.\n\nIf there's any additional information I can provide, please don't hesitate to reach out.\n\n${emailSignature}`
    case 'thankYou':
      return `Hi ${recruiterFirst},\n\nThank you for taking the time to speak with me${interviewDateStr ? ` on ${interviewDateStr}` : ''} about the ${role} position at ${company}. I really enjoyed our conversation and learning more about the team and the role.\n\n[ADD: 1–2 specific things from the conversation that excited you]\n\nI'm very enthusiastic about the opportunity and look forward to the next steps.\n\n${emailSignature}`
    case 'availability':
      return `Hi ${recruiterFirst},\n\nThank you for reaching out! I'm excited about the opportunity to interview for the ${role} role at ${company}.\n\nI'm available during the following times:\n\n${availabilityNote}\n\nPlease feel free to send over a calendar invite for any of those windows.\n\n${emailSignature}`
    case 'scheduleConfirm':
      return `Hi ${recruiterFirst},\n\nI wanted to confirm my upcoming interview for the ${role} position at ${company}${interviewDateStr ? ` scheduled for ${interviewDateStr}` : ''}.\n\nPlease let me know if anything changes. I'm looking forward to speaking with you!\n\n${emailSignature}`
    case 'withdrawal':
      return `Hi ${recruiterFirst},\n\nI hope you're well. After careful consideration, I've decided to withdraw my application for the ${role} position at ${company}.\n\n[OPTIONAL: brief positive reason]\n\nThank you for your time throughout this process.\n\n${emailSignature}`
  }
}

// ─── Helper: create history entry ─────────────────────────────────────────────
function createHistoryEntry(label: string, detail: string, type: HistoryEntry['type'], dateStr?: string): HistoryEntry {
  return { id: Date.now() + Math.random(), date: dateStr ?? getTodayIso(), label, detail, type }
}

// ─── Helper: new blank application ────────────────────────────────────────────
function newBlankApp(overrides: Partial<Application> = {}): Application {
  return {
    id: Date.now(),
    company: '', role: '', source: 'LinkedIn',
    appliedOn: getTodayIso(),
    followUpOn: new Date(Date.now() + 7 * 86400000).toISOString().slice(0, 10),
    stage: 'Applied',
    subStage: undefined,
    priority: 'Medium',
    desireRank: 0, fitScore: 0,
    salary: '', salaryTargeted: '',
    workStyle: '', flagged: false,
    recruiter: '', recruiterContact: '',
    interviewingManager: '', managerContact: '',
    interviewDate: '', prepStatus: 'Not started', prepNotes: '',
    jobPostingUrl: '', jobDescription: '',
    resumeVersion: '', coverLetterNote: '',
    companyResearch: '', prepQuestions: '', talkingPoints: '',
    notes: '', quickAddNote: '',
    offerAmount: '', decisionNotes: '',
    history: [],
    ...overrides,
  }
}

// ─── Placeholder view ──────────────────────────────────────────────────────────
function PlaceholderView({ title, icon }: { title: string; icon: React.ReactNode }) {
  return (
    <div style={{
      display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
      height: '60vh', color: 'var(--muted)', gap: 12,
    }}>
      {icon}
      <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, color: 'var(--text-soft)' }}>{title}</div>
      <div style={{ fontSize: 13 }}>This view is being built — coming soon.</div>
    </div>
  )
}

export function StageBadge({ stage, subStage }: { stage: MainStage; subStage?: SubStage }) {
  const cfg = STAGE_CONFIG[stage]
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 99,
      fontSize: 11, fontWeight: 600,
      color: cfg.color, background: cfg.bg,
    }}>
      {cfg.label}
      {subStage && <span style={{ opacity: 0.7 }}>· {subStage}</span>}
    </span>
  )
}

// ─── Inline Stage Selector ────────────────────────────────────────────────────
function StageSelector({
  stage, subStage, onChange
}: {
  stage: MainStage
  subStage?: SubStage
  onChange: (stage: MainStage, subStage?: SubStage) => void
}) {
  const [open, setOpen] = useState(false)
  const subOptions = SUB_STAGES[stage] ?? []

  return (
    <div style={{ position: 'relative' }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 99, border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-body)', fontWeight: 600, fontSize: 11,
          color: STAGE_CONFIG[stage].color,
          background: STAGE_CONFIG[stage].bg,
          transition: 'opacity 0.15s',
        }}
      >
        {STAGE_CONFIG[stage].label}
        {subStage && <span style={{ opacity: 0.7 }}>· {subStage}</span>}
        <ChevronDown size={11} />
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              position: 'absolute', top: 'calc(100% + 6px)', left: 0,
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: 6,
              zIndex: 100, minWidth: 180,
              boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
            }}
          >
            {/* Main stages */}
            {STAGE_ORDER.map(s => {
              const cfg = STAGE_CONFIG[s]
              return (
                <button
                  key={s}
                  onClick={() => { onChange(s, undefined); setOpen(false) }}
                  style={{
                    display: 'block', width: '100%', padding: '7px 10px',
                    borderRadius: 6, border: 'none', background: 'transparent',
                    color: s === stage ? cfg.color : 'var(--text-soft)',
                    fontSize: 13, fontFamily: 'var(--font-body)',
                    fontWeight: s === stage ? 600 : 400,
                    textAlign: 'left', cursor: 'pointer',
                    transition: 'background 0.1s',
                  }}
                  onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                  onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                >
                  {cfg.label}
                </button>
              )
            })}

            {/* Sub-stages for current main stage */}
            {subOptions.length > 0 && (
              <>
                <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0', padding: '4px 10px 0' }}>
                  <span style={{ fontSize: 10, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                    Sub-state
                  </span>
                </div>
                {subOptions.map(sub => (
                  <button
                    key={sub}
                    onClick={() => { onChange(stage, sub); setOpen(false) }}
                    style={{
                      display: 'block', width: '100%', padding: '6px 10px',
                      borderRadius: 6, border: 'none', background: 'transparent',
                      color: sub === subStage ? 'var(--text)' : 'var(--text-soft)',
                      fontSize: 12, fontFamily: 'var(--font-body)',
                      fontWeight: sub === subStage ? 600 : 400,
                      textAlign: 'left', cursor: 'pointer',
                      transition: 'background 0.1s',
                    }}
                    onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.05)')}
                    onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
                  >
                    ↳ {sub}
                  </button>
                ))}
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Quick Add Modal ───────────────────────────────────────────────────────────
function QuickAddModal({
  open, onClose, onAdd
}: {
  open: boolean
  onClose: () => void
  onAdd: (app: Application) => void
}) {
  const [form, setForm] = useState({ company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(), note: '' })
  const [saving, setSaving] = useState(false)

  function handleAdd() {
    if (!form.company.trim()) return
    setSaving(true)
    const app = newBlankApp({
      ...form,
      quickAddNote: form.note,
      history: [createHistoryEntry('Applied', `Added via quick add${form.note ? ': ' + form.note : ''}`, 'Applied')],
    })
    setTimeout(() => {
      onAdd(app)
      setForm({ company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(), note: '' })
      setSaving(false)
      onClose()
    }, 300)
  }

  if (!open) return null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '9px 12px',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 14,
    outline: 'none', fontFamily: 'var(--font-body)',
  }

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      style={{
        position: 'fixed', inset: 0,
        background: 'rgba(0,0,0,0.65)',
        backdropFilter: 'blur(4px)',
        zIndex: 1000,
        display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24,
      }}
      onClick={e => { if (e.target === e.currentTarget) onClose() }}
    >
      <motion.div
        initial={{ scale: 0.96, y: 12 }}
        animate={{ scale: 1, y: 0 }}
        style={{
          background: 'var(--surface)', border: '1px solid var(--border)',
          borderRadius: 14, padding: 28, width: '100%', maxWidth: 440,
          position: 'relative',
        }}
      >
        <button onClick={onClose} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', marginBottom: 20 }}>
          Quick Add Application
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company *</label>
              <input value={form.company} onChange={e => setForm(f => ({ ...f, company: e.target.value }))} placeholder="e.g. Salesforce" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div style={{ flex: 2 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Role</label>
              <input value={form.role} onChange={e => setForm(f => ({ ...f, role: e.target.value }))} placeholder="e.g. Account Executive" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          </div>
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Source</label>
              <select value={form.source} onChange={e => setForm(f => ({ ...f, source: e.target.value }))} style={{ ...inputStyle, cursor: 'pointer' }}>
                {['LinkedIn', 'Indeed', 'Company Site', 'Referral', 'Recruiter', 'Other'].map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pay Range</label>
              <input value={form.salary} onChange={e => setForm(f => ({ ...f, salary: e.target.value }))} placeholder="e.g. $70k–$85k" style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Date Applied</label>
              <input type="date" value={form.appliedOn} onChange={e => setForm(f => ({ ...f, appliedOn: e.target.value }))} style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Note (optional)</label>
            <textarea
              value={form.note}
              onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
              placeholder="e.g. Referred by John, strong fit for ops role"
              rows={2}
              style={{ ...inputStyle, resize: 'vertical' }}
              onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
              onBlur={e => (e.target.style.borderColor = 'var(--border)')}
            />
          </div>
        </div>

        <button
          onClick={handleAdd}
          disabled={!form.company.trim() || saving}
          style={{
            marginTop: 20, width: '100%', padding: '11px',
            borderRadius: 8, border: 'none',
            background: form.company.trim() ? 'var(--brand)' : 'rgba(255,255,255,0.06)',
            color: form.company.trim() ? '#08090D' : 'var(--muted)',
            fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 700,
            cursor: form.company.trim() ? 'pointer' : 'not-allowed',
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 8,
            transition: 'all 0.15s',
          }}
        >
          {saving ? <Check size={14} /> : <Plus size={14} />}
          {saving ? 'Added!' : 'Add Application'}
        </button>
      </motion.div>
    </motion.div>
  )
}

// ─── Tracker View ──────────────────────────────────────────────────────────────
function TrackerView({
  applications, onUpdate, onSelect
}: {
  applications: Application[]
  onUpdate: (apps: Application[]) => void
  onSelect: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<MainStage | 'all'>('all')
  const [sortField, setSortField] = useState<'company' | 'stage' | 'appliedOn' | 'salary'>('appliedOn')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')

  const inPlay = useMemo(() =>
    applications.filter(a => IN_PLAY_STAGES.includes(a.stage)),
    [applications]
  )

  const filtered = useMemo(() => {
    let list = stageFilter === 'all' ? inPlay : inPlay.filter(a => a.stage === stageFilter)
    if (search) {
      const q = search.toLowerCase()
      list = list.filter(a =>
        a.company.toLowerCase().includes(q) ||
        a.role.toLowerCase().includes(q) ||
        a.recruiter.toLowerCase().includes(q)
      )
    }
    return [...list].sort((a, b) => {
      let av: string, bv: string
      if (sortField === 'company') { av = a.company; bv = b.company }
      else if (sortField === 'stage') { av = a.stage; bv = b.stage }
      else if (sortField === 'salary') { av = a.salary; bv = b.salary }
      else { av = a.appliedOn; bv = b.appliedOn }
      return sortDir === 'asc' ? av.localeCompare(bv) : bv.localeCompare(av)
    })
  }, [inPlay, search, stageFilter, sortField, sortDir])

  function toggleSort(field: typeof sortField) {
    if (sortField === field) setSortDir(d => d === 'asc' ? 'desc' : 'asc')
    else { setSortField(field); setSortDir('asc') }
  }

  function updateStage(id: number, stage: MainStage, subStage?: SubStage) {
    const updated = applications.map(a => a.id === id ? { ...a, stage, subStage } : a)
    onUpdate(updated)
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
      : null

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            In Play
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {inPlay.length} active application{inPlay.length !== 1 ? 's' : ''} in your pipeline
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 16, flexWrap: 'wrap' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: 200 }}>
          <Search size={13} style={{ position: 'absolute', left: 10, top: '50%', transform: 'translateY(-50%)', color: 'var(--muted)' }} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search companies, roles, recruiters..."
            style={{
              width: '100%', padding: '8px 12px 8px 30px',
              background: 'var(--surface)', border: '1px solid var(--border)',
              borderRadius: 8, color: 'var(--text)', fontSize: 13,
              outline: 'none', fontFamily: 'var(--font-body)',
            }}
          />
        </div>
        {/* Stage filter chips */}
        <div style={{ display: 'flex', gap: 6 }}>
          {(['all', ...IN_PLAY_STAGES] as const).map(s => {
            const cfg = s !== 'all' ? STAGE_CONFIG[s] : null
            return (
              <button
                key={s}
                onClick={() => setStageFilter(s)}
                style={{
                  padding: '6px 12px', borderRadius: 99, cursor: 'pointer',
                  fontSize: 12, fontWeight: 600, fontFamily: 'var(--font-body)',
                  background: stageFilter === s
                    ? (cfg ? cfg.bg : 'rgba(255,255,255,0.1)')
                    : 'var(--surface)',
                  color: stageFilter === s
                    ? (cfg ? cfg.color : 'var(--text)')
                    : 'var(--muted)',
                  border: `1px solid ${stageFilter === s ? (cfg ? cfg.color + '40' : 'rgba(255,255,255,0.15)') : 'var(--border)'}`,
                }}
              >
                {s === 'all' ? 'All' : STAGE_CONFIG[s].label}
              </button>
            )
          })}
        </div>
      </div>

      {/* Table */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
        {/* Table header */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: '2fr 1.5fr 1.4fr 0.9fr 0.9fr 0.8fr',
          padding: '10px 16px',
          borderBottom: '1px solid var(--border)',
          background: 'var(--surface-2)',
        }}>
          {[
            { label: 'Company', field: 'company' as const },
            { label: 'Role', field: null },
            { label: 'Stage', field: 'stage' as const },
            { label: 'Pay', field: 'salary' as const },
            { label: 'Applied', field: 'appliedOn' as const },
            { label: 'Priority', field: null },
          ].map(({ label, field }) => (
            <button
              key={label}
              onClick={() => field && toggleSort(field)}
              style={{
                display: 'flex', alignItems: 'center', gap: 4,
                background: 'none', border: 'none', cursor: field ? 'pointer' : 'default',
                fontSize: 11, fontWeight: 700, color: 'var(--muted)',
                textTransform: 'uppercase', letterSpacing: '0.08em',
                padding: 0, fontFamily: 'var(--font-body)',
              }}
            >
              {label}
              {field && <SortIcon field={field} />}
            </button>
          ))}
        </div>

        {/* Rows */}
        {filtered.length === 0 ? (
          <div style={{ padding: '40px', textAlign: 'center', color: 'var(--muted)', fontSize: 14 }}>
            No applications match your filters.
          </div>
        ) : (
          filtered.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.03 }}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1.5fr 1.4fr 0.9fr 0.9fr 0.8fr',
                padding: '13px 16px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                alignItems: 'center',
                cursor: 'pointer',
                transition: 'background 0.1s',
              }}
              onClick={() => onSelect(app.id)}
              onMouseEnter={e => (e.currentTarget.style.background = 'rgba(255,255,255,0.02)')}
              onMouseLeave={e => (e.currentTarget.style.background = 'transparent')}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)', display: 'flex', alignItems: 'center', gap: 6 }}>
                  {app.flagged && <Flag size={11} color="var(--gold)" fill="var(--gold)" />}
                  {app.company}
                </div>
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {app.role || '—'}
              </div>
              <div onClick={e => e.stopPropagation()}>
                <StageSelector
                  stage={app.stage}
                  subStage={app.subStage}
                  onChange={(stage, sub) => updateStage(app.id, stage, sub)}
                />
              </div>
              <div style={{ fontSize: 12, color: app.salary ? 'var(--text-soft)' : 'var(--muted)' }}>
                {app.salary || '—'}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                {formatDate(app.appliedOn)}
              </div>
              <div>
                <span style={{
                  fontSize: 11, fontWeight: 600,
                  padding: '2px 8px', borderRadius: 99,
                  background: app.priority === 'High' ? 'var(--danger-dim)' : app.priority === 'Medium' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.05)',
                  color: app.priority === 'High' ? 'var(--danger)' : app.priority === 'Medium' ? 'var(--gold)' : 'var(--muted)',
                }}>
                  {app.priority}
                </span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  )
}

// ─── Applied View (staging tier) ──────────────────────────────────────────────
function AppliedView({
  queue, applications, onQueueUpdate, onPromote, onQuickAdd
}: {
  queue: QueuedApp[]
  applications: Application[]
  onQueueUpdate: (q: QueuedApp[]) => void
  onPromote: (qId: number) => void
  onQuickAdd: () => void
}) {
  const pending = queue.filter(q => q.status === 'pending')
  const allApplied = applications.filter(a => a.stage === 'Applied')
  const totalApplied = pending.length + allApplied.length

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Applied
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {totalApplied} total application{totalApplied !== 1 ? 's' : ''} submitted
          </div>
        </div>
        <button
          onClick={onQuickAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            padding: '9px 16px', borderRadius: 8, border: 'none',
            background: 'var(--brand)', color: '#08090D',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
          }}
        >
          <Plus size={14} /> Quick Add
        </button>
      </div>

      {/* Queue items (pending) */}
      {pending.length > 0 && (
        <div style={{ marginBottom: 24 }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            Pending — {pending.length} in queue
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {pending.map(item => (
              <div key={item.id} style={{
                background: 'var(--surface)', border: '1px solid var(--border)',
                borderRadius: 10, padding: '14px 16px',
                display: 'flex', alignItems: 'center', gap: 14,
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{item.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>
                    {item.role} · {item.source} · {formatDate(item.receivedOn)}
                  </div>
                  {item.snippet && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.snippet}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => onPromote(item.id)}
                    style={{
                      padding: '6px 12px', borderRadius: 6, border: 'none',
                      background: 'var(--brand-dim)', color: 'var(--brand)',
                      fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
                    }}
                  >
                    Track this →
                  </button>
                  <button
                    onClick={() => onQueueUpdate(queue.map(q => q.id === item.id ? { ...q, status: 'dismissed' } : q))}
                    style={{
                      padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--muted)',
                      fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer',
                    }}
                  >
                    Dismiss
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All applied applications */}
      {allApplied.length > 0 && (
        <div>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.1em', textTransform: 'uppercase', marginBottom: 10 }}>
            All Submitted — {allApplied.length}
          </div>
          <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
            {allApplied.map((app, i) => (
              <div key={app.id} style={{
                display: 'flex', alignItems: 'center', gap: 14,
                padding: '12px 16px',
                borderBottom: i < allApplied.length - 1 ? '1px solid var(--border)' : 'none',
              }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{app.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>{app.role} · {app.source} · {formatDate(app.appliedOn)}</div>
                </div>
                <div style={{ fontSize: 12, color: 'var(--text-soft)' }}>{app.salary || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {totalApplied === 0 && (
        <div style={{ textAlign: 'center', padding: '60px 0', color: 'var(--muted)' }}>
          <div style={{ fontSize: 16, marginBottom: 8 }}>No applications yet.</div>
          <div style={{ fontSize: 13 }}>Hit Quick Add to log your first one, or connect your email to auto-import.</div>
        </div>
      )}
    </div>
  )
}

// ─── Application Detail Panel ──────────────────────────────────────────────────
function DetailPanel({
  app, onClose, onUpdate, settings
}: {
  app: Application
  onClose: () => void
  onUpdate: (app: Application) => void
  settings: UserSettings
}) {
  const [tab, setTab] = useState<DetailTab>('overview')
  const [draft, setDraft] = useState<Application>({ ...app })
  const [emailKey, setEmailKey] = useState<EmailTemplateKey>('followUp')
  const [emailBody, setEmailBody] = useState('')
  const [copied, setCopied] = useState(false)

  useEffect(() => { setDraft({ ...app }); setTab('overview') }, [app.id])

  function save() { onUpdate(draft) }

  function patchDraft<K extends keyof Application>(field: K, value: Application[K]) {
    setDraft(d => ({ ...d, [field]: value }))
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '8px 10px',
    background: 'var(--surface-2)', border: '1px solid var(--border)',
    borderRadius: 7, color: 'var(--text)', fontSize: 13,
    outline: 'none', fontFamily: 'var(--font-body)',
  }
  const textareaStyle: React.CSSProperties = { ...inputStyle, resize: 'vertical' }

  const tabs: { id: DetailTab; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'contact',  label: 'Contact'  },
    { id: 'job',      label: 'Job'      },
    { id: 'prep',     label: 'Prep'     },
    { id: 'offer',    label: 'Offer'    },
    { id: 'email',    label: 'Email'    },
  ]

  function copyEmail() {
    const body = buildEmailTemplate(emailKey, draft, settings)
    setEmailBody(body)
    navigator.clipboard.writeText(body).catch(() => {})
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <motion.div
      initial={{ x: '100%', opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      exit={{ x: '100%', opacity: 0 }}
      transition={{ type: 'spring', stiffness: 300, damping: 30 }}
      style={{
        position: 'fixed', top: 0, right: 0, bottom: 0,
        width: 500, background: 'var(--surface)',
        borderLeft: '1px solid var(--border)',
        zIndex: 200, display: 'flex', flexDirection: 'column',
        boxShadow: '-8px 0 32px rgba(0,0,0,0.4)',
      }}
    >
      {/* Panel header */}
      <div style={{ padding: '20px 20px 0', borderBottom: '1px solid var(--border)' }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
          <div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>{draft.company}</div>
            <div style={{ fontSize: 13, color: 'var(--text-soft)', marginTop: 2 }}>{draft.role}</div>
            {draft.salary && <div style={{ fontSize: 12, color: 'var(--brand)', marginTop: 2, fontWeight: 500 }}>{draft.salary}</div>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
            <X size={18} />
          </button>
        </div>

        {/* Stage selector in panel */}
        <div style={{ marginBottom: 14 }}>
          <StageSelector
            stage={draft.stage}
            subStage={draft.subStage}
            onChange={(stage, sub) => { patchDraft('stage', stage); patchDraft('subStage', sub) }}
          />
        </div>

        {/* Tabs */}
        <div style={{ display: 'flex', gap: 0, borderBottom: '1px solid var(--border)', marginBottom: -1 }}>
          {tabs.map(t => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              style={{
                padding: '8px 14px', background: 'none', border: 'none', cursor: 'pointer',
                fontFamily: 'var(--font-body)', fontSize: 13, fontWeight: tab === t.id ? 600 : 400,
                color: tab === t.id ? 'var(--brand)' : 'var(--muted)',
                borderBottom: tab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
                marginBottom: -1, transition: 'all 0.15s',
              }}
            >
              {t.label}
            </button>
          ))}
        </div>
      </div>

      {/* Tab content */}
      <div style={{ flex: 1, overflow: 'auto', padding: 20 }}>
        {tab === 'overview' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Notes</label>
              <textarea rows={4} value={draft.notes} onChange={e => patchDraft('notes', e.target.value)} placeholder="Your notes about this application..." style={textareaStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Applied</label>
                <input type="date" value={draft.appliedOn} onChange={e => patchDraft('appliedOn', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Follow-up Date</label>
                <input type="date" value={draft.followUpOn} onChange={e => patchDraft('followUpOn', e.target.value)} style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Pay Range</label>
                <input value={draft.salary} onChange={e => patchDraft('salary', e.target.value)} placeholder="Listed pay" style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Your Target</label>
                <input value={draft.salaryTargeted} onChange={e => patchDraft('salaryTargeted', e.target.value)} placeholder="Your goal" style={inputStyle} />
              </div>
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Priority</label>
                <select value={draft.priority} onChange={e => patchDraft('priority', e.target.value as Application['priority'])} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {(['High', 'Medium', 'Low'] as const).map(p => <option key={p}>{p}</option>)}
                </select>
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Work Style</label>
                <input value={draft.workStyle} onChange={e => patchDraft('workStyle', e.target.value)} placeholder="Remote, Hybrid, Onsite" style={inputStyle} />
              </div>
            </div>
            {/* History */}
            {draft.history.length > 0 && (
              <div>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>History</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                  {draft.history.map(h => (
                    <div key={h.id} style={{ padding: '8px 10px', background: 'var(--surface-2)', borderRadius: 7, border: '1px solid var(--border)' }}>
                      <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--text)' }}>{h.label}</div>
                      {h.detail && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{h.detail}</div>}
                      <div style={{ fontSize: 10, color: 'var(--muted)', marginTop: 2 }}>{formatDate(h.date)}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {tab === 'contact' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            {[
              { label: 'Recruiter Name', field: 'recruiter' as const, ph: 'e.g. Sarah Chen' },
              { label: 'Recruiter Contact', field: 'recruiterContact' as const, ph: 'email / phone / LinkedIn' },
              { label: 'Interviewing Manager', field: 'interviewingManager' as const, ph: 'Hiring manager name' },
              { label: 'Manager Contact', field: 'managerContact' as const, ph: 'email / phone' },
              { label: 'Company Website / Job URL', field: 'jobPostingUrl' as const, ph: 'https://...' },
            ].map(({ label, field, ph }) => (
              <div key={field}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>{label}</label>
                <input value={(draft[field] as string) || ''} onChange={e => patchDraft(field, e.target.value)} placeholder={ph} style={inputStyle}
                  onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')} />
              </div>
            ))}
          </div>
        )}

        {tab === 'job' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Job Description</label>
              <textarea rows={6} value={draft.jobDescription} onChange={e => patchDraft('jobDescription', e.target.value)} placeholder="Paste the full job description here..." style={textareaStyle} />
            </div>
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Resume Version</label>
                <input value={draft.resumeVersion} onChange={e => patchDraft('resumeVersion', e.target.value)} placeholder="e.g. Operations Resume v3" style={inputStyle} />
              </div>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Cover Letter Notes</label>
              <textarea rows={3} value={draft.coverLetterNote} onChange={e => patchDraft('coverLetterNote', e.target.value)} placeholder="Notes about your cover letter..." style={textareaStyle} />
            </div>
          </div>
        )}

        {tab === 'prep' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>General Prep Notes</label>
              <textarea rows={3} value={draft.prepNotes} onChange={e => patchDraft('prepNotes', e.target.value)} placeholder="General notes, thoughts, reminders..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview Date & Time</label>
              <input type="datetime-local" value={draft.interviewDate} onChange={e => patchDraft('interviewDate', e.target.value)} style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prep Status</label>
              <select value={draft.prepStatus} onChange={e => patchDraft('prepStatus', e.target.value as Application['prepStatus'])} style={{ ...inputStyle, cursor: 'pointer' }}>
                {(['Not started', 'Light prep', 'Ready'] as const).map(s => <option key={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company Research</label>
              <textarea rows={3} value={draft.companyResearch} onChange={e => patchDraft('companyResearch', e.target.value)} placeholder="What you know about the company, culture, recent news..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions to Ask / Prep Answers</label>
              <textarea rows={3} value={draft.prepQuestions} onChange={e => patchDraft('prepQuestions', e.target.value)} placeholder="Questions to ask, questions to prep for..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Talking Points (STAR stories)</label>
              <textarea rows={3} value={draft.talkingPoints} onChange={e => patchDraft('talkingPoints', e.target.value)} placeholder="Your best examples, STAR stories, talking points..." style={textareaStyle} />
            </div>
          </div>
        )}

        {tab === 'offer' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Offer Amount</label>
              <input value={draft.offerAmount} onChange={e => patchDraft('offerAmount', e.target.value)} placeholder="e.g. $90,000 + benefits" style={inputStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Decision Notes</label>
              <textarea rows={5} value={draft.decisionNotes} onChange={e => patchDraft('decisionNotes', e.target.value)} placeholder="Pros, cons, negotiation notes, gut check..." style={textareaStyle} />
            </div>
          </div>
        )}

        {tab === 'email' && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Template</label>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                {([
                  { key: 'followUp' as const, label: 'Follow-up after applying' },
                  { key: 'thankYou' as const, label: 'Thank-you after interview' },
                  { key: 'availability' as const, label: 'Send your availability' },
                  { key: 'scheduleConfirm' as const, label: 'Confirm interview time' },
                  { key: 'withdrawal' as const, label: 'Withdraw from process' },
                ]).map(t => (
                  <button
                    key={t.key}
                    onClick={() => { setEmailKey(t.key); setEmailBody(buildEmailTemplate(t.key, draft, settings)) }}
                    style={{
                      padding: '8px 12px', borderRadius: 7, border: `1px solid ${emailKey === t.key ? 'rgba(126,232,162,0.35)' : 'var(--border)'}`,
                      background: emailKey === t.key ? 'var(--brand-dim)' : 'var(--surface-2)',
                      color: emailKey === t.key ? 'var(--brand)' : 'var(--text-soft)',
                      fontSize: 12, fontFamily: 'var(--font-body)', cursor: 'pointer', textAlign: 'left',
                    }}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>
            {emailBody && (
              <div>
                <textarea
                  rows={10}
                  value={emailBody}
                  onChange={e => setEmailBody(e.target.value)}
                  style={{ ...textareaStyle, fontSize: 12, lineHeight: 1.6 }}
                />
                <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
                  <button
                    onClick={copyEmail}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: copied ? 'var(--brand)' : 'var(--text-soft)',
                      fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                    }}
                  >
                    {copied ? <Check size={12} /> : <Copy size={12} />}
                    {copied ? 'Copied!' : 'Copy'}
                  </button>
                  <a
                    href={`mailto:${draft.recruiterContact || ''}?subject=Re: ${draft.role} at ${draft.company}&body=${encodeURIComponent(emailBody)}`}
                    style={{
                      flex: 1, padding: '9px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'var(--surface-2)', color: 'var(--text-soft)',
                      fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
                      display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 6,
                      textDecoration: 'none',
                    }}
                  >
                    <ExternalLink size={12} />
                    Open in Email
                  </a>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Save bar */}
      <div style={{ padding: '12px 20px', borderTop: '1px solid var(--border)', display: 'flex', justifyContent: 'flex-end' }}>
        <button
          onClick={save}
          style={{
            padding: '9px 20px', borderRadius: 8, border: 'none',
            background: 'var(--brand)', color: '#08090D',
            fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
        >
          <Save size={13} /> Save Changes
        </button>
      </div>
    </motion.div>
  )
}

// ─── Root App ──────────────────────────────────────────────────────────────────
export default function App() {
  const [view, setView] = useState<View>('dashboard')
  const [applications, setApplications] = useState<Application[]>(() => loadApplications())
  const [queue, setQueue] = useState<QueuedApp[]>(() => loadQueue())
  const [huntSession, setHuntSession] = useState<HuntSession | null>(() => loadHuntSession())
  const [settings] = useState<UserSettings>(() => loadSettings())
  const [careerStats] = useState<CareerStats>(() => loadCareerStats())

  const [huntModalOpen, setHuntModalOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null)

  // Persist on every change
  useEffect(() => { saveApplications(applications) }, [applications])
  useEffect(() => { saveQueue(queue) }, [queue])
  useEffect(() => { saveHuntSession(huntSession) }, [huntSession])
  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveCareerStats(careerStats) }, [careerStats])

  // Derived counts
  const pendingQueueCount = useMemo(() => queue.filter(q => q.status === 'pending').length, [queue])
  const rejectionCount = useMemo(() => applications.filter(a => a.stage === 'Closed').length, [applications])
  const selectedApp = useMemo(() => applications.find(a => a.id === selectedAppId) ?? null, [applications, selectedAppId])

  function updateApplications(updated: Application[]) { setApplications(updated) }

  function updateApp(updated: Application) {
    setApplications(prev => prev.map(a => a.id === updated.id ? updated : a))
  }

  function addApplication(app: Application) {
    setApplications(prev => [app, ...prev])
  }

  function promoteQueueItem(queueId: number) {
    const item = queue.find(q => q.id === queueId)
    if (!item) return
    const app = newBlankApp({
      company: item.company,
      role: item.role,
      source: item.source,
      receivedOn: item.receivedOn,
      appliedOn: item.receivedOn,
      stage: 'Applied',
      note: item.snippet,
      huntSessionId: huntSession?.id,
      history: [createHistoryEntry('Added from inbox', item.snippet || '', 'Applied')],
    } as Partial<Application>)
    setApplications(prev => [app, ...prev])
    setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'tracked', trackedAppId: app.id } : q))
  }

  function handleViewChange(v: string, appId?: number) {
    setView(v as View)
    if (appId) setSelectedAppId(appId)
  }

  function startHunt(session: HuntSession) {
    setHuntSession(session)
  }

  return (
    <div style={{ display: 'flex', minHeight: '100vh', background: 'var(--bg)' }}>
      <Sidebar
        currentView={view}
        setView={setView}
        huntSession={huntSession}
        appliedCount={pendingQueueCount}
        rejectionCount={rejectionCount}
        onStartHunt={() => setHuntModalOpen(true)}
        onGorillaModeOpen={() => {}}
        gorillaActive={false}
      />

      {/* Main content */}
      <div style={{ flex: 1, minWidth: 0, overflowY: 'auto' }}>
        <AnimatePresence mode="wait">
          {view === 'dashboard' && (
            <motion.div key="dashboard" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <Dashboard
                applications={applications}
                queue={queue}
                huntSession={huntSession}
                onStartHunt={() => setHuntModalOpen(true)}
                onViewChange={handleViewChange}
              />
            </motion.div>
          )}

          {view === 'applied' && (
            <motion.div key="applied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <AppliedView
                queue={queue}
                applications={applications}
                onQueueUpdate={setQueue}
                onPromote={promoteQueueItem}
                onQuickAdd={() => setQuickAddOpen(true)}
              />
            </motion.div>
          )}

          {view === 'tracker' && (
            <motion.div key="tracker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TrackerView
                applications={applications}
                onUpdate={updateApplications}
                onSelect={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'pipeline' && (
            <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Pipeline (Kanban)" icon={<Kanban size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'interviews' && (
            <motion.div key="interviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Interview Schedule" icon={<CalendarDays size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Stats & Reporting" icon={<BarChart2 size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'rejections' && (
            <motion.div key="rejections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Rejection Center" icon={<XCircle size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'resume-vault' && (
            <motion.div key="resume-vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Resume Vault" icon={<FileText size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Archive" icon={<Archive size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Settings" icon={<SettingsIcon size={32} color="var(--muted)" />} />
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Detail panel */}
      <AnimatePresence>
        {selectedApp && (
          <DetailPanel
            key={selectedApp.id}
            app={selectedApp}
            onClose={() => setSelectedAppId(null)}
            onUpdate={updateApp}
            settings={settings}
          />
        )}
      </AnimatePresence>

      {/* Modals */}
      <HuntActivationModal
        open={huntModalOpen}
        onClose={() => setHuntModalOpen(false)}
        onStart={startHunt}
        userName={settings.fullName}
      />

      <QuickAddModal
        open={quickAddOpen}
        onClose={() => setQuickAddOpen(false)}
        onAdd={addApplication}
      />
    </div>
  )
}
