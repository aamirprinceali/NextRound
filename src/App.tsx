import React, { useEffect, useMemo, useState, useRef } from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CalendarDays,
  FileText, Archive, Plus,
  Search, Flag, ChevronDown, ChevronUp,
  Copy, ExternalLink, X, Check, CheckCircle,
  Save, ArrowRight
} from 'lucide-react'

import { Sidebar } from './components/layout/Sidebar'
import { Dashboard } from './components/dashboard/Dashboard'
import { HuntActivationModal } from './components/hunt/HuntActivationModal'
import { PrepRoom } from './components/prep/PrepRoom'
import { CalendarView } from './components/calendar/CalendarView'

import type {
  Application, QueuedApp, HuntSession, UserSettings,
  CareerStats, View, DetailTab, MainStage, SubStage,
  HistoryEntry, Task
} from './types'
import {
  loadApplications, saveApplications,
  loadQueue, saveQueue,
  loadHuntSession, saveHuntSession,
  loadSettings, saveSettings,
  loadCareerStats, saveCareerStats,
  loadTasks, saveTasks,
} from './utils/storage'
import { STAGE_CONFIG, SUB_STAGES, IN_PLAY_STAGES, STAGE_ORDER } from './utils/stages'
import { getTodayIso, formatDate, formatDateShort, formatDateTime, daysUntil, daysAgo, isSameWeek } from './utils/dates'

