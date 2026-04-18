import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ArrowLeft, CalendarDays, Clock,
  BookOpen, MessageSquare, Lightbulb, Star, Plus, X, ChevronDown
} from 'lucide-react'
import type { Application } from '../../types'
import { formatDateTime, daysUntil } from '../../utils/dates'
import { STAGE_CONFIG } from '../../utils/stages'

// ─── Common Responses Library ─────────────────────────────────────────────────
const COMMON_PROMPT_STARTERS = [
  'Tell me about yourself',
  'Why this company?',
  'Why are you leaving your current role?',
  'What\'s your greatest strength?',
  'Tell me about a challenge you overcame',
  'Where do you see yourself in 5 years?',
  'Why should we hire you?',
]

type SavedResponse = {
  id: string
  prompt: string
  answer: string
  updatedAt: string
}

const RESPONSES_KEY = 'prospect-common-responses'

function loadResponses(): SavedResponse[] {
  try { return JSON.parse(localStorage.getItem(RESPONSES_KEY) ?? '[]') } catch { return [] }
}
function saveResponses(r: SavedResponse[]) {
  localStorage.setItem(RESPONSES_KEY, JSON.stringify(r))
}

// ─── Auto-save hook ────────────────────────────────────────────────────────────
function useAutoSave(value: string, delay = 800): { saving: boolean } {
  const [saving, setSaving] = useState(false)
  const prev = useRef(value)
  useEffect(() => {
    if (value === prev.current) return
    setSaving(true)
    const t = setTimeout(() => { setSaving(false); prev.current = value }, delay)
    return () => clearTimeout(t)
  }, [value, delay])
  return { saving }
}

// ─── Prep Room ─────────────────────────────────────────────────────────────────
type PrepTab = 'notes' | 'questions' | 'talking-points' | 'responses'