// ─── Dropdown Portal — renders dropdown outside DOM tree to escape overflow:hidden ──
function DropdownPortal({
  triggerRef,
  children,
}: {
  triggerRef: React.RefObject<HTMLDivElement | null>
  children: React.ReactNode
}) {
  const [coords, setCoords] = useState<{ top: number; left: number } | null>(null)

  useEffect(() => {
    if (!triggerRef.current) return
    const rect = triggerRef.current.getBoundingClientRect()
    setCoords({ top: rect.bottom + 6, left: rect.left })
  }, [triggerRef])

  if (!coords) return null

  return createPortal(
    <div style={{ position: 'fixed', top: coords.top, left: coords.left, zIndex: 9999 }}>
      {children}
    </div>,
    document.body
  )
}

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
  const cfg = STAGE_CONFIG[stage]

  // Close on outside click
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  return (
    <div ref={ref} style={{ position: 'relative', display: 'inline-block' }}>
      <button
        onClick={e => { e.stopPropagation(); setOpen(!open) }}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 8px 4px 10px', borderRadius: 8, border: 'none',
          cursor: 'pointer', fontFamily: 'var(--font-body)',
          color: cfg.color, background: cfg.bg,
          transition: 'opacity 0.15s',
        }}
      >
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: 1 }}>
          <span style={{ fontWeight: 600, fontSize: 11, lineHeight: 1.2 }}>{cfg.label}</span>
          {subStage && (
            <span style={{ fontSize: 9, opacity: 0.75, fontWeight: 500, lineHeight: 1.1, maxWidth: 120, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              {subStage}
            </span>
          )}
        </div>
        <ChevronDown size={10} style={{ flexShrink: 0 }} />
      </button>

      <AnimatePresence>
        {open && (
          <DropdownPortal triggerRef={ref}>
          <motion.div
            initial={{ opacity: 0, y: 4, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 4, scale: 0.97 }}
            transition={{ duration: 0.12 }}
            style={{
              background: 'var(--surface-2)',
              border: '1px solid var(--border)',
              borderRadius: 10, padding: 6,
              minWidth: 200, maxHeight: 360, overflowY: 'auto',
              boxShadow: '0 12px 32px rgba(0,0,0,0.5)',
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
          </DropdownPortal>
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Quick Add Modal ───────────────────────────────────────────────────────────
function QuickAddModal({
  open, onClose, onAdd, defaultStage = 'Applied'
}: {
  open: boolean
  onClose: () => void
  onAdd: (app: Application) => void
  defaultStage?: MainStage
}) {
  const [form, setForm] = useState({ company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(), note: '', stage: defaultStage, interviewDate: '', interviewRound: 'Round 1' as SubStage })
  const [saving, setSaving] = useState(false)

  // Reset form stage when defaultStage changes (e.g. opening from tracker vs applied)
  useEffect(() => { setForm(f => ({ ...f, stage: defaultStage, interviewDate: '', interviewRound: 'Round 1' as SubStage })) }, [defaultStage, open])

  function handleAdd() {
    if (!form.company.trim()) return
    setSaving(true)
    const isInterviewing = form.stage === 'Interviewing'
    const app = newBlankApp({
      ...form,
      stage: form.stage as MainStage,
      subStage: isInterviewing ? form.interviewRound : undefined,
      interviewDate: isInterviewing ? form.interviewDate : '',
      quickAddNote: form.note,
      history: [createHistoryEntry(form.stage, `Added via quick add${form.note ? ': ' + form.note : ''}`, 'Applied')],
    })
    setTimeout(() => {
      onAdd(app)
      setForm({ company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(), note: '', stage: defaultStage })
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
          {/* Stage selector — shown when adding directly to tracker */}
          <div style={{ display: 'flex', gap: 10 }}>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Add To Stage</label>
              <select
                value={form.stage}
                onChange={e => setForm(f => ({ ...f, stage: e.target.value as MainStage }))}
                style={{ ...inputStyle, cursor: 'pointer' }}
              >
                <option value="Applied">Applied (staging)</option>
                {IN_PLAY_STAGES.map(s => (
                  <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>
                ))}
              </select>
            </div>
            <div style={{ flex: 1 }}>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Quick Note (optional)</label>
              <textarea
                value={form.note}
                onChange={e => setForm(f => ({ ...f, note: e.target.value }))}
                placeholder="Any notes..."
                rows={1}
                style={{ ...inputStyle, resize: 'none' }}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>

          {/* Interview fields — shown when Interviewing stage is selected */}
          {form.stage === 'Interviewing' && (
            <div style={{ display: 'flex', gap: 10, padding: '12px 14px', background: 'rgba(126,232,162,0.06)', borderRadius: 8, border: '1px solid rgba(126,232,162,0.15)' }}>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Round</label>
                <select
                  value={form.interviewRound}
                  onChange={e => setForm(f => ({ ...f, interviewRound: e.target.value as SubStage }))}
                  style={{ ...inputStyle, cursor: 'pointer' }}
                >
                  {(['Round 1', 'Round 2', 'Round 3', 'Round 4+'] as SubStage[]).map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <div style={{ flex: 1.5 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--brand)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.interviewDate}
                  onChange={e => setForm(f => ({ ...f, interviewDate: e.target.value }))}
                  style={{ ...inputStyle }}
                  onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                  onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                />
              </div>
            </div>
          )}
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

// ─── Close Out Modal ──────────────────────────────────────────────────────────
function CloseOutModal({
  app, onConfirm, onCancel
}: {
  app: Application
  onConfirm: (updates: Partial<Application>) => void
  onCancel: () => void
}) {
  const safeStage: MainStage = app.stage === 'Closed' ? 'Screening' : app.stage
  const [closeType, setCloseType] = useState<'rejected' | 'ghosted' | 'withdrew'>('rejected')
  const [stageReached, setStageReached] = useState<MainStage>(safeStage)
  const [rejRound, setRejRound] = useState<SubStage>('Rejected — Application')
  const [withdrawReason, setWithdrawReason] = useState('')
  const [note, setNote] = useState('')

  const stageToRejection: Partial<Record<MainStage, SubStage>> = {
    'Applied':      'Rejected — Application',
    'Screening':    'Rejected — After Screening',
    'Assessment':   'Rejected — After Screening',
    'Interviewing': 'Rejected — After Round 1',
    'Deciding':     'Rejected — After Round 2',
    'Offer':        'Rejected — Offer Stage',
  }
  useEffect(() => {
    setRejRound(stageToRejection[stageReached] ?? 'Rejected — Application')
  }, [stageReached])

  function handleConfirm() {
    let subStage: SubStage
    if (closeType === 'ghosted') subStage = 'Ghosted'
    else if (closeType === 'withdrew') subStage = 'Withdrew'
    else subStage = rejRound
    onConfirm({
      stage: 'Closed', subStage,
      notes: note ? (app.notes ? app.notes + '\n\n[Close-out] ' + note : '[Close-out] ' + note) : app.notes,
      history: [...app.history, createHistoryEntry(
        `Closed · ${closeType === 'ghosted' ? 'Ghosted' : closeType === 'withdrew' ? 'Withdrew' : 'Rejected'}`,
        `Stage: ${stageReached}${note ? ' · ' + note : ''}`, 'Archive'
      )],
    })
  }

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box', cursor: 'pointer',
  }
  const stageOptions: MainStage[] = ['Applied', 'Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer']
  const rejStages: { value: SubStage; label: string }[] = [
    { value: 'Rejected — Application',      label: 'Before any contact (email rejection)' },
    { value: 'Rejected — After Screening',  label: 'After Recruiter / Phone Screen' },
    { value: 'Rejected — After Round 1',    label: 'After Round 1' },
    { value: 'Rejected — After Round 2',    label: 'After Round 2' },
    { value: 'Rejected — Final Round',      label: 'After Final Round' },
    { value: 'Rejected — Offer Stage',      label: 'At Offer Stage' },
  ]
  const withdrawReasons = [
    'Compensation too low', 'Accepted another offer', 'Declined an offer I received',
    'No longer interested — role fit', 'No longer interested — company fit',
    'Personal reasons', 'Other',
  ]
  const canConfirm = closeType !== 'withdrew' || !!withdrawReason

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onCancel() }}
    >
      <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 480, position: 'relative' }}
      >
        <button onClick={onCancel} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
          <X size={18} />
        </button>
        <div style={{ marginBottom: 20 }}>
          <div style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)' }}>Close Out Application</div>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 4 }}>{app.company}{app.role ? ` · ${app.role}` : ''}</div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          {/* Stage reached */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Stage reached</label>
            <select value={stageReached} onChange={e => setStageReached(e.target.value as MainStage)} style={inp}>
              {stageOptions.map(s => <option key={s} value={s}>{STAGE_CONFIG[s].label}</option>)}
            </select>
          </div>

          {/* Reason type */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 8, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Reason</label>
            <div style={{ display: 'flex', gap: 8 }}>
              {([
                { id: 'rejected', label: 'Rejected',  color: 'var(--danger)' },
                { id: 'ghosted',  label: 'Ghosted',   color: 'var(--warning)' },
                { id: 'withdrew', label: 'Withdrew',  color: 'var(--text-soft)' },
              ] as const).map(t => (
                <button key={t.id} onClick={() => setCloseType(t.id)}
                  style={{
                    flex: 1, padding: '9px 0', borderRadius: 8,
                    border: closeType === t.id ? `1px solid ${t.color}60` : '1px solid var(--border)',
                    background: closeType === t.id ? `${t.color}15` : 'transparent',
                    color: closeType === t.id ? t.color : 'var(--muted)',
                    fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)', transition: 'all 0.15s',
                  }}
                >{t.label}</button>
              ))}
            </div>
          </div>

          {/* Rejection sub-stage */}
          {closeType === 'rejected' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Rejected at</label>
              <select value={rejRound} onChange={e => setRejRound(e.target.value as SubStage)} style={inp}>
                {rejStages.map(r => <option key={r.value} value={r.value}>{r.label}</option>)}
              </select>
            </div>
          )}

          {/* Ghosted note */}
          {closeType === 'ghosted' && (
            <div style={{ background: 'rgba(251,146,60,0.08)', border: '1px solid rgba(251,146,60,0.2)', borderRadius: 8, padding: '12px 14px', fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.5 }}>
              They never replied. <strong style={{ color: 'var(--warning)' }}>Ghosted</strong> gets tracked separately — it's a pattern worth knowing about.
            </div>
          )}

          {/* Withdrew reason */}
          {closeType === 'withdrew' && (
            <div>
              <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Why did you withdraw?</label>
              <select value={withdrawReason} onChange={e => setWithdrawReason(e.target.value)} style={inp}>
                <option value="">Select a reason...</option>
                {withdrawReasons.map(r => <option key={r} value={r}>{r}</option>)}
              </select>
            </div>
          )}

          {/* Note */}
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Note (optional)</label>
            <textarea value={note} onChange={e => setNote(e.target.value)} placeholder="Any context about this close-out..." rows={2}
              style={{ ...inp, resize: 'none', cursor: 'text' }} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 24 }}>
          <button onClick={onCancel}
            style={{ flex: 1, padding: '10px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >Cancel</button>
          <button onClick={handleConfirm} disabled={!canConfirm}
            style={{ flex: 2, padding: '10px', borderRadius: 8, border: 'none', background: canConfirm ? 'var(--danger)' : 'var(--border)', color: canConfirm ? '#fff' : 'var(--muted)', fontSize: 13, fontWeight: 700, cursor: canConfirm ? 'pointer' : 'default', fontFamily: 'var(--font-body)' }}
          >Close Out Application</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Interview Setup Modal ─────────────────────────────────────────────────────
function InterviewSetupModal({
  companyName, onConfirm, onSkip
}: {
  companyName: string
  onConfirm: (interviewDate: string, round: SubStage) => void
  onSkip: () => void
}) {
  const [date, setDate] = useState('')
  const [round, setRound] = useState<SubStage>('Round 1')

  const inp: React.CSSProperties = {
    width: '100%', padding: '9px 12px', borderRadius: 7, border: '1px solid var(--border)',
    background: 'var(--surface-2)', color: 'var(--text)', fontFamily: 'var(--font-body)',
    fontSize: 13, outline: 'none', boxSizing: 'border-box',
  }
  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
      style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 1100, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 24 }}
      onClick={e => { if (e.target === e.currentTarget) onSkip() }}
    >
      <motion.div initial={{ scale: 0.96, y: 12 }} animate={{ scale: 1, y: 0 }}
        style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 14, padding: 28, width: '100%', maxWidth: 380, position: 'relative' }}
      >
        <button onClick={onSkip} style={{ position: 'absolute', top: 14, right: 14, background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}>
          <X size={18} />
        </button>
        <div style={{ fontFamily: 'var(--font-display)', fontSize: 16, fontWeight: 700, color: 'var(--text)', marginBottom: 4 }}>Interview Details</div>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 20 }}>{companyName} — moving to Interviewing</div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Round</label>
            <select value={round} onChange={e => setRound(e.target.value as SubStage)} style={{ ...inp, cursor: 'pointer' }}>
              {(['Round 1', 'Round 2', 'Round 3', 'Round 4+'] as SubStage[]).map(r => <option key={r} value={r}>{r}</option>)}
            </select>
          </div>
          <div>
            <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', display: 'block', marginBottom: 6, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview Date & Time</label>
            <input type="datetime-local" value={date} onChange={e => setDate(e.target.value)} style={inp} />
          </div>
        </div>

        <div style={{ display: 'flex', gap: 10, marginTop: 22 }}>
          <button onClick={onSkip}
            style={{ flex: 1, padding: '9px', borderRadius: 8, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 13, fontWeight: 500, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >Skip for now</button>
          <button onClick={() => onConfirm(date, round)}
            style={{ flex: 2, padding: '9px', borderRadius: 8, border: 'none', background: 'var(--brand)', color: '#08090D', fontSize: 13, fontWeight: 700, cursor: 'pointer', fontFamily: 'var(--font-body)' }}
          >Save & Continue</button>
        </div>
      </motion.div>
    </motion.div>
  )
}

// ─── Tracker View ──────────────────────────────────────────────────────────────
function TrackerView({
  applications, onUpdate, onSelect, onQuickAdd
}: {
  applications: Application[]
  onUpdate: (apps: Application[]) => void
  onSelect: (id: number) => void
  onQuickAdd: () => void
}) {
  const [search, setSearch] = useState('')
  const [stageFilter, setStageFilter] = useState<MainStage | 'all'>('all')
  const [sortField, setSortField] = useState<'company' | 'stage' | 'appliedOn' | 'salary'>('appliedOn')
  const [sortDir, setSortDir] = useState<'asc' | 'desc'>('desc')
  const [closeOutApp, setCloseOutApp] = useState<Application | null>(null)
  const [interviewSetup, setInterviewSetup] = useState<{ appId: number; company: string } | null>(null)

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
    const app = applications.find(a => a.id === id)
    const updated = applications.map(a => a.id === id ? { ...a, stage, subStage } : a)
    onUpdate(updated)
    // Prompt for interview details when first moving to Interviewing
    if (stage === 'Interviewing' && app?.stage !== 'Interviewing') {
      setInterviewSetup({ appId: id, company: app?.company ?? '' })
    }
  }

  function handleCloseOut(updates: Partial<Application>) {
    const updated = applications.map(a => a.id === closeOutApp!.id ? { ...a, ...updates } : a)
    onUpdate(updated)
    setCloseOutApp(null)
  }

  function handleInterviewSetup(interviewDate: string, round: SubStage) {
    const updated = applications.map(a =>
      a.id === interviewSetup!.appId ? { ...a, interviewDate, subStage: round } : a
    )
    onUpdate(updated)
    setInterviewSetup(null)
  }

  const SortIcon = ({ field }: { field: typeof sortField }) =>
    sortField === field
      ? (sortDir === 'asc' ? <ChevronUp size={11} /> : <ChevronDown size={11} />)
      : null

  return (
    <div style={{ padding: '28px 32px' }}>
      {/* Header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16, marginBottom: 20 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Active
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {inPlay.length} active application{inPlay.length !== 1 ? 's' : ''} in your pipeline
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
          <Plus size={14} /> Add Position
        </button>
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
          gridTemplateColumns: '2fr 1.4fr 1.4fr 0.8fr 0.8fr 0.6fr 80px',
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
            { label: '', field: null },
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
                gridTemplateColumns: '2fr 1.4fr 1.4fr 0.8fr 0.8fr 0.6fr 80px',
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
              {/* Close Out button */}
              <div onClick={e => e.stopPropagation()} style={{ display: 'flex', justifyContent: 'flex-end' }}>
                <button
                  onClick={() => setCloseOutApp(app)}
                  style={{
                    padding: '4px 9px', borderRadius: 6,
                    border: '1px solid rgba(248,113,113,0.35)',
                    background: 'rgba(248,113,113,0.08)',
                    color: 'var(--danger)', fontSize: 11, fontWeight: 600,
                    cursor: 'pointer', fontFamily: 'var(--font-body)',
                    display: 'flex', alignItems: 'center', gap: 3,
                  }}
                >
                  <X size={10} /> Close
                </button>
              </div>
            </motion.div>
          ))
        )}
      </div>

      {/* Close Out Modal */}
      <AnimatePresence>
        {closeOutApp && (
          <CloseOutModal
            app={closeOutApp}
            onConfirm={handleCloseOut}
            onCancel={() => setCloseOutApp(null)}
          />
        )}
      </AnimatePresence>

      {/* Interview Setup Modal */}
      <AnimatePresence>
        {interviewSetup && (
          <InterviewSetupModal
            companyName={interviewSetup.company}
            onConfirm={handleInterviewSetup}
            onSkip={() => setInterviewSetup(null)}
          />
        )}
      </AnimatePresence>
    </div>
  )
}

// ─── Applied View (staging tier) ──────────────────────────────────────────────
// ─── Inbox (3-Bucket Triage) ──────────────────────────────────────────────────
function InboxView({
  queue, applications, onQueueUpdate, onPromote, onQuickAdd, onSelect
}: {
  queue: QueuedApp[]
  applications: Application[]
  onQueueUpdate: (q: QueuedApp[]) => void
  onPromote: (qId: number) => void
  onQuickAdd: () => void
  onSelect: (id: number) => void
}) {
  // Funnel counts (all-time totals for top bar)
  const totalSubmitted = applications.length
  const totalNextSteps = queue.filter(q =>
    ['interview', 'assessment', 'next_steps', 'offer'].includes(q.emailType)
  ).length
  const totalActive = applications.filter(a => IN_PLAY_STAGES.includes(a.stage)).length
  const totalClosed = applications.filter(a => a.stage === 'Closed').length

  // Bucket lists (what's currently actionable)
  const submittedApps = applications.filter(a => a.stage === 'Applied')
  const nextStepsItems = queue.filter(q =>
    ['interview', 'assessment', 'next_steps', 'offer'].includes(q.emailType) &&
    q.status === 'pending'
  )
  const declinedItems = queue.filter(q =>
    q.emailType === 'rejection' && q.status !== 'dismissed'
  )

  // Tab selection
  const [tab, setTab] = useState<'submitted' | 'next-steps' | 'declined'>('submitted')

  // Add-form visibility
  const [showAddNextSteps, setShowAddNextSteps] = useState(false)
  const [showAddDeclined, setShowAddDeclined] = useState(false)

  // Next Steps form fields
  const [nsCompany, setNsCompany] = useState('')
  const [nsRole, setNsRole] = useState('')
  const [nsType, setNsType] = useState<EmailType>('next_steps')
  const [nsContactName, setNsContactName] = useState('')
  const [nsContactEmail, setNsContactEmail] = useState('')

  // Declined form fields
  const [dcCompany, setDcCompany] = useState('')
  const [dcRole, setDcRole] = useState('')

  function submitNextSteps() {
    if (!nsCompany.trim()) return
    const item: QueuedApp = {
      id: Date.now(),
      company: nsCompany.trim(),
      role: nsRole.trim(),
      source: 'manual',
      emailType: nsType,
      snippet: '',
      receivedOn: getTodayIso(),
      status: 'pending',
      contactName: nsContactName.trim() || undefined,
      contactEmail: nsContactEmail.trim() || undefined,
    }
    onQueueUpdate([...queue, item])
    setShowAddNextSteps(false)
    setNsCompany(''); setNsRole(''); setNsContactName(''); setNsContactEmail('')
    setNsType('next_steps')
  }

  function submitDeclined() {
    if (!dcCompany.trim()) return
    const item: QueuedApp = {
      id: Date.now(),
      company: dcCompany.trim(),
      role: dcRole.trim(),
      source: 'manual',
      emailType: 'rejection',
      snippet: 'Pre-interview rejection',
      receivedOn: getTodayIso(),
      status: 'pending',
    }
    onQueueUpdate([...queue, item])
    setShowAddDeclined(false)
    setDcCompany(''); setDcRole('')
  }

  function dismissItem(id: number) {
    onQueueUpdate(queue.map(q => q.id === id ? { ...q, status: 'dismissed' } : q))
  }

  const emailTypeLabel: Record<string, string> = {
    interview: 'Interview Invite',
    assessment: 'Assessment',
    next_steps: 'Next Steps',
    offer: 'Offer',
  }

  const inputSt: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }

  function SectionHeader({
    label, count, color, description, onAdd,
  }: { label: string; count: number; color: string; description: string; onAdd: () => void }) {
    return (
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 14, fontWeight: 700, color, letterSpacing: '-0.01em' }}>
              {label}
            </span>
            <span style={{ background: `${color}25`, color, fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99 }}>
              {count}
            </span>
          </div>
          <div style={{ fontSize: 12, color: 'var(--muted)' }}>{description}</div>
        </div>
        <button
          onClick={onAdd}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            padding: '6px 12px', borderRadius: 7, border: '1px solid var(--border)',
            background: 'transparent', color: 'var(--text-soft)',
            fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 600, cursor: 'pointer',
            flexShrink: 0,
          }}
        >
          <Plus size={12} /> Add
        </button>
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 880 }}>
      {/* Page header */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Inbox
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            Your full application pipeline — from first send to active pursuit
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
          <Plus size={14} /> Log Application
        </button>
      </div>

      {/* Funnel bar */}
      <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderRadius: 12, padding: '18px 24px', marginBottom: 24,
        display: 'flex', alignItems: 'center',
      }}>
        {([
          { label: 'Submitted', value: totalSubmitted, color: 'var(--blue)' },
          { label: 'Next Steps', value: totalNextSteps, color: 'var(--gold)' },
          { label: 'Active', value: totalActive, color: 'var(--brand)' },
          { label: 'Closed', value: totalClosed, color: 'var(--muted)' },
        ] as const).map((item, i, arr) => (
          <React.Fragment key={item.label}>
            <div style={{ flex: 1, textAlign: 'center' }}>
              <div style={{
                fontFamily: 'var(--font-display)', fontSize: 28, fontWeight: 700,
                color: item.color, letterSpacing: '-0.04em', lineHeight: 1,
              }}>
                {item.value}
              </div>
              <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 500, marginTop: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                {item.label}
              </div>
            </div>
            {i < arr.length - 1 && (
              <div style={{ fontSize: 18, color: 'rgba(255,255,255,0.12)', padding: '0 8px', flexShrink: 0 }}>→</div>
            )}
          </React.Fragment>
        ))}
      </div>

      {/* ── Tabs ── */}
      <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', marginBottom: 20 }}>
        {([
          { id: 'submitted',  label: 'Submitted',       count: submittedApps.length,  color: 'var(--blue)' },
          { id: 'next-steps', label: 'Next Steps',      count: nextStepsItems.length, color: 'var(--gold)' },
          { id: 'declined',   label: 'Declined',        count: declinedItems.length,  color: 'var(--danger)' },
        ] as const).map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            style={{
              padding: '10px 20px', border: 'none', background: 'transparent',
              borderBottom: tab === t.id ? `2px solid ${t.color}` : '2px solid transparent',
              color: tab === t.id ? t.color : 'var(--muted)',
              fontSize: 13, fontWeight: tab === t.id ? 700 : 400,
              cursor: 'pointer', fontFamily: 'var(--font-body)',
              display: 'flex', alignItems: 'center', gap: 7,
              transition: 'all 0.15s', marginBottom: -1,
            }}
          >
            {t.label}
            <span style={{
              background: tab === t.id ? `${t.color}25` : 'rgba(255,255,255,0.06)',
              color: tab === t.id ? t.color : 'var(--muted)',
              fontSize: 10, fontWeight: 700, padding: '1px 6px', borderRadius: 99,
            }}>{t.count}</span>
          </button>
        ))}
      </div>

      {/* ── SUBMITTED tab ── */}
      {tab === 'submitted' && <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--blue)', borderRadius: 12,
        padding: '20px 20px',
      }}>
        <SectionHeader
          label="Submitted"
          count={submittedApps.length}
          color="var(--blue)"
          description="Applications awaiting a response. Log one every time you apply."
          onAdd={onQuickAdd}
        />
        {submittedApps.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No applications waiting for a response yet.
          </div>
        ) : (
          <div>
            {submittedApps.map((app, i) => (
              <motion.div
                key={app.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: i * 0.02 }}
                onClick={() => onSelect(app.id)}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 0', cursor: 'pointer',
                  borderBottom: i < submittedApps.length - 1 ? '1px solid var(--border)' : 'none',
                }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.01)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{app.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {app.role || '—'} · {app.source} · {formatDate(app.appliedOn)}
                  </div>
                </div>
                {app.salary && (
                  <div style={{ fontSize: 12, color: 'var(--brand)', fontWeight: 500 }}>{app.salary}</div>
                )}
                <div style={{ fontSize: 11, color: 'var(--muted)' }}>{formatDateShort(app.appliedOn)}</div>
              </motion.div>
            ))}
          </div>
        )}
      </div>}

      {/* ── NEXT STEPS tab ── */}
      {tab === 'next-steps' && <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--gold)', borderRadius: 12,
        padding: '20px 20px',
      }}>
        <SectionHeader
          label="Next Steps"
          count={nextStepsItems.length}
          color="var(--gold)"
          description="Companies that responded with interest. Review and decide whether to pursue."
          onAdd={() => setShowAddNextSteps(v => !v)}
        />

        {/* Inline add form */}
        <AnimatePresence>
          {showAddNextSteps && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: 'var(--surface-2)', borderRadius: 10, padding: '16px',
                marginBottom: 16, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--gold)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Log Next Steps
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 8 }}>
                  <input placeholder="Company *" value={nsCompany} onChange={e => setNsCompany(e.target.value)} style={inputSt} />
                  <input placeholder="Role" value={nsRole} onChange={e => setNsRole(e.target.value)} style={inputSt} />
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <select value={nsType} onChange={e => setNsType(e.target.value as EmailType)} style={{ ...inputSt, cursor: 'pointer' }}>
                    <option value="next_steps">General Next Steps</option>
                    <option value="interview">Interview Invite</option>
                    <option value="assessment">Assessment</option>
                    <option value="offer">Offer</option>
                  </select>
                  <input placeholder="Contact name (optional)" value={nsContactName} onChange={e => setNsContactName(e.target.value)} style={inputSt} />
                  <input placeholder="Contact email (optional)" value={nsContactEmail} onChange={e => setNsContactEmail(e.target.value)} style={inputSt} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={submitNextSteps}
                    disabled={!nsCompany.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 7, border: 'none',
                      background: nsCompany.trim() ? 'var(--gold)' : 'var(--border)',
                      color: nsCompany.trim() ? '#08090D' : 'var(--muted)',
                      fontSize: 12, fontWeight: 700, cursor: nsCompany.trim() ? 'pointer' : 'default',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Add
                  </button>
                  <button
                    onClick={() => { setShowAddNextSteps(false); setNsCompany(''); setNsRole('') }}
                    style={{
                      padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {nextStepsItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No pending next steps. When a company responds with interest, log it here.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {nextStepsItems.map(item => (
              <motion.div
                key={item.id}
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                style={{
                  background: 'var(--surface-2)', borderRadius: 10, padding: '14px 16px',
                  border: '1px solid var(--border)',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{item.company}</span>
                    <span style={{
                      fontSize: 10, fontWeight: 700, padding: '2px 7px', borderRadius: 99,
                      background: 'rgba(251,191,36,0.15)', color: 'var(--gold)',
                    }}>
                      {emailTypeLabel[item.emailType] ?? item.emailType}
                    </span>
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {item.role || 'Role TBD'} · {formatDate(item.receivedOn)}
                  </div>
                  {(item.contactName || item.contactEmail) && (
                    <div style={{ fontSize: 11, color: 'var(--text-soft)', marginTop: 4 }}>
                      {[item.contactName, item.contactEmail].filter(Boolean).join(' · ')}
                    </div>
                  )}
                  {item.snippet && item.snippet !== 'Pre-interview rejection' && (
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {item.snippet}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                  <button
                    onClick={() => onPromote(item.id)}
                    style={{
                      padding: '7px 14px', borderRadius: 7, border: 'none',
                      background: 'var(--brand)', color: '#08090D',
                      fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
                    }}
                  >
                    Move to Active →
                  </button>
                  <button
                    onClick={() => dismissItem(item.id)}
                    style={{
                      padding: '7px 12px', borderRadius: 7,
                      border: '1px solid var(--border)', background: 'transparent',
                      color: 'var(--muted)', fontSize: 12, cursor: 'pointer',
                      fontFamily: 'var(--font-body)', fontWeight: 500,
                    }}
                  >
                    Not Interested
                  </button>
                </div>
              </motion.div>
            ))}
          </div>
        )}
      </div>}

      {/* ── DECLINED tab ── */}
      {tab === 'declined' && <div style={{
        background: 'var(--surface)', border: '1px solid var(--border)',
        borderLeft: '3px solid var(--danger)', borderRadius: 12,
        padding: '20px 20px',
      }}>
        <SectionHeader
          label="Pre-Interview Declines"
          count={declinedItems.length}
          color="var(--danger)"
          description="Rejected before any screening or interview. Part of the process — keep going."
          onAdd={() => setShowAddDeclined(v => !v)}
        />

        <AnimatePresence>
          {showAddDeclined && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              style={{ overflow: 'hidden' }}
            >
              <div style={{
                background: 'var(--surface-2)', borderRadius: 10, padding: '16px',
                marginBottom: 16, border: '1px solid var(--border)',
              }}>
                <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--danger)', marginBottom: 12, textTransform: 'uppercase', letterSpacing: '0.08em' }}>
                  Log Rejection
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
                  <input placeholder="Company *" value={dcCompany} onChange={e => setDcCompany(e.target.value)} style={inputSt} />
                  <input placeholder="Role" value={dcRole} onChange={e => setDcRole(e.target.value)} style={inputSt} />
                </div>
                <div style={{ display: 'flex', gap: 8 }}>
                  <button
                    onClick={submitDeclined}
                    disabled={!dcCompany.trim()}
                    style={{
                      padding: '7px 16px', borderRadius: 7, border: 'none',
                      background: dcCompany.trim() ? 'var(--danger)' : 'var(--border)',
                      color: dcCompany.trim() ? '#fff' : 'var(--muted)',
                      fontSize: 12, fontWeight: 700, cursor: dcCompany.trim() ? 'pointer' : 'default',
                      fontFamily: 'var(--font-body)',
                    }}
                  >
                    Log
                  </button>
                  <button
                    onClick={() => { setShowAddDeclined(false); setDcCompany(''); setDcRole('') }}
                    style={{
                      padding: '7px 14px', borderRadius: 7, border: '1px solid var(--border)',
                      background: 'transparent', color: 'var(--muted)',
                      fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {declinedItems.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '20px 0', color: 'var(--muted)', fontSize: 13 }}>
            No pre-interview rejections logged.
          </div>
        ) : (
          <div>
            {declinedItems.map((item, i) => (
              <div
                key={item.id}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  padding: '10px 0',
                  borderBottom: i < declinedItems.length - 1 ? '1px solid var(--border)' : 'none',
                }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)' }}>{item.company}</div>
                  <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 1 }}>
                    {item.role || '—'} · {formatDate(item.receivedOn)}
                  </div>
                </div>
                <button
                  onClick={() => dismissItem(item.id)}
                  style={{
                    padding: '4px 10px', borderRadius: 6, border: '1px solid var(--border)',
                    background: 'transparent', color: 'var(--muted)',
                    fontSize: 11, cursor: 'pointer', fontFamily: 'var(--font-body)',
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        )}
      </div>}
    </div>
  )
}

// ─── Pipeline (Kanban) View ────────────────────────────────────────────────────
function PipelineView({
  applications, onSelect
}: {
  applications: Application[]
  onSelect: (id: number) => void
}) {
  const inPlay = applications.filter(a => IN_PLAY_STAGES.includes(a.stage))

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Pipeline
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {inPlay.length} active application{inPlay.length !== 1 ? 's' : ''} in play
          </div>
        </div>
        {/* Stage summary chips — quick count per stage */}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          {IN_PLAY_STAGES.map(stage => {
            const count = applications.filter(a => a.stage === stage).length
            const cfg = STAGE_CONFIG[stage]
            return (
              <div key={stage} style={{
                padding: '4px 10px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                background: count > 0 ? cfg.bg : 'rgba(255,255,255,0.03)',
                color: count > 0 ? cfg.color : 'var(--muted)',
                border: `1px solid ${count > 0 ? cfg.color + '30' : 'var(--border)'}`,
              }}>
                {cfg.label} {count > 0 && <span style={{ fontWeight: 700 }}>{count}</span>}
              </div>
            )
          })}
        </div>
      </div>

      {/* Scrollable kanban — fade on right edge hints there's more */}
      <div style={{ position: 'relative' }}>
        <div style={{ display: 'flex', gap: 14, overflowX: 'auto', paddingBottom: 16, paddingRight: 32 }}>
        {IN_PLAY_STAGES.map(stage => {
          const cfg = STAGE_CONFIG[stage]
          const cols = applications.filter(a => a.stage === stage)
          return (
            <div key={stage} style={{ minWidth: 240, flex: '0 0 240px' }}>
              {/* Column header */}
              <div style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px', marginBottom: 10,
                background: cfg.bg, borderRadius: 8,
                border: `1px solid ${cfg.color}30`,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: cfg.color, textTransform: 'uppercase', letterSpacing: '0.07em' }}>
                  {cfg.label}
                </span>
                <span style={{
                  fontSize: 11, fontWeight: 700,
                  background: cfg.color, color: '#08090D',
                  padding: '1px 7px', borderRadius: 99,
                }}>
                  {cols.length}
                </span>
              </div>

              {/* Cards */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {cols.length === 0 && (
                  <div style={{
                    padding: '20px 12px', textAlign: 'center',
                    border: '1px dashed var(--border)', borderRadius: 8,
                    color: 'var(--muted)', fontSize: 12,
                  }}>
                    None here
                  </div>
                )}
                {cols.map(app => (
                  <motion.div
                    key={app.id}
                    layoutId={`card-${app.id}`}
                    whileHover={{ y: -2, boxShadow: `0 4px 20px rgba(0,0,0,0.3), 0 0 0 1px ${cfg.color}20` }}
                    onClick={() => onSelect(app.id)}
                    style={{
                      background: 'var(--surface)',
                      border: '1px solid var(--border)',
                      borderRadius: 10, padding: '12px 14px',
                      cursor: 'pointer',
                      transition: 'border-color 0.15s',
                    }}
                  >
                    <div style={{ fontWeight: 600, fontSize: 13, color: 'var(--text)', marginBottom: 3 }}>
                      {app.company}
                    </div>
                    <div style={{ fontSize: 11, color: 'var(--muted)', marginBottom: 8, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {app.role || '—'}
                    </div>
                    {app.subStage && (
                      <div style={{ fontSize: 10, color: cfg.color, fontWeight: 600, marginBottom: 6 }}>
                        {app.subStage}
                      </div>
                    )}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      {app.salary ? (
                        <span style={{ fontSize: 11, color: 'var(--brand)', fontWeight: 500 }}>{app.salary}</span>
                      ) : <span />}
                      <span style={{
                        fontSize: 10, fontWeight: 700,
                        padding: '2px 7px', borderRadius: 99,
                        background: app.priority === 'High' ? 'var(--danger-dim)' : app.priority === 'Medium' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.05)',
                        color: app.priority === 'High' ? 'var(--danger)' : app.priority === 'Medium' ? 'var(--gold)' : 'var(--muted)',
                      }}>
                        {app.priority}
                      </span>
                    </div>
                    {app.interviewDate && (
                      <div style={{ marginTop: 8, paddingTop: 8, borderTop: '1px solid var(--border)', fontSize: 11, color: 'var(--muted)', display: 'flex', alignItems: 'center', gap: 4 }}>
                        <CalendarDays size={10} />
                        {formatDate(app.interviewDate.slice(0, 10))}
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
            </div>
          )
        })}
        </div>
        {/* Right-edge fade gradient — hints there are more columns */}
        <div style={{
          position: 'absolute', top: 0, right: 0, bottom: 16, width: 48,
          background: 'linear-gradient(to right, transparent, var(--bg))',
          pointerEvents: 'none',
        }} />
      </div>
    </div>
  )
}

// ─── Tasks View ────────────────────────────────────────────────────────────────
function TasksView({
  tasks, applications, onTasksUpdate, onSelectApp
}: {
  tasks: Task[]
  applications: Application[]
  onTasksUpdate: (t: Task[]) => void
  onSelectApp: (id: number) => void
}) {
  const today = getTodayIso()
  const [showAdd, setShowAdd] = useState(false)
  const [showDone, setShowDone] = useState(false)
  const [addTitle, setAddTitle] = useState('')
  const [addDue, setAddDue] = useState('')
  const [addLinkedApp, setAddLinkedApp] = useState<number | ''>('')
  const [addNote, setAddNote] = useState('')

  const activeTasks = tasks.filter(t => !t.done)
  const overdue   = activeTasks.filter(t => t.dueDate && t.dueDate < today)
    .sort((a, b) => (a.dueDate ?? '').localeCompare(b.dueDate ?? ''))
  const dueToday  = activeTasks.filter(t => t.dueDate === today)
  const upcoming  = activeTasks.filter(t => !t.dueDate || t.dueDate > today)
    .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999'))
  const doneTasks = tasks.filter(t => t.done)
    .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''))
  const urgentList = [...overdue, ...dueToday]

  function toggle(id: number) {
    onTasksUpdate(tasks.map(t => t.id === id
      ? { ...t, done: !t.done, completedAt: !t.done ? today : undefined }
      : t
    ))
  }
  function remove(id: number) {
    onTasksUpdate(tasks.filter(t => t.id !== id))
  }
  function submitAdd() {
    if (!addTitle.trim()) return
    const task: Task = {
      id: Date.now(),
      title: addTitle.trim(),
      dueDate: addDue || undefined,
      linkedAppId: addLinkedApp ? Number(addLinkedApp) : undefined,
      done: false, autoGenerated: false, createdAt: today,
      note: addNote.trim() || undefined,
    }
    onTasksUpdate([task, ...tasks])
    setAddTitle(''); setAddDue(''); setAddLinkedApp(''); setAddNote('')
    setShowAdd(false)
  }
  function getApp(id?: number) { return id ? applications.find(a => a.id === id) : undefined }
  const activeApps = applications.filter(a => a.stage !== 'Closed')

  const inp: React.CSSProperties = {
    width: '100%', padding: '8px 12px', borderRadius: 7,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontFamily: 'var(--font-body)', fontSize: 13,
    outline: 'none', boxSizing: 'border-box',
  }

  function TaskRow({ task }: { task: Task }) {
    const isOver = !!(task.dueDate && task.dueDate < today)
    const isToday = task.dueDate === today
    const linked = getApp(task.linkedAppId)
    const dueLabelColor = isOver ? 'var(--danger)' : isToday ? 'var(--gold)' : 'var(--muted)'
    const dueLabel = isOver
      ? `Overdue ${Math.abs(daysAgo(task.dueDate!))}d`
      : isToday ? 'Due today'
      : task.dueDate ? formatDate(task.dueDate) : ''

    return (
      <div style={{
        display: 'flex', alignItems: 'center', gap: 12,
        padding: '11px 0', opacity: task.done ? 0.45 : 1, transition: 'opacity 0.2s',
        borderBottom: '1px solid var(--border)',
      }}>
        <button onClick={() => toggle(task.id)} style={{
          width: 18, height: 18, borderRadius: 4, flexShrink: 0, cursor: 'pointer',
          border: task.done ? 'none' : '1.5px solid rgba(255,255,255,0.2)',
          background: task.done ? 'var(--brand)' : 'transparent',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>
          {task.done && <Check size={11} color="#08090D" />}
        </button>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 6, flexWrap: 'wrap' }}>
            <span style={{
              fontSize: 13, fontWeight: task.done ? 400 : 500,
              color: task.done ? 'var(--muted)' : 'var(--text)',
              textDecoration: task.done ? 'line-through' : 'none',
            }}>{task.title}</span>
            {task.autoGenerated && (
              <span style={{ fontSize: 9, fontWeight: 700, padding: '1px 5px', borderRadius: 4, background: 'rgba(126,232,162,0.1)', color: 'var(--brand)', textTransform: 'uppercase', letterSpacing: '0.06em' }}>auto</span>
            )}
            {linked && (
              <button onClick={() => onSelectApp(linked.id)} style={{
                fontSize: 11, padding: '1px 7px', borderRadius: 99,
                background: 'var(--surface-2)', border: '1px solid var(--border)',
                color: 'var(--text-soft)', cursor: 'pointer', fontFamily: 'var(--font-body)',
              }}>{linked.company}</button>
            )}
          </div>
          {task.note && <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>{task.note}</div>}
        </div>
        {dueLabel && (
          <div style={{ fontSize: 11, color: dueLabelColor, fontWeight: isOver || isToday ? 600 : 400, flexShrink: 0, whiteSpace: 'nowrap' }}>
            {dueLabel}
          </div>
        )}
        {!task.autoGenerated && !task.done && (
          <button onClick={() => remove(task.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex', padding: 0, flexShrink: 0, opacity: 0.6 }}>
            <X size={13} />
          </button>
        )}
      </div>
    )
  }

  function SectionHead({ label, count }: { label: string; count: number }) {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 6px' }}>
        <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>{label}</span>
        <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>{count}</span>
        <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
      </div>
    )
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 740 }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>Tasks</h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {activeTasks.length} open · {doneTasks.length} completed
          </div>
        </div>
        <button onClick={() => setShowAdd(v => !v)} style={{
          display: 'flex', alignItems: 'center', gap: 8,
          padding: '9px 16px', borderRadius: 8, border: 'none',
          background: 'var(--brand)', color: '#08090D',
          fontSize: 13, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
        }}>
          <Plus size={14} /> Add Task
        </button>
      </div>

      {/* Add form */}
      <AnimatePresence>
        {showAdd && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden', marginBottom: 16 }}>
            <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '18px 20px' }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', marginBottom: 14, textTransform: 'uppercase', letterSpacing: '0.08em' }}>New Task</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                <input placeholder="What needs to get done? *" value={addTitle} onChange={e => setAddTitle(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') submitAdd() }} style={inp} autoFocus />
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Due date</label>
                    <input type="date" value={addDue} onChange={e => setAddDue(e.target.value)} style={inp} />
                  </div>
                  <div>
                    <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 4, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Linked Application</label>
                    <select value={addLinkedApp} onChange={e => setAddLinkedApp(e.target.value ? Number(e.target.value) : '')} style={{ ...inp, cursor: 'pointer' }}>
                      <option value="">None</option>
                      {activeApps.map(a => <option key={a.id} value={a.id}>{a.company}{a.role ? ` — ${a.role}` : ''}</option>)}
                    </select>
                  </div>
                </div>
                <input placeholder="Note (optional)" value={addNote} onChange={e => setAddNote(e.target.value)} style={inp} />
              </div>
              <div style={{ display: 'flex', gap: 8, marginTop: 14 }}>
                <button onClick={submitAdd} disabled={!addTitle.trim()} style={{
                  padding: '8px 16px', borderRadius: 7, border: 'none',
                  background: addTitle.trim() ? 'var(--brand)' : 'var(--border)',
                  color: addTitle.trim() ? '#08090D' : 'var(--muted)',
                  fontSize: 12, fontWeight: 700, cursor: addTitle.trim() ? 'pointer' : 'default', fontFamily: 'var(--font-body)',
                }}>Add Task</button>
                <button onClick={() => { setShowAdd(false); setAddTitle(''); setAddDue(''); setAddLinkedApp(''); setAddNote('') }} style={{
                  padding: '8px 14px', borderRadius: 7, border: '1px solid var(--border)',
                  background: 'transparent', color: 'var(--muted)', fontSize: 12, fontWeight: 600, cursor: 'pointer', fontFamily: 'var(--font-body)',
                }}>Cancel</button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Empty state */}
      {activeTasks.length === 0 && !showAdd && (
        <div style={{ textAlign: 'center', padding: '60px 0', border: '1px dashed var(--border)', borderRadius: 12 }}>
          <div style={{ fontSize: 14, color: 'var(--text-soft)', marginBottom: 6, fontFamily: 'var(--font-display)', fontWeight: 600 }}>No open tasks.</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add one manually or they'll appear automatically as your hunt progresses.</div>
        </div>
      )}

      {/* Today & Overdue */}
      {urgentList.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderLeft: '3px solid var(--danger)', borderRadius: 12, padding: '0 20px', marginBottom: 12 }}>
          <SectionHead label="Today & Overdue" count={urgentList.length} />
          {urgentList.map(t => <TaskRow key={t.id} task={t} />)}
          <div style={{ height: 6 }} />
        </div>
      )}

      {/* Upcoming */}
      {upcoming.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 20px', marginBottom: 12 }}>
          <SectionHead label="Upcoming" count={upcoming.length} />
          {upcoming.map(t => <TaskRow key={t.id} task={t} />)}
          <div style={{ height: 6 }} />
        </div>
      )}

      {/* Done — collapsed by default */}
      {doneTasks.length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '0 20px' }}>
          <div onClick={() => setShowDone(v => !v)} style={{ display: 'flex', alignItems: 'center', gap: 10, padding: '14px 0 6px', cursor: 'pointer' }}>
            <span style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Done</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '1px 7px', borderRadius: 99, background: 'rgba(255,255,255,0.05)', color: 'var(--muted)' }}>{doneTasks.length}</span>
            <div style={{ flex: 1, height: 1, background: 'var(--border)' }} />
            {showDone ? <ChevronUp size={13} color="var(--muted)" /> : <ChevronDown size={13} color="var(--muted)" />}
          </div>
          <AnimatePresence>
            {showDone && (
              <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }} style={{ overflow: 'hidden' }}>
                {doneTasks.slice(0, 30).map(t => <TaskRow key={t.id} task={t} />)}
                <div style={{ height: 6 }} />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      )}
    </div>
  )
}