export function PrepRoom({
  app,
  onBack,
  onUpdate,
}: {
  app: Application
  onBack: () => void
  onUpdate: (app: Application) => void
}) {
  const [draft, setDraft] = useState<Application>({ ...app })
  const [activeTab, setActiveTab] = useState<PrepTab>('notes')
  const [responses, setResponses] = useState<SavedResponse[]>(loadResponses)
  const [addingResponse, setAddingResponse] = useState(false)
  const [newPrompt, setNewPrompt] = useState('')
  const [newAnswer, setNewAnswer] = useState('')
  const [responseFilter, setResponseFilter] = useState('')

  // Auto-save whenever draft changes
  const { saving } = useAutoSave(JSON.stringify(draft))
  useEffect(() => { onUpdate(draft) }, [draft]) // eslint-disable-line

  function patchDraft<K extends keyof Application>(field: K, value: Application[K]) {
    setDraft(d => ({ ...d, [field]: value }))
  }

  function saveResponse() {
    if (!newPrompt.trim() || !newAnswer.trim()) return
    const r: SavedResponse = {
      id: Date.now().toString(),
      prompt: newPrompt.trim(),
      answer: newAnswer.trim(),
      updatedAt: new Date().toISOString(),
    }
    const updated = [r, ...responses]
    setResponses(updated)
    saveResponses(updated)
    setNewPrompt('')
    setNewAnswer('')
    setAddingResponse(false)
  }

  function deleteResponse(id: string) {
    const updated = responses.filter(r => r.id !== id)
    setResponses(updated)
    saveResponses(updated)
  }

  function updateResponse(id: string, answer: string) {
    const updated = responses.map(r => r.id === id ? { ...r, answer, updatedAt: new Date().toISOString() } : r)
    setResponses(updated)
    saveResponses(updated)
  }

  const cfg = STAGE_CONFIG[draft.stage]
  const daysOut = draft.interviewDate ? daysUntil(draft.interviewDate.slice(0, 10)) : null

  const inputStyle: React.CSSProperties = {
    width: '100%', padding: '10px 12px',
    background: 'var(--surface-3)', border: '1px solid var(--border)',
    borderRadius: 8, color: 'var(--text)', fontSize: 13,
    outline: 'none', fontFamily: 'var(--font-body)', resize: 'vertical' as const,
  }

  const tabs: { id: PrepTab; label: string; icon: React.ElementType }[] = [
    { id: 'notes',          label: 'General Notes',   icon: BookOpen },
    { id: 'questions',      label: 'Questions',       icon: MessageSquare },
    { id: 'talking-points', label: 'Talking Points',  icon: Lightbulb },
    { id: 'responses',      label: 'Response Library', icon: Star },
  ]

  const filteredResponses = responses.filter(r =>
    !responseFilter || r.prompt.toLowerCase().includes(responseFilter.toLowerCase())
  )

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 8 }}
      transition={{ duration: 0.2 }}
      style={{
        display: 'flex', flexDirection: 'column',
        height: '100vh', background: 'var(--bg)',
      }}
    >
      {/* ── Top bar ── */}
      <div style={{
        background: 'var(--surface)',
        borderBottom: '1px solid var(--border)',
        padding: '14px 24px',
        display: 'flex', alignItems: 'center', gap: 16,
        flexShrink: 0,
      }}>
        <button
          onClick={onBack}
          style={{
            display: 'flex', alignItems: 'center', gap: 6,
            background: 'none', border: 'none', cursor: 'pointer',
            color: 'var(--muted)', fontSize: 13, fontFamily: 'var(--font-body)',
            padding: '6px 10px', borderRadius: 6,
            transition: 'all 0.15s',
          }}
          onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,255,255,0.05)'; (e.currentTarget as HTMLElement).style.color = 'var(--text)' }}
          onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent'; (e.currentTarget as HTMLElement).style.color = 'var(--muted)' }}
        >
          <ArrowLeft size={14} />
          Back
        </button>

        <div style={{ width: 1, height: 24, background: 'var(--border)' }} />

        {/* Company + role */}
        <div style={{ flex: 1 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ fontFamily: 'var(--font-display)', fontSize: 18, fontWeight: 700, color: 'var(--text)', letterSpacing: '-0.03em' }}>
              {draft.company}
            </span>
            {draft.role && (
              <span style={{ fontSize: 14, color: 'var(--text-soft)' }}>— {draft.role}</span>
            )}
            <span style={{
              padding: '2px 9px', borderRadius: 99, fontSize: 11, fontWeight: 600,
              background: cfg.bg, color: cfg.color, border: `1px solid ${cfg.color}30`,
            }}>
              {cfg.label}
              {draft.subStage && <span style={{ opacity: 0.7 }}> · {draft.subStage}</span>}
            </span>
          </div>
        </div>

        {/* Interview date + prep status */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          {draft.interviewDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 13, color: 'var(--text-soft)' }}>
              <CalendarDays size={13} color="var(--brand)" />
              {formatDateTime(draft.interviewDate)}
              {daysOut !== null && daysOut >= 0 && (
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99,
                  background: daysOut === 0 ? 'var(--danger-dim)' : daysOut <= 2 ? 'var(--warning-dim)' : 'var(--brand-dim)',
                  color: daysOut === 0 ? 'var(--danger)' : daysOut <= 2 ? 'var(--warning)' : 'var(--brand)',
                }}>
                  {daysOut === 0 ? 'Today' : daysOut === 1 ? 'Tomorrow' : `${daysOut}d away`}
                </span>
              )}
            </div>
          )}
          {!draft.interviewDate && (
            <div style={{ display: 'flex', alignItems: 'center', gap: 6, fontSize: 12, color: 'var(--muted)' }}>
              <Clock size={12} />
              No interview date set
            </div>
          )}

          {/* Prep status selector */}
          <select
            value={draft.prepStatus}
            onChange={e => patchDraft('prepStatus', e.target.value as Application['prepStatus'])}
            style={{
              padding: '6px 10px', borderRadius: 7, fontSize: 12, fontFamily: 'var(--font-body)',
              background: draft.prepStatus === 'Ready' ? 'var(--brand-dim)' : draft.prepStatus === 'Light prep' ? 'var(--gold-dim)' : 'rgba(255,255,255,0.05)',
              border: `1px solid ${draft.prepStatus === 'Ready' ? 'rgba(126,232,162,0.3)' : draft.prepStatus === 'Light prep' ? 'rgba(251,191,36,0.3)' : 'var(--border)'}`,
              color: draft.prepStatus === 'Ready' ? 'var(--brand)' : draft.prepStatus === 'Light prep' ? 'var(--gold)' : 'var(--muted)',
              cursor: 'pointer', outline: 'none', fontWeight: 600,
            }}
          >
            <option value="Not started">Not started</option>
            <option value="Light prep">Light prep</option>
            <option value="Ready">Ready ✓</option>
          </select>

          {/* Save indicator */}
          <div style={{ fontSize: 11, color: saving ? 'var(--brand)' : 'transparent', transition: 'color 0.2s' }}>
            {saving ? 'Saving…' : '✓ Saved'}
          </div>
        </div>
      </div>

      {/* ── Main 2-column workspace ── */}
      <div style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>

        {/* Left column — Job context (reference) */}
        <div style={{
          width: 380, flexShrink: 0,
          borderRight: '1px solid var(--border)',
          background: 'var(--surface)',
          display: 'flex', flexDirection: 'column',
          overflow: 'hidden',
        }}>
          <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
            <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.1em' }}>
              Job Context
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 3 }}>Reference while you prep</div>
          </div>
          <div style={{ flex: 1, overflow: 'auto', padding: '16px 20px', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* Salary */}
            {draft.salary && (
              <div style={{
                padding: '10px 14px', borderRadius: 8,
                background: 'var(--brand-dim)', border: '1px solid rgba(126,232,162,0.15)',
                fontSize: 13, color: 'var(--brand)', fontWeight: 600,
              }}>
                {draft.salary}
              </div>
            )}

            {/* Job description */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Job Description
              </div>
              {draft.jobDescription ? (
                <div style={{
                  fontSize: 12, color: 'var(--text-soft)', lineHeight: 1.7,
                  whiteSpace: 'pre-wrap', wordBreak: 'break-word',
                }}>
                  {draft.jobDescription}
                </div>
              ) : (
                <div style={{ fontSize: 12, color: 'var(--muted)', fontStyle: 'italic' }}>
                  No job description saved. Add it in the Job tab.
                </div>
              )}
            </div>

            {/* Company research — editable inline */}
            <div>
              <div style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: 8 }}>
                Company Research
              </div>
              <textarea
                rows={5}
                value={draft.companyResearch}
                onChange={e => patchDraft('companyResearch', e.target.value)}
                placeholder="What you know about this company — culture, news, the team, why you like them..."
                style={inputStyle}
                onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                onBlur={e => (e.target.style.borderColor = 'var(--border)')}
              />
            </div>
          </div>
        </div>

        {/* Right column — Active prep workspace */}
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>

          {/* Prep tab bar */}
          <div style={{
            borderBottom: '1px solid var(--border)',
            padding: '0 24px',
            display: 'flex', gap: 0, flexShrink: 0,
            background: 'var(--surface)',
          }}>
            {tabs.map(t => {
              const Icon = t.icon
              return (
                <button
                  key={t.id}
                  onClick={() => setActiveTab(t.id)}
                  style={{
                    padding: '14px 16px', background: 'none', border: 'none', cursor: 'pointer',
                    fontFamily: 'var(--font-body)', fontSize: 13,
                    fontWeight: activeTab === t.id ? 600 : 400,
                    color: activeTab === t.id ? 'var(--brand)' : 'var(--muted)',
                    borderBottom: activeTab === t.id ? '2px solid var(--brand)' : '2px solid transparent',
                    marginBottom: -1, transition: 'all 0.15s',
                    display: 'flex', alignItems: 'center', gap: 6,
                  }}
                >
                  <Icon size={13} />
                  {t.label}
                </button>
              )
            })}
          </div>

          {/* Tab content */}
          <div style={{ flex: 1, overflow: 'auto', padding: '24px' }}>
            <AnimatePresence mode="wait">

              {activeTab === 'notes' && (
                <motion.div key="notes" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    Brain dump anything here — thoughts, impressions, reminders to yourself.
                  </div>
                  <textarea
                    rows={20}
                    value={draft.prepNotes}
                    onChange={e => patchDraft('prepNotes', e.target.value)}
                    placeholder="Any notes about this interview — format, interviewer names, things to remember..."
                    style={{ ...inputStyle, minHeight: 300 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </motion.div>
              )}

              {activeTab === 'questions' && (
                <motion.div key="questions" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    Questions to prep for. Questions to ask them. Both matter.
                  </div>
                  <textarea
                    rows={20}
                    value={draft.prepQuestions}
                    onChange={e => patchDraft('prepQuestions', e.target.value)}
                    placeholder={'Questions to prep for:\n- Tell me about a time you...\n- Why are you leaving?\n\nQuestions to ask them:\n- What does success look like in 90 days?\n- How does the team collaborate?'}
                    style={{ ...inputStyle, minHeight: 300 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </motion.div>
              )}

              {activeTab === 'talking-points' && (
                <motion.div key="talking-points" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ fontSize: 13, color: 'var(--muted)', marginBottom: 16 }}>
                    Your strongest stories, STAR examples, and key messages for this role.
                  </div>
                  <textarea
                    rows={20}
                    value={draft.talkingPoints}
                    onChange={e => patchDraft('talkingPoints', e.target.value)}
                    placeholder={'Talking points:\n\n[STAR: Challenge at previous company]\nSituation: ...\nTask: ...\nAction: ...\nResult: ...\n\n[Why I fit this role]\n...'}
                    style={{ ...inputStyle, minHeight: 300 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                  />
                </motion.div>
              )}

              {activeTab === 'responses' && (
                <motion.div key="responses" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
                    <div>
                      <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text)', marginBottom: 3 }}>Response Library</div>
                      <div style={{ fontSize: 12, color: 'var(--muted)' }}>
                        Save your best answers here. They travel with you across every application.
                      </div>
                    </div>
                    <button
                      onClick={() => setAddingResponse(true)}
                      style={{
                        display: 'flex', alignItems: 'center', gap: 6,
                        padding: '8px 14px', borderRadius: 8, border: 'none',
                        background: 'var(--brand)', color: '#08090D',
                        fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer',
                      }}
                    >
                      <Plus size={12} /> Add Response
                    </button>
                  </div>

                  {/* Search */}
                  <input
                    placeholder="Search responses..."
                    value={responseFilter}
                    onChange={e => setResponseFilter(e.target.value)}
                    style={{
                      ...inputStyle, marginBottom: 16, resize: 'none',
                      padding: '8px 12px',
                    }}
                  />

                  {/* Add new response form */}
                  <AnimatePresence>
                    {addingResponse && (
                      <motion.div
                        initial={{ opacity: 0, y: -8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        style={{
                          background: 'var(--surface-2)', border: '1px solid rgba(126,232,162,0.2)',
                          borderRadius: 10, padding: 16, marginBottom: 16,
                          display: 'flex', flexDirection: 'column', gap: 10,
                        }}
                      >
                        <div style={{ fontSize: 12, fontWeight: 600, color: 'var(--brand)' }}>New Response</div>

                        {/* Quick starters */}
                        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                          {COMMON_PROMPT_STARTERS.map(s => (
                            <button
                              key={s}
                              onClick={() => setNewPrompt(s)}
                              style={{
                                padding: '3px 9px', borderRadius: 99, fontSize: 11, cursor: 'pointer',
                                background: newPrompt === s ? 'var(--brand-dim)' : 'rgba(255,255,255,0.05)',
                                border: `1px solid ${newPrompt === s ? 'rgba(126,232,162,0.3)' : 'var(--border)'}`,
                                color: newPrompt === s ? 'var(--brand)' : 'var(--muted)',
                                fontFamily: 'var(--font-body)',
                              }}
                            >
                              {s}
                            </button>
                          ))}
                        </div>

                        <input
                          placeholder="Question or prompt..."
                          value={newPrompt}
                          onChange={e => setNewPrompt(e.target.value)}
                          style={{ ...inputStyle, resize: 'none' }}
                          onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                        <textarea
                          rows={4}
                          placeholder="Your answer..."
                          value={newAnswer}
                          onChange={e => setNewAnswer(e.target.value)}
                          style={inputStyle}
                          onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                          onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                        />
                        <div style={{ display: 'flex', gap: 8 }}>
                          <button
                            onClick={saveResponse}
                            disabled={!newPrompt.trim() || !newAnswer.trim()}
                            style={{
                              padding: '8px 16px', borderRadius: 7, border: 'none', cursor: 'pointer',
                              background: 'var(--brand)', color: '#08090D',
                              fontSize: 12, fontFamily: 'var(--font-body)', fontWeight: 700,
                            }}
                          >
                            Save
                          </button>
                          <button
                            onClick={() => { setAddingResponse(false); setNewPrompt(''); setNewAnswer('') }}
                            style={{
                              padding: '8px 16px', borderRadius: 7, cursor: 'pointer',
                              background: 'transparent', border: '1px solid var(--border)',
                              color: 'var(--muted)', fontSize: 12, fontFamily: 'var(--font-body)',
                            }}
                          >
                            Cancel
                          </button>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Saved responses */}
                  {filteredResponses.length === 0 ? (
                    <div style={{ textAlign: 'center', padding: '40px 0', color: 'var(--muted)', fontSize: 13 }}>
                      {responses.length === 0
                        ? 'No responses saved yet. Build your library over time — these carry across every application.'
                        : 'No responses match your search.'}
                    </div>
                  ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                      {filteredResponses.map(r => (
                        <ResponseCard
                          key={r.id}
                          response={r}
                          onDelete={() => deleteResponse(r.id)}
                          onUpdate={answer => updateResponse(r.id, answer)}
                          inputStyle={inputStyle}
                        />
                      ))}
                    </div>
                  )}
                </motion.div>
              )}

            </AnimatePresence>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

// ─── Response Card ─────────────────────────────────────────────────────────────
function ResponseCard({
  response, onDelete, onUpdate, inputStyle
}: {
  response: SavedResponse
  onDelete: () => void
  onUpdate: (answer: string) => void
  inputStyle: React.CSSProperties
}) {
  const [expanded, setExpanded] = useState(false)
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(response.answer)

  return (
    <div style={{
      background: 'var(--surface-2)', border: '1px solid var(--border)',
      borderRadius: 10, overflow: 'hidden',
    }}>
      <div
        style={{
          display: 'flex', alignItems: 'center', gap: 10,
          padding: '12px 14px', cursor: 'pointer',
        }}
        onClick={() => setExpanded(!expanded)}
      >
        <Star size={13} color="var(--gold)" />
        <div style={{ flex: 1, fontSize: 13, fontWeight: 600, color: 'var(--text)' }}>{response.prompt}</div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
          <button
            onClick={e => { e.stopPropagation(); onDelete() }}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--muted)', display: 'flex' }}
          >
            <X size={13} />
          </button>
          <ChevronDown
            size={13}
            color="var(--muted)"
            style={{ transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}
          />
        </div>
      </div>
      <AnimatePresence>
        {expanded && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.2 }}
            style={{ overflow: 'hidden' }}
          >
            <div style={{ padding: '0 14px 14px' }}>
              {editing ? (
                <>
                  <textarea
                    rows={4}
                    value={draft}
                    onChange={e => setDraft(e.target.value)}
                    style={{ ...inputStyle, marginBottom: 8 }}
                    onFocus={e => (e.target.style.borderColor = 'rgba(126,232,162,0.4)')}
                    onBlur={e => (e.target.style.borderColor = 'var(--border)')}
                    autoFocus
                  />
                  <div style={{ display: 'flex', gap: 6 }}>
                    <button
                      onClick={() => { onUpdate(draft); setEditing(false) }}
                      style={{ padding: '6px 12px', borderRadius: 6, border: 'none', background: 'var(--brand)', color: '#08090D', fontSize: 11, fontFamily: 'var(--font-body)', fontWeight: 700, cursor: 'pointer' }}
                    >
                      Save
                    </button>
                    <button
                      onClick={() => { setDraft(response.answer); setEditing(false) }}
                      style={{ padding: '6px 12px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                    >
                      Cancel
                    </button>
                  </div>
                </>
              ) : (
                <>
                  <div style={{ fontSize: 13, color: 'var(--text-soft)', lineHeight: 1.7, whiteSpace: 'pre-wrap', marginBottom: 8 }}>
                    {response.answer}
                  </div>
                  <button
                    onClick={() => setEditing(true)}
                    style={{ padding: '5px 10px', borderRadius: 6, border: '1px solid var(--border)', background: 'transparent', color: 'var(--muted)', fontSize: 11, fontFamily: 'var(--font-body)', cursor: 'pointer' }}
                  >
                    Edit
                  </button>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}