// ─── Stats View ────────────────────────────────────────────────────────────────
function StatsView({
  applications, queue, huntSession
}: {
  applications: Application[]
  queue: QueuedApp[]
  huntSession: HuntSession | null
}) {
  const totalApplied = applications.length + queue.length
  const inPlay = applications.filter(a => IN_PLAY_STAGES.includes(a.stage)).length
  const interviewed = applications.filter(a =>
    ['Interviewing', 'Deciding', 'Offer', 'Closed'].includes(a.stage)
  ).length
  const offers = applications.filter(a => a.stage === 'Offer').length
  const closed = applications.filter(a => a.stage === 'Closed').length
  const gotScreening = applications.filter(a =>
    ['Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer', 'Closed'].includes(a.stage)
  ).length

  const pct = (n: number) => totalApplied > 0 ? Math.round((n / totalApplied) * 100) : 0
  const intPct = interviewed > 0 ? Math.round((offers / interviewed) * 100) : 0

  const metrics = [
    { label: 'Total Applied', value: totalApplied, color: 'var(--blue)' },
    { label: 'Got a Response', value: gotScreening, color: 'var(--purple)', sub: `${pct(gotScreening)}% of applied` },
    { label: 'Reached Interview', value: interviewed, color: 'var(--brand)', sub: `${pct(interviewed)}% of applied` },
    { label: 'Offers Received', value: offers, color: 'var(--gold)', sub: intPct > 0 ? `${intPct}% interview → offer` : undefined },
    { label: 'Currently Active', value: inPlay, color: 'var(--brand)' },
    { label: 'Closed', value: closed, color: 'var(--muted)' },
  ]

  // Funnel stages
  const funnelData = [
    { label: 'Applied', count: totalApplied, color: 'var(--blue)' },
    { label: 'Screening', count: applications.filter(a => a.stage === 'Screening').length + gotScreening, color: 'var(--purple)' },
    { label: 'Interviewing', count: interviewed, color: 'var(--brand)' },
    { label: 'Offer', count: offers, color: 'var(--gold)' },
  ]
  const maxFunnel = Math.max(totalApplied, 1)

  // Closed by reason
  const closedApps = applications.filter(a => a.stage === 'Closed')
  const reasonCounts: Record<string, number> = {}
  closedApps.forEach(a => {
    const r = a.subStage || 'Unspecified'
    reasonCounts[r] = (reasonCounts[r] ?? 0) + 1
  })

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Stats
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {huntSession ? `Hunt started ${formatDate(huntSession.startedAt)}` : 'All-time stats'}
        </div>
      </div>

      {/* Key metrics grid */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 28 }}>
        {metrics.map(m => (
          <div key={m.label} style={{
            background: 'var(--surface)', border: '1px solid var(--border)',
            borderRadius: 12, padding: '18px 20px',
          }}>
            <div style={{ fontSize: 11, color: 'var(--muted)', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
              {m.label}
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 32, fontWeight: 700, color: m.color, letterSpacing: '-0.04em', marginBottom: 4 }}>
              {m.value}
            </div>
            {m.sub && <div style={{ fontSize: 11, color: 'var(--muted)' }}>{m.sub}</div>}
          </div>
        ))}
      </div>

      {/* Funnel */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 20 }}>
          Application Funnel
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {funnelData.map((item, i) => {
            const pctWidth = Math.round((item.count / maxFunnel) * 100)
            return (
              <div key={item.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                  <span style={{ fontSize: 13, color: 'var(--text-soft)', fontWeight: 500 }}>{item.label}</span>
                  <span style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.count}</span>
                </div>
                <div style={{ height: 6, background: 'rgba(255,255,255,0.06)', borderRadius: 99, overflow: 'hidden' }}>
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${pctWidth}%` }}
                    transition={{ duration: 0.7, ease: 'easeOut', delay: i * 0.1 }}
                    style={{ height: '100%', background: item.color, borderRadius: 99 }}
                  />
                </div>
              </div>
            )
          })}
        </div>
      </div>

      {/* Response rate */}
      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px', marginBottom: 20 }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
          Key Conversion Rates
        </div>
        {[
          { label: 'Applied → Any Response', rate: pct(gotScreening), note: 'Resume effectiveness' },
          { label: 'Applied → Interview', rate: pct(interviewed), note: 'Market traction' },
          { label: 'Interview → Offer', rate: intPct, note: 'Interview performance' },
        ].map(({ label, rate, note }) => (
          <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 16, padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13, color: 'var(--text)' }}>{label}</div>
              <div style={{ fontSize: 11, color: 'var(--muted)' }}>{note}</div>
            </div>
            <div style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: rate >= 10 ? 'var(--brand)' : rate >= 5 ? 'var(--gold)' : 'var(--text-soft)', minWidth: 60, textAlign: 'right' }}>
              {rate}%
            </div>
          </div>
        ))}
      </div>

      {/* Rejection breakdown */}
      {Object.keys(reasonCounts).length > 0 && (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '20px 24px' }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: 12 }}>
            Closed By Reason
          </div>
          {Object.entries(reasonCounts).sort((a, b) => b[1] - a[1]).map(([reason, count]) => (
            <div key={reason} style={{ display: 'flex', alignItems: 'center', gap: 12, padding: '6px 0' }}>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', flex: 1 }}>{reason}</div>
              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--danger)', minWidth: 24, textAlign: 'right' }}>{count}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Rejection Center ──────────────────────────────────────────────────────────
function RejectionsView({
  applications, onSelect
}: {
  applications: Application[]
  onSelect: (id: number) => void
}) {
  const [filter, setFilter] = useState<'all' | 'near-miss' | 'ghosted' | 'early'>('all')

  const closed = applications.filter(a => a.stage === 'Closed')
  const nearMiss = closed.filter(a => ['Rejected — After Round 2', 'Rejected — Final Round', 'Rejected — Offer Stage'].includes(a.subStage ?? ''))
  const ghosted = closed.filter(a => a.subStage === 'Ghosted')
  const early = closed.filter(a => ['Rejected — Application', 'Rejected — After Screening', 'Rejected — After Round 1'].includes(a.subStage ?? ''))

  const filtered = filter === 'all' ? closed
    : filter === 'near-miss' ? nearMiss
    : filter === 'ghosted' ? ghosted
    : early

  const filterTabs = [
    { id: 'all' as const, label: 'All', count: closed.length },
    { id: 'near-miss' as const, label: 'Near Misses', count: nearMiss.length },
    { id: 'ghosted' as const, label: 'Ghosted', count: ghosted.length },
    { id: 'early' as const, label: 'Early Stage', count: early.length },
  ]

  return (
    <div style={{ padding: '28px 32px', maxWidth: 900 }}>
      <div style={{ marginBottom: 20 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Rejection Center
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {closed.length} closed application{closed.length !== 1 ? 's' : ''}
          {nearMiss.length > 0 && ` · ${nearMiss.length} near miss${nearMiss.length !== 1 ? 'es' : ''}`}
        </div>
      </div>

      {/* Summary chips */}
      <div style={{ display: 'flex', gap: 10, marginBottom: 20, flexWrap: 'wrap' }}>
        {[
          { label: 'Near Misses', value: nearMiss.length, color: 'var(--gold)', bg: 'var(--gold-dim)' },
          { label: 'Ghosted', value: ghosted.length, color: 'var(--muted)', bg: 'rgba(255,255,255,0.04)' },
          { label: 'Early Rejections', value: early.length, color: 'var(--danger)', bg: 'var(--danger-dim)' },
        ].map(chip => (
          <div key={chip.label} style={{
            padding: '8px 14px', borderRadius: 8,
            background: chip.bg, border: `1px solid ${chip.color}30`,
            display: 'flex', gap: 8, alignItems: 'center',
          }}>
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 700, fontSize: 18, color: chip.color }}>{chip.value}</span>
            <span style={{ fontSize: 12, color: 'var(--muted)' }}>{chip.label}</span>
          </div>
        ))}
      </div>

      {closed.length > 0 && (
        <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic', marginBottom: 20, padding: '10px 14px', background: 'var(--brand-dim)', borderRadius: 8, border: '1px solid rgba(126,232,162,0.1)' }}>
          💡 Every rejection gets you closer. Near misses mean your profile is competitive — keep refining.
        </div>
      )}

      {/* Filter tabs */}
      <div style={{ display: 'flex', gap: 6, marginBottom: 16 }}>
        {filterTabs.map(t => (
          <button
            key={t.id}
            onClick={() => setFilter(t.id)}
            style={{
              padding: '6px 14px', borderRadius: 99, fontSize: 12, fontWeight: 600,
              fontFamily: 'var(--font-body)', cursor: 'pointer',
              background: filter === t.id ? 'rgba(248,113,113,0.12)' : 'var(--surface)',
              color: filter === t.id ? 'var(--danger)' : 'var(--muted)',
              border: `1px solid ${filter === t.id ? 'rgba(248,113,113,0.3)' : 'var(--border)'}`,
            }}
          >
            {t.label} {t.count > 0 && `(${t.count})`}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="grid-bg" style={{ textAlign: 'center', padding: '60px 0', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Nothing here. Keep applying.</div>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {filtered.map((app, i) => {
            const isNearMiss = nearMiss.includes(app)
            return (
              <motion.div
                key={app.id}
                initial={{ opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.04 }}
                onClick={() => onSelect(app.id)}
                style={{
                  background: 'var(--surface)',
                  border: `1px solid ${isNearMiss ? 'rgba(251,191,36,0.2)' : 'var(--border)'}`,
                  borderLeft: isNearMiss ? '3px solid var(--gold)' : '3px solid transparent',
                  borderRadius: 10, padding: '14px 16px',
                  cursor: 'pointer',
                  display: 'flex', alignItems: 'center', gap: 14,
                }}
                whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              >
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
                    <span style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{app.company}</span>
                    {isNearMiss && (
                      <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--gold)', background: 'var(--gold-dim)', padding: '1px 7px', borderRadius: 99 }}>
                        Near Miss
                      </span>
                    )}
                  </div>
                  <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                    {app.role || '—'} · Applied {formatDate(app.appliedOn)}
                  </div>
                  {app.subStage && (
                    <div style={{ fontSize: 11, color: 'var(--danger)', marginTop: 3, fontWeight: 500 }}>
                      {app.subStage}
                    </div>
                  )}
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 4, flexShrink: 0 }}>
                  {app.salary && <span style={{ fontSize: 12, color: 'var(--text-soft)' }}>{app.salary}</span>}
                  {app.desireRank > 0 && (
                    <span style={{ fontSize: 11, color: 'var(--gold)' }}>{'★'.repeat(app.desireRank)}{'☆'.repeat(5 - app.desireRank)}</span>
                  )}
                </div>
                <ArrowRight size={14} color="var(--muted)" />
              </motion.div>
            )
          })}
        </div>
      )}
    </div>
  )
}

// ─── Interview Schedule ────────────────────────────────────────────────────────
function InterviewScheduleView({
  applications, onSelect
}: {
  applications: Application[]
  onSelect: (id: number) => void
}) {
  const withInterviews = applications
    .filter(a => a.interviewDate && a.stage !== 'Closed')
    .sort((a, b) => (a.interviewDate ?? '').localeCompare(b.interviewDate ?? ''))

  const upcoming = withInterviews.filter(a => (a.interviewDate ?? '') >= getTodayIso())
  const past = withInterviews.filter(a => (a.interviewDate ?? '') < getTodayIso())

  const prepColor = (status: string) => {
    if (status === 'Ready') return 'var(--brand)'
    if (status === 'Light prep') return 'var(--gold)'
    return 'var(--muted)'
  }

  const Row = ({ app, dim }: { app: Application; dim?: boolean }) => {
    const cfg = STAGE_CONFIG[app.stage]
    const daysOut = app.interviewDate ? daysUntil(app.interviewDate.slice(0, 10)) : null
    return (
      <motion.div
        initial={{ opacity: 0, y: 4 }}
        animate={{ opacity: 1, y: 0 }}
        whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
        onClick={() => onSelect(app.id)}
        style={{
          display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 80px',
          alignItems: 'center', gap: 16,
          padding: '12px 18px',
          borderBottom: '1px solid var(--border)',
          cursor: 'pointer', opacity: dim ? 0.5 : 1,
        }}
      >
        <div>
          <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{app.company}</div>
          <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 2 }}>{app.role || '—'}</div>
        </div>
        <div style={{ fontSize: 13, color: dim ? 'var(--muted)' : 'var(--text-soft)' }}>
          {app.interviewDate ? formatDateTime(app.interviewDate) : '—'}
          {daysOut !== null && daysOut >= 0 && !dim && (
            <div style={{ fontSize: 11, color: daysOut === 0 ? 'var(--danger)' : daysOut <= 2 ? 'var(--gold)' : 'var(--muted)', marginTop: 2 }}>
              {daysOut === 0 ? 'Today!' : daysOut === 1 ? 'Tomorrow' : `In ${daysOut} days`}
            </div>
          )}
        </div>
        <div style={{
          display: 'inline-flex', alignItems: 'center', gap: 6,
          padding: '4px 10px', borderRadius: 99,
          background: cfg.bg, border: `1px solid ${cfg.color}30`,
          fontSize: 11, fontWeight: 700, color: cfg.color,
        }}>
          {app.subStage || cfg.label}
        </div>
        <div style={{ fontSize: 12, color: prepColor(app.prepStatus || ''), fontWeight: 500 }}>
          {app.prepStatus || 'Not started'}
        </div>
        <ArrowRight size={14} color="var(--muted)" />
      </motion.div>
    )
  }

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Interview Schedule
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          {upcoming.length} upcoming · {past.length} past
        </div>
      </div>

      {withInterviews.length === 0 ? (
        <div className="grid-bg" style={{ textAlign: 'center', padding: '80px 0', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <CalendarDays size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, color: 'var(--text-soft)', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 600 }}>No interviews scheduled</div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>Add an interview date inside any application's prep tab.</div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          {/* Header */}
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 140px 120px 90px 80px',
            gap: 16, padding: '10px 18px',
            background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <span>Company</span>
            <span>Date & Time</span>
            <span>Stage</span>
            <span>Prep</span>
            <span />
          </div>

          {upcoming.length > 0 && (
            <>
              <div style={{ padding: '8px 18px', background: 'rgba(126,232,162,0.04)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--brand)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Upcoming
              </div>
              {upcoming.map(app => <Row key={app.id} app={app} />)}
            </>
          )}

          {past.length > 0 && (
            <>
              <div style={{ padding: '8px 18px', background: 'rgba(255,255,255,0.02)', borderBottom: '1px solid var(--border)', fontSize: 11, fontWeight: 700, color: 'var(--muted)', letterSpacing: '0.08em', textTransform: 'uppercase' }}>
                Past
              </div>
              {past.map(app => <Row key={app.id} app={app} dim />)}
            </>
          )}
        </div>
      )}
    </div>
  )
}

// ─── Archive View ──────────────────────────────────────────────────────────────
function ArchiveView({
  applications, onSelect
}: {
  applications: Application[]
  onSelect: (id: number) => void
}) {
  const [search, setSearch] = useState('')
  const closed = applications.filter(a => a.stage === 'Closed')
  const filtered = closed.filter(a =>
    !search || a.company.toLowerCase().includes(search.toLowerCase()) || (a.role || '').toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div style={{ padding: '28px 32px' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
            Archive
          </h1>
          <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
            {closed.length} closed application{closed.length !== 1 ? 's' : ''}
          </div>
        </div>
        <input
          placeholder="Search archive…"
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            padding: '8px 14px', borderRadius: 8, border: '1px solid var(--border)',
            background: 'var(--surface)', color: 'var(--text)', fontSize: 13,
            fontFamily: 'var(--font-body)', outline: 'none', width: 220,
          }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="grid-bg" style={{ textAlign: 'center', padding: '80px 0', borderRadius: 12, border: '1px dashed var(--border)' }}>
          <Archive size={32} color="var(--muted)" style={{ margin: '0 auto 12px' }} />
          <div style={{ fontSize: 16, color: 'var(--text-soft)', marginBottom: 8, fontFamily: 'var(--font-display)', fontWeight: 600 }}>
            {search ? 'No results' : 'Archive is empty'}
          </div>
          <div style={{ fontSize: 13, color: 'var(--muted)' }}>
            {search ? 'Try a different search term.' : 'Closed applications will appear here.'}
          </div>
        </div>
      ) : (
        <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, overflow: 'hidden' }}>
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 180px 160px 100px 40px',
            gap: 16, padding: '10px 18px',
            background: 'var(--surface-2)', borderBottom: '1px solid var(--border)',
            fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em',
          }}>
            <span>Company</span>
            <span>Role</span>
            <span>Outcome</span>
            <span>Applied</span>
            <span />
          </div>
          {filtered.map((app, i) => (
            <motion.div
              key={app.id}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: i * 0.02 }}
              whileHover={{ backgroundColor: 'rgba(255,255,255,0.02)' }}
              onClick={() => onSelect(app.id)}
              style={{
                display: 'grid', gridTemplateColumns: '1fr 180px 160px 100px 40px',
                alignItems: 'center', gap: 16,
                padding: '12px 18px',
                borderBottom: i < filtered.length - 1 ? '1px solid var(--border)' : 'none',
                cursor: 'pointer',
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: 14, color: 'var(--text)' }}>{app.company}</div>
                {app.desireRank > 0 && (
                  <div style={{ fontSize: 11, color: 'var(--gold)', marginTop: 2 }}>{'★'.repeat(app.desireRank)}{'☆'.repeat(5 - app.desireRank)}</div>
                )}
              </div>
              <div style={{ fontSize: 13, color: 'var(--text-soft)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                {app.role || '—'}
              </div>
              <div style={{ fontSize: 12 }}>
                {app.subStage ? (
                  <span style={{
                    padding: '3px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
                    background: app.subStage?.includes('Rejected') || app.subStage === 'Ghosted' ? 'var(--danger-dim)' : app.subStage === 'Withdrew' ? 'rgba(255,255,255,0.06)' : 'var(--gold-dim)',
                    color: app.subStage?.includes('Rejected') || app.subStage === 'Ghosted' ? 'var(--danger)' : app.subStage === 'Withdrew' ? 'var(--muted)' : 'var(--gold)',
                  }}>
                    {app.subStage}
                  </span>
                ) : <span style={{ color: 'var(--muted)' }}>Closed</span>}
              </div>
              <div style={{ fontSize: 12, color: 'var(--muted)' }}>{formatDateShort(app.appliedOn)}</div>
              <ArrowRight size={14} color="var(--muted)" />
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}

// ─── Settings View ─────────────────────────────────────────────────────────────
function SettingsView({
  settings, onSave
}: {
  settings: UserSettings
  onSave: (s: UserSettings) => void
}) {
  const [form, setForm] = useState<UserSettings>({ ...settings })
  const [saved, setSaved] = useState(false)

  function handleSave() {
    onSave(form)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 14px', borderRadius: 8,
    border: '1px solid var(--border)', background: 'var(--surface-2)',
    color: 'var(--text)', fontSize: 14, fontFamily: 'var(--font-body)', outline: 'none',
  }
  const labelStyle: React.CSSProperties = {
    fontSize: 12, fontWeight: 700, color: 'var(--muted)',
    textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 6, display: 'block',
  }

  return (
    <div style={{ padding: '28px 32px', maxWidth: 620 }}>
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 22, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
          Settings
        </h1>
        <div style={{ fontSize: 13, color: 'var(--muted)', marginTop: 2 }}>
          Your profile is used in email templates and personalization.
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>Profile</div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Full Name</label>
          <input
            style={inputStyle}
            value={form.fullName}
            onChange={e => setForm(f => ({ ...f, fullName: e.target.value }))}
            placeholder="Your full name (used in email templates)"
          />
        </div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Target Salary</label>
          <input
            style={inputStyle}
            value={form.targetSalaryGlobal}
            onChange={e => setForm(f => ({ ...f, targetSalaryGlobal: e.target.value }))}
            placeholder="e.g. $85,000 – $100,000"
          />
        </div>
      </div>

      <div style={{ background: 'var(--surface)', border: '1px solid var(--border)', borderRadius: 12, padding: '24px', marginBottom: 16 }}>
        <div style={{ fontSize: 13, fontWeight: 700, color: 'var(--text)', marginBottom: 20, fontFamily: 'var(--font-display)' }}>Email Templates</div>

        <div style={{ marginBottom: 18 }}>
          <label style={labelStyle}>Availability (for scheduling emails)</label>
          <textarea
            rows={3}
            style={{ ...inputStyle, resize: 'vertical' }}
            value={form.availabilityNote}
            onChange={e => setForm(f => ({ ...f, availabilityNote: e.target.value }))}
            placeholder="e.g. Available Mon–Fri 9am–5pm CST, flexible for mornings"
          />
        </div>

        <div>
          <label style={labelStyle}>Email Signature</label>
          <textarea
            rows={4}
            style={{ ...inputStyle, resize: 'vertical' }}
            value={form.emailSignature}
            onChange={e => setForm(f => ({ ...f, emailSignature: e.target.value }))}
            placeholder={'e.g.\n\nBest,\nAamir Ali\n972-214-4380\naamirali1211@gmail.com'}
          />
        </div>
      </div>

      <motion.button
        whileHover={{ scale: 1.02 }}
        onClick={handleSave}
        style={{
          padding: '11px 24px', borderRadius: 8, border: 'none',
          background: saved ? 'var(--success-dim)' : 'var(--brand)',
          color: saved ? 'var(--success)' : '#08090D',
          fontSize: 14, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
          display: 'flex', alignItems: 'center', gap: 8,
          transition: 'background 0.2s',
        }}
      >
        {saved ? <><CheckCircle size={16} /> Saved!</> : 'Save Settings'}
      </motion.button>
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
    { id: 'overview',  label: 'Overview'  },
    { id: 'contact',   label: 'Contact'   },
    { id: 'job',       label: 'Job'       },
    { id: 'prep',      label: 'Interview' },
    { id: 'offer',     label: 'Offer'     },
    { id: 'email',     label: 'Email'     },
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
            {/* Interview logistics — top of tab */}
            <div style={{ display: 'flex', gap: 10 }}>
              <div style={{ flex: 2 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Interview Date & Time</label>
                <input type="datetime-local" value={draft.interviewDate} onChange={e => patchDraft('interviewDate', e.target.value)} style={inputStyle} />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Prep Status</label>
                <select value={draft.prepStatus} onChange={e => patchDraft('prepStatus', e.target.value as Application['prepStatus'])} style={{ ...inputStyle, cursor: 'pointer' }}>
                  {(['Not started', 'Light prep', 'Ready'] as const).map(s => <option key={s}>{s}</option>)}
                </select>
              </div>
            </div>

            {/* Divider */}
            <div style={{ borderTop: '1px solid var(--border)', paddingTop: 2 }}>
              <span style={{ fontSize: 10, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>Prep Notes</span>
            </div>

            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>General Notes</label>
              <textarea rows={3} value={draft.prepNotes} onChange={e => patchDraft('prepNotes', e.target.value)} placeholder="General notes, thoughts, reminders..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Company Research</label>
              <textarea rows={3} value={draft.companyResearch} onChange={e => patchDraft('companyResearch', e.target.value)} placeholder="What you know about the company, culture, recent news..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Questions to Ask / Prep For</label>
              <textarea rows={3} value={draft.prepQuestions} onChange={e => patchDraft('prepQuestions', e.target.value)} placeholder="Questions to ask, questions to prep for..." style={textareaStyle} />
            </div>
            <div>
              <label style={{ fontSize: 11, fontWeight: 600, color: 'var(--muted)', display: 'block', marginBottom: 5, textTransform: 'uppercase', letterSpacing: '0.06em' }}>Key Talking Points</label>
              <textarea rows={3} value={draft.talkingPoints} onChange={e => patchDraft('talkingPoints', e.target.value)} placeholder="STAR stories, strongest examples, what to lead with..." style={textareaStyle} />
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
  const [settings, setSettings] = useState<UserSettings>(() => loadSettings())
  const [careerStats] = useState<CareerStats>(() => loadCareerStats())

  const [tasks, setTasks] = useState<Task[]>(() => loadTasks())
  const [huntModalOpen, setHuntModalOpen] = useState(false)
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddDefaultStage, setQuickAddDefaultStage] = useState<MainStage>('Applied')
  const [selectedAppId, setSelectedAppId] = useState<number | null>(null)

  // Persist on every change
  useEffect(() => { saveApplications(applications) }, [applications])
  useEffect(() => { saveQueue(queue) }, [queue])
  useEffect(() => { saveHuntSession(huntSession) }, [huntSession])
  useEffect(() => { saveSettings(settings) }, [settings])
  useEffect(() => { saveCareerStats(careerStats) }, [careerStats])
  useEffect(() => { saveTasks(tasks) }, [tasks])

  // Auto-task engine — creates tasks when applications change state
  useEffect(() => {
    const today = getTodayIso()
    setTasks(prev => {
      const newTasks: Task[] = []
      for (const app of applications) {
        if (app.stage === 'Closed') continue
        // Follow-up task: Applied stage, due 7 days after application
        if (!prev.some(t => t.linkedAppId === app.id && t.linkedTaskType === 'follow-up')) {
          const due = new Date(app.appliedOn)
          due.setDate(due.getDate() + 7)
          newTasks.push({
            id: Date.now() + Math.random(),
            title: `Follow up with ${app.company}`,
            dueDate: due.toISOString().slice(0, 10),
            linkedAppId: app.id, linkedTaskType: 'follow-up',
            done: false, autoGenerated: true, createdAt: today,
          })
        }
        // Interview prep task: Interviewing stage with a date set
        if (app.stage === 'Interviewing' && app.interviewDate &&
            !prev.some(t => t.linkedAppId === app.id && t.linkedTaskType === 'interview-prep')) {
          const prepDate = new Date(app.interviewDate.slice(0, 10))
          prepDate.setDate(prepDate.getDate() - 1)
          newTasks.push({
            id: Date.now() + Math.random() + 1,
            title: `Prep for ${app.company} interview`,
            dueDate: prepDate.toISOString().slice(0, 10),
            linkedAppId: app.id, linkedTaskType: 'interview-prep',
            done: false, autoGenerated: true, createdAt: today,
          })
        }
      }
      return newTasks.length > 0 ? [...prev, ...newTasks] : prev
    })
  }, [applications]) // eslint-disable-line

  // Derived counts
  const pendingQueueCount = useMemo(() => queue.filter(q => q.status === 'pending').length, [queue])
  const rejectionCount = useMemo(() => applications.filter(a => a.stage === 'Closed').length, [applications])
  const openTaskCount = useMemo(() => tasks.filter(t => !t.done && t.dueDate && t.dueDate <= getTodayIso()).length, [tasks])
  const selectedApp = useMemo(() => applications.find(a => a.id === selectedAppId) ?? null, [applications, selectedAppId])
  // Total apps sent (all tracker apps + queue items) — for the sidebar counter
  const totalApplied = useMemo(() => applications.length + queue.filter(q => q.status !== 'dismissed').length, [applications, queue])
  // Apps submitted this week (tracker + queue combined)
  const weekApps = useMemo(() =>
    applications.filter(a => isSameWeek(a.appliedOn)).length +
    queue.filter(q => isSameWeek(q.receivedOn)).length,
    [applications, queue]
  )

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
    // Pick stage based on email type
    const stageByType: Partial<Record<string, MainStage>> = {
      interview: 'Interviewing',
      assessment: 'Assessment',
      offer: 'Offer',
    }
    const stage: MainStage = stageByType[item.emailType] ?? 'Screening'
    const app = newBlankApp({
      company: item.company,
      role: item.role,
      source: item.source === 'manual' ? 'Other' : item.source,
      appliedOn: item.receivedOn,
      stage,
      quickAddNote: item.snippet,
      huntSessionId: huntSession?.id,
      // Pull contact info from the queue item if it exists
      recruiter: item.contactName || '',
      recruiterContact: item.contactEmail || '',
      history: [createHistoryEntry(`Moved from Inbox · ${item.emailType}`, item.snippet || '', 'Status')],
    })
    setApplications(prev => [app, ...prev])
    setQueue(prev => prev.map(q => q.id === queueId ? { ...q, status: 'tracked', trackedAppId: app.id } : q))
    setView('tracker')
  }

  function moveToTracker(appId: number, stage: MainStage) {
    setApplications(prev => prev.map(a =>
      a.id === appId
        ? { ...a, stage, history: [...a.history, createHistoryEntry(`Moved to ${stage}`, '', 'Status')] }
        : a
    ))
    setView('tracker')
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
        totalApplied={totalApplied}
        weekApps={weekApps}
        rejectionCount={rejectionCount}
        openTaskCount={openTaskCount}
        onStartHunt={() => setHuntModalOpen(true)}
        onLockInOpen={() => {}}
        lockInActive={false}
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
                tasks={tasks}
                onStartHunt={() => setHuntModalOpen(true)}
                onViewChange={handleViewChange}
              />
            </motion.div>
          )}

          {view === 'applied' && (
            <motion.div key="applied" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InboxView
                queue={queue}
                applications={applications}
                onQueueUpdate={setQueue}
                onPromote={promoteQueueItem}
                onQuickAdd={() => { setQuickAddDefaultStage('Applied'); setQuickAddOpen(true) }}
                onSelect={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'tracker' && (
            <motion.div key="tracker" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TrackerView
                applications={applications}
                onUpdate={updateApplications}
                onSelect={id => setSelectedAppId(id)}
                onQuickAdd={() => { setQuickAddDefaultStage('Screening'); setQuickAddOpen(true) }}
              />
            </motion.div>
          )}

          {view === 'pipeline' && (
            <motion.div key="pipeline" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PipelineView
                applications={applications}
                onSelect={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'interviews' && (
            <motion.div key="interviews" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <InterviewScheduleView applications={applications} onSelect={id => setSelectedAppId(id)} />
            </motion.div>
          )}

          {view === 'tasks' && (
            <motion.div key="tasks" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <TasksView
                tasks={tasks}
                applications={applications}
                onTasksUpdate={setTasks}
                onSelectApp={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'stats' && (
            <motion.div key="stats" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <StatsView applications={applications} queue={queue} huntSession={huntSession} />
            </motion.div>
          )}

          {view === 'rejections' && (
            <motion.div key="rejections" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <RejectionsView
                applications={applications}
                onSelect={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'resume-vault' && (
            <motion.div key="resume-vault" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Resume Vault" icon={<FileText size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'calendar' && (
            <motion.div key="calendar" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <CalendarView
                applications={applications}
                onSelectApp={id => setSelectedAppId(id)}
              />
            </motion.div>
          )}

          {view === 'prep-room' && selectedApp && (
            <motion.div key="prep-room" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PrepRoom
                app={selectedApp}
                onBack={() => setView('tracker')}
                onUpdate={updateApp}
              />
            </motion.div>
          )}

          {view === 'prep-room' && !selectedApp && (
            <motion.div key="prep-room-empty" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <PlaceholderView title="Prep Room" icon={<FileText size={32} color="var(--muted)" />} />
            </motion.div>
          )}

          {view === 'archive' && (
            <motion.div key="archive" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <ArchiveView applications={applications} onSelect={id => setSelectedAppId(id)} />
            </motion.div>
          )}

          {view === 'settings' && (
            <motion.div key="settings" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
              <SettingsView settings={settings} onSave={setSettings} />
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
        onAdd={app => { addApplication(app); if (app.stage !== 'Applied') setView('tracker') }}
        defaultStage={quickAddDefaultStage}
      />
    </div>
  )
}
