import React, { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

/* ─── Types ─────────────────────────────────────── */
type Stage =
  | 'Saved'
  | 'Application Submitted'
  | 'Follow-Up 1'
  | 'Follow-Up 2'
  | 'Recruiter Screen'
  | 'Scheduled 1st Interview'
  | 'Completed 1st Interview'
  | 'Scheduled 2nd Interview'
  | 'Completed 2nd Interview'
  | 'Scheduled 3rd Interview'
  | 'Completed 3rd Interview'
  | 'Scheduled 4th Interview'
  | 'Completed 4th Interview'
  | 'Waiting on response'
  | 'No response'
  | 'Offer made'
  | 'Offer accepted'
  | 'Offer declined'
  | 'Archived'

type View = 'dashboard' | 'tracker' | 'pipeline' | 'interviews' | 'archive' | 'calendar'

type DetailTab = 'overview' | 'contact' | 'job' | 'offer'

type HistoryType =
  | 'Applied'
  | 'Follow-up'
  | 'Interview'
  | 'Status'
  | 'Prep'
  | 'Archive'
  | 'Waiting on response'
  | 'Note'
  | 'Offer'

type HistoryEntry = {
  id: number
  date: string
  label: string
  detail: string
  type: HistoryType
}

type Application = {
  id: number
  company: string
  role: string
  source: string
  appliedOn: string
  followUpOn: string
  stage: Stage
  priority: 'High' | 'Medium' | 'Low'
  fitScore: number
  /* Pay */
  salary: string          // listed pay (from job posting)
  salaryTargeted: string  // what you'd actually want
  workStyle: string
  /* Contacts */
  recruiter: string
  recruiterContact: string       // email / phone / LinkedIn
  interviewingManager: string
  managerContact: string         // email / phone / LinkedIn
  /* Interview */
  interviewDate: string
  interviewStage: string
  prepStatus: 'Not started' | 'Light prep' | 'Ready'
  /* Desire rank: 0 = unranked, 1–5 */
  desireRank: number
  /* Job details */
  jobDescription: string
  notes: string
  /* Offer tracking */
  offerAmount: string
  decisionNotes: string
  /* Archive */
  archiveReason: string
  archiveDetail: string
  history: HistoryEntry[]
}

type QuickAddForm = {
  company: string
  role: string
  source: string
  salary: string
  appliedOn: string
}

/* ─── Constants ─────────────────────────────────── */
const STORAGE_KEY = 'nextround-applications'

const stageOptions: Stage[] = [
  'Saved',
  'Application Submitted',
  'Follow-Up 1',
  'Follow-Up 2',
  'Recruiter Screen',
  'Scheduled 1st Interview',
  'Completed 1st Interview',
  'Scheduled 2nd Interview',
  'Completed 2nd Interview',
  'Scheduled 3rd Interview',
  'Completed 3rd Interview',
  'Scheduled 4th Interview',
  'Completed 4th Interview',
  'Waiting on response',
  'No response',
  'Offer made',
  'Offer accepted',
  'Offer declined',
  'Archived',
]

const archiveReasons = [
  'Email rejection',
  'Rejected after recruiter screen',
  'Rejected after 1st round',
  'Rejected after final round',
  'Role filled',
  'Salary mismatch',
  'Withdrew',
  'No longer interested',
  'Unable to contact',
  'Offer declined',
  'Other',
]

/* Default values for new fields — used when migrating old saved data */
const appDefaults: Partial<Application> = {
  salaryTargeted: '',
  recruiterContact: '',
  interviewingManager: '',
  managerContact: '',
  desireRank: 0,
  jobDescription: '',
  offerAmount: '',
  decisionNotes: '',
}

const sampleApplications: Application[] = [
  {
    id: 1,
    company: 'AnswersNow',
    role: 'Intake Manager',
    source: 'LinkedIn',
    appliedOn: '2026-03-15',
    followUpOn: '2026-03-31',
    stage: 'Waiting on response',
    priority: 'High',
    fitScore: 94,
    salary: '$70k – $90k',
    salaryTargeted: '$82k',
    workStyle: 'Remote-friendly',
    recruiter: 'Erin / Elsie',
    recruiterContact: 'erin@answersnow.com',
    interviewingManager: 'Sarah Chen',
    managerContact: 'sarah@answersnow.com',
    interviewDate: '2026-04-02T10:00',
    interviewStage: '3rd round pending',
    prepStatus: 'Ready',
    desireRank: 5,
    jobDescription: '',
    notes: 'Strong fit. Keep top priority and follow up if no update by follow-up date.',
    offerAmount: '',
    decisionNotes: '',
    archiveReason: '',
    archiveDetail: '',
    history: [
      createHistoryEntry('Applied via LinkedIn', 'Submitted profile and resume.', 'Applied', '2026-03-15'),
      createHistoryEntry('Completed 2nd interview', 'Leadership and operations deep dive.', 'Interview', '2026-03-24'),
    ],
  },
  {
    id: 2,
    company: 'InsightTech',
    role: 'Patient Engagement Specialist',
    source: 'Company Site',
    appliedOn: '2026-03-18',
    followUpOn: '2026-04-03',
    stage: 'Scheduled 2nd Interview',
    priority: 'High',
    fitScore: 88,
    salary: '$65k – $78k',
    salaryTargeted: '$74k',
    workStyle: 'Hybrid',
    recruiter: 'Lena',
    recruiterContact: 'lena.r@insighttech.io',
    interviewingManager: '',
    managerContact: '',
    interviewDate: '2026-04-04T13:00',
    interviewStage: '2nd round scheduled',
    prepStatus: 'Light prep',
    desireRank: 4,
    jobDescription: '',
    notes: 'Round 1 completed. Prep technical talking points and referral flow examples.',
    offerAmount: '',
    decisionNotes: '',
    archiveReason: '',
    archiveDetail: '',
    history: [
      createHistoryEntry('Applied on company site', 'Submitted directly from careers page.', 'Applied', '2026-03-18'),
      createHistoryEntry('Round 2 scheduled', 'Invite received from recruiter.', 'Interview', '2026-03-29'),
    ],
  },
]

const quickAddDefaults: QuickAddForm = {
  company: '',
  role: '',
  source: 'LinkedIn',
  salary: '',
  appliedOn: getTodayIso(),
}

/* ─── SVG Icons ─────────────────────────────────── */
function DashboardIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
      <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
      <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
      <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
    </svg>
  )
}
function TrackerIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2.5" width="13" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="1" y="6.6" width="13" height="1.8" rx="0.9" fill="currentColor"/>
      <rect x="1" y="10.7" width="13" height="1.8" rx="0.9" fill="currentColor"/>
    </svg>
  )
}
function PipelineIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2" width="3.5" height="11" rx="1" fill="currentColor"/>
      <rect x="5.75" y="4" width="3.5" height="9" rx="1" fill="currentColor"/>
      <rect x="10.5" y="6" width="3.5" height="7" rx="1" fill="currentColor"/>
    </svg>
  )
}
function InterviewsIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}
function CalendarIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
      <path d="M1 6h13" stroke="currentColor" strokeWidth="1.2"/>
      <path d="M5 1.5v2.5M10 1.5v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}
function ArchiveIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
      <rect x="1" y="2" width="13" height="2.8" rx="1" fill="currentColor"/>
      <path d="M2.5 4.8V12a1 1 0 001 1h8a1 1 0 001-1V4.8" stroke="currentColor" strokeWidth="1.4"/>
      <path d="M5.5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
    </svg>
  )
}

const navIcons: Record<View, () => React.ReactElement> = {
  dashboard:  DashboardIcon,
  tracker:    TrackerIcon,
  pipeline:   PipelineIcon,
  interviews: InterviewsIcon,
  calendar:   CalendarIcon,
  archive:    ArchiveIcon,
}

/* ─── App ───────────────────────────────────────── */
function App() {
  const [applications, setApplications] = useState<Application[]>(() => {
    if (typeof window === 'undefined') return sampleApplications
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return sampleApplications
    // Migrate old data: fill missing fields with defaults
    return (JSON.parse(saved) as Application[]).map((a) => ({ ...appDefaults, ...a }))
  })
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedId, setSelectedId] = useState<number>(() => sampleApplications[0].id)
  const [detailTab, setDetailTab] = useState<DetailTab>('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<'All' | Stage>('All')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(quickAddDefaults)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  useEffect(() => {
    if (!applications.length) return
    if (!applications.some((a) => a.id === selectedId)) {
      setSelectedId(applications[0].id)
    }
  }, [applications, selectedId])

  const activeApplications = applications.filter((a) => a.stage !== 'Archived')
  const archivedApplications = applications.filter((a) => a.stage === 'Archived')
  const selectedApplication = applications.find((a) => a.id === selectedId) ?? applications[0] ?? null
  const upcomingInterviews = activeApplications
    .filter((a) => a.interviewDate)
    .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
  const needsAttention = activeApplications.filter((a) => isStalled(a) || isDue(a.followUpOn))
  const interviewingCount = activeApplications.filter(
    (a) => a.stage.includes('Interview') || a.stage === 'Recruiter Screen',
  ).length
  // Top picks: ranked applications sorted by desireRank desc
  const topPicks = [...activeApplications]
    .filter((a) => a.desireRank > 0)
    .sort((a, b) => b.desireRank - a.desireRank)
    .slice(0, 5)

  const filteredTracker = useMemo(
    () =>
      activeApplications.filter((a) => {
        const byStage = stageFilter === 'All' || a.stage === stageFilter
        const term = searchTerm.trim().toLowerCase()
        const byText =
          !term ||
          [a.company, a.role, a.source, a.notes, a.recruiter, a.interviewingManager]
            .join(' ')
            .toLowerCase()
            .includes(term)
        return byStage && byText
      }),
    [activeApplications, searchTerm, stageFilter],
  )

  const pipelineBuckets: Array<{ title: string; stages: Stage[] }> = [
    { title: 'Applied', stages: ['Saved', 'Application Submitted', 'Follow-Up 1', 'Follow-Up 2', 'Waiting on response'] },
    {
      title: 'Interviewing',
      stages: [
        'Recruiter Screen',
        'Scheduled 1st Interview', 'Completed 1st Interview',
        'Scheduled 2nd Interview', 'Completed 2nd Interview',
        'Scheduled 3rd Interview', 'Completed 3rd Interview',
        'Scheduled 4th Interview', 'Completed 4th Interview',
      ],
    },
    { title: 'Decision', stages: ['Offer made', 'Offer accepted', 'Offer declined', 'No response'] },
  ]

  function updateApplication(id: number, changes: Partial<Application>) {
    setApplications((curr) => curr.map((a) => (a.id === id ? { ...a, ...changes } : a)))
  }

  function appendHistory(id: number, entry: HistoryEntry) {
    setApplications((curr) =>
      curr.map((a) => (a.id === id ? { ...a, history: [entry, ...a.history] } : a)),
    )
  }

  function handleStageChange(application: Application, nextStage: Stage) {
    if (application.stage === nextStage) return
    updateApplication(application.id, {
      stage: nextStage,
      archiveReason: nextStage === 'Archived' ? application.archiveReason || 'Other' : application.archiveReason,
    })
    appendHistory(
      application.id,
      createHistoryEntry(
        `Moved to ${nextStage}`,
        `Stage changed from ${application.stage} to ${nextStage}.`,
        nextStage === 'Archived' ? 'Archive' : 'Status',
      ),
    )
    // Auto-switch to Offer tab when offer stage reached
    if (['Offer made', 'Offer accepted', 'Offer declined'].includes(nextStage)) {
      setDetailTab('offer')
    }
  }

  function handleQuickAdd(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!quickAddForm.company.trim() || !quickAddForm.role.trim()) return
    const newApp: Application = {
      id: Date.now(),
      company: quickAddForm.company.trim(),
      role: quickAddForm.role.trim(),
      source: quickAddForm.source,
      appliedOn: quickAddForm.appliedOn,
      followUpOn: addDays(quickAddForm.appliedOn, 7),
      stage: 'Application Submitted',
      priority: 'Medium',
      fitScore: 3,
      salary: quickAddForm.salary.trim() || 'TBD',
      salaryTargeted: '',
      workStyle: 'Unknown',
      recruiter: '',
      recruiterContact: '',
      interviewingManager: '',
      managerContact: '',
      interviewDate: '',
      interviewStage: 'No interview yet',
      prepStatus: 'Not started',
      desireRank: 0,
      jobDescription: '',
      notes: '',
      offerAmount: '',
      decisionNotes: '',
      archiveReason: '',
      archiveDetail: '',
      history: [createHistoryEntry('Quick add', 'Created from dashboard quick add.', 'Applied', quickAddForm.appliedOn)],
    }
    setApplications((curr) => [newApp, ...curr])
    setSelectedId(newApp.id)
    setQuickAddForm(quickAddDefaults)
    setQuickAddOpen(false)
    setActiveView('tracker')
  }

  function deleteApplication(id: number) {
    setApplications((curr) => curr.filter((a) => a.id !== id))
  }

  function exportToCSV() {
    const headers = ['Company', 'Role', 'Stage', 'Priority', 'Desire Rank', 'Listed Pay', 'Target Pay', 'Follow Up', 'Interview Date', 'Recruiter', 'Manager', 'Source']
    const rows = applications.map((a) => [
      a.company, a.role, a.stage, a.priority, a.desireRank,
      a.salary, a.salaryTargeted, a.followUpOn, a.interviewDate,
      a.recruiter, a.interviewingManager, a.source,
    ])
    const csv = [headers, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'nextround-export.csv'
    link.click()
  }

  return (
    <div className="app-shell">
      {/* ─── Sidebar ─── */}
      <aside className="left-nav">
        <div className="brand">
          <p className="brand-kicker">NextRound</p>
          <h1>CRM Tracker</h1>
          <p>Track every opportunity.</p>
        </div>

        <div className="nav-metrics">
          <article><span>Active</span><strong>{activeApplications.length}</strong></article>
          <article><span>Interviewing</span><strong>{interviewingCount}</strong></article>
          <article><span>Attention</span><strong>{needsAttention.length}</strong></article>
          <article><span>Archived</span><strong>{archivedApplications.length}</strong></article>
        </div>

        <nav className="main-nav">
          {(['dashboard', 'tracker', 'pipeline', 'interviews', 'calendar', 'archive'] as View[]).map((view) => {
            const Icon = navIcons[view]
            return (
              <button
                key={view}
                className={activeView === view ? 'nav-link active' : 'nav-link'}
                onClick={() => setActiveView(view)}
              >
                <Icon />
                {view}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ─── Workspace ─── */}
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <h2>{viewTitle(activeView)}</h2>
            <p>{viewSubtitle(activeView)}</p>
          </div>
          <div className="header-actions">
            <button className="ghost-button" onClick={exportToCSV}>Export CSV</button>
            <button className="primary-button" onClick={() => setQuickAddOpen((v) => !v)}>
              + Quick add
            </button>
          </div>
        </header>

        {/* ─── Quick add slide-in ─── */}
        {quickAddOpen && (
          <>
            <div className="quick-add-overlay" onClick={() => setQuickAddOpen(false)} />
            <div className="quick-add-panel">
              <h3>Add a role</h3>
              <form className="quick-add-form" onSubmit={handleQuickAdd}>
                <label>
                  Company
                  <input autoFocus value={quickAddForm.company}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, company: e.target.value }))} />
                </label>
                <label>
                  Role title
                  <input value={quickAddForm.role}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, role: e.target.value }))} />
                </label>
                <label>
                  Platform
                  <select value={quickAddForm.source}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, source: e.target.value }))}>
                    <option>LinkedIn</option>
                    <option>Company Site</option>
                    <option>Referral</option>
                    <option>Indeed</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Listed pay range
                  <input value={quickAddForm.salary} placeholder="e.g. $70k–$90k"
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, salary: e.target.value }))} />
                </label>
                <label>
                  Applied on
                  <input type="date" value={quickAddForm.appliedOn}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, appliedOn: e.target.value }))} />
                </label>
                <button type="submit" className="primary-button full-width">Add role</button>
              </form>
            </div>
          </>
        )}

        {/* ─── Dashboard ─── */}
        {activeView === 'dashboard' && (
          <section className="dashboard-grid">
            <article className="panel-card">
              <h3>Needs attention</h3>
              <div className="list-stack">
                {needsAttention.length ? (
                  needsAttention.slice(0, 6).map((a) => (
                    <button key={a.id} className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                      <div>
                        <strong>{a.company}</strong>
                        <p>{a.role}</p>
                      </div>
                      <span>{formatFollowUp(a.followUpOn)}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty">No urgent follow-ups right now.</p>
                )}
              </div>
            </article>

            <article className="panel-card">
              <h3>Upcoming interviews</h3>
              <div className="list-stack">
                {upcomingInterviews.length ? (
                  upcomingInterviews.slice(0, 6).map((a) => (
                    <button key={a.id} className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('interviews') }}>
                      <div>
                        <strong>{a.company}</strong>
                        <p>{a.role}</p>
                      </div>
                      <span>{formatDateTime(a.interviewDate)}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty">No interviews scheduled.</p>
                )}
              </div>
            </article>

            {/* Top Picks — ranked by desire */}
            <article className="panel-card">
              <h3>Top picks</h3>
              <div className="list-stack">
                {topPicks.length ? (
                  topPicks.map((a) => (
                    <button key={a.id} className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                      <div>
                        <strong>{a.company}</strong>
                        <p>{a.role}</p>
                        <div className="desire-stars-sm">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={`star-sm${a.desireRank >= n ? ' filled' : ''}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                    </button>
                  ))
                ) : (
                  <p className="empty">Rate your desire (1–5 ★) in any role to see top picks here.</p>
                )}
              </div>
            </article>
          </section>
        )}

        {/* ─── Tracker ─── */}
        {activeView === 'tracker' && (
          <section className="tracker-layout">
            <article className="panel-card tracker-table-wrap">
              <div className="tracker-toolbar">
                <input placeholder="Search company, role, recruiter…"
                  value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
                <select value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as 'All' | Stage)}>
                  <option>All</option>
                  {stageOptions.filter((s) => s !== 'Archived').map((s) => (
                    <option key={s}>{s}</option>
                  ))}
                </select>
              </div>

              <div className="tracker-table">
                <div className="tracker-head">
                  <span>Company / Role</span>
                  <span>Stage</span>
                  <span>Priority</span>
                  <span>Follow-up</span>
                  <span>Recruiter / Manager</span>
                </div>
                {filteredTracker.map((a) => (
                  <button
                    key={a.id}
                    className={[
                      'tracker-row',
                      a.id === selectedId ? 'active' : '',
                      `priority-border-${a.priority.toLowerCase()}`,
                    ].join(' ')}
                    onClick={() => { setSelectedId(a.id); setDetailTab('overview') }}
                  >
                    <div>
                      <strong>{a.company}</strong>
                      <p>{a.role}</p>
                      {a.desireRank > 0 && (
                        <div className="desire-dots">
                          {[1, 2, 3, 4, 5].map((n) => (
                            <span key={n} className={`desire-dot${a.desireRank >= n ? ' filled' : ''}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Click the stage pill directly to change it */}
                    <div className="stage-pill-wrap">
                      <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                      <select className="stage-pill-select" value={a.stage} title="Change stage"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); handleStageChange(a, e.target.value as Stage) }}>
                        {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <span>
                      <span className={`priority-badge priority-${a.priority.toLowerCase()}`}>{a.priority}</span>
                    </span>
                    <span>{formatFollowUp(a.followUpOn)}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)' }}>
                      {a.recruiter || a.interviewingManager || '—'}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            {/* ─── Detail panel ─── */}
            {selectedApplication && (
              <article className="panel-card detail-panel">
                {/* Header */}
                <div className="detail-title">
                  <div>
                    <h3>{selectedApplication.company}</h3>
                    <p>{selectedApplication.role}</p>
                  </div>
                  <span className={`stage-pill ${stageTone(selectedApplication.stage)}`}>
                    {selectedApplication.stage}
                  </span>
                </div>

                {/* Tabs */}
                <div className="detail-tabs">
                  {(['overview', 'contact', 'job', 'offer'] as DetailTab[]).map((tab) => (
                    <button key={tab} className={`detail-tab${detailTab === tab ? ' active' : ''}`}
                      onClick={() => setDetailTab(tab)}>
                      {tab === 'offer' ? 'Offer' : tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* ── Overview tab ── */}
                {detailTab === 'overview' && (
                  <div className="detail-tab-body">
                    <div className="detail-grid">
                      <label>
                        Stage
                        <select value={selectedApplication.stage}
                          onChange={(e) => handleStageChange(selectedApplication, e.target.value as Stage)}>
                          {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label>
                        Priority
                        <select value={selectedApplication.priority}
                          onChange={(e) => updateApplication(selectedApplication.id, { priority: e.target.value as Application['priority'] })}>
                          <option>High</option>
                          <option>Medium</option>
                          <option>Low</option>
                        </select>
                      </label>
                      <label>
                        Follow-up date
                        <input type="date" value={selectedApplication.followUpOn}
                          onChange={(e) => updateApplication(selectedApplication.id, { followUpOn: e.target.value })} />
                      </label>
                      <label>
                        Interview date
                        <input type="datetime-local" value={selectedApplication.interviewDate}
                          onChange={(e) => updateApplication(selectedApplication.id, { interviewDate: e.target.value })} />
                      </label>
                      <label>
                        Prep status
                        <select value={selectedApplication.prepStatus}
                          onChange={(e) => updateApplication(selectedApplication.id, { prepStatus: e.target.value as Application['prepStatus'] })}>
                          <option>Not started</option>
                          <option>Light prep</option>
                          <option>Ready</option>
                        </select>
                      </label>
                    </div>

                    {/* Desire rank */}
                    <div className="desire-rank-row">
                      <label>How much do you want this?</label>
                      {[1, 2, 3, 4, 5].map((n) => (
                        <button key={n} className={`desire-star-btn${selectedApplication.desireRank >= n ? ' filled' : ''}`}
                          onClick={() => updateApplication(selectedApplication.id, {
                            desireRank: selectedApplication.desireRank === n ? 0 : n,
                          })}>
                          ★
                        </button>
                      ))}
                    </div>

                    <label className="notes-field">
                      Notes
                      <textarea value={selectedApplication.notes}
                        onChange={(e) => updateApplication(selectedApplication.id, { notes: e.target.value })} />
                    </label>

                    {selectedApplication.stage === 'Archived' && (
                      <div className="detail-grid">
                        <label>
                          Archive reason
                          <select value={selectedApplication.archiveReason}
                            onChange={(e) => updateApplication(selectedApplication.id, { archiveReason: e.target.value })}>
                            <option value="">Select reason</option>
                            {archiveReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </label>
                        <label>
                          Archive detail
                          <input value={selectedApplication.archiveDetail}
                            onChange={(e) => updateApplication(selectedApplication.id, { archiveDetail: e.target.value })} />
                        </label>
                      </div>
                    )}

                    <div className="detail-actions">
                      <button className="ghost-button"
                        onClick={() => handleStageChange(selectedApplication, getNextStage(selectedApplication.stage))}>
                        Next stage
                      </button>
                      <button className="ghost-button"
                        onClick={() => handleStageChange(selectedApplication, 'Archived')}>
                        Archive
                      </button>
                      <button className="ghost-button danger"
                        onClick={() => deleteApplication(selectedApplication.id)}>
                        Delete
                      </button>
                    </div>
                  </div>
                )}

                {/* ── Contact tab ── */}
                {detailTab === 'contact' && (
                  <div className="detail-tab-body">
                    <div className="contact-grid">
                      <label>
                        Recruiter name
                        <input value={selectedApplication.recruiter}
                          onChange={(e) => updateApplication(selectedApplication.id, { recruiter: e.target.value })}
                          placeholder="Name" />
                      </label>
                      <label>
                        Recruiter contact
                        <input value={selectedApplication.recruiterContact}
                          onChange={(e) => updateApplication(selectedApplication.id, { recruiterContact: e.target.value })}
                          placeholder="Email, phone, or LinkedIn" />
                      </label>
                    </div>
                    <div className="section-divider" />
                    <div className="contact-grid">
                      <label>
                        Interviewing manager / hiring lead
                        <input value={selectedApplication.interviewingManager}
                          onChange={(e) => updateApplication(selectedApplication.id, { interviewingManager: e.target.value })}
                          placeholder="Name" />
                      </label>
                      <label>
                        Manager contact
                        <input value={selectedApplication.managerContact}
                          onChange={(e) => updateApplication(selectedApplication.id, { managerContact: e.target.value })}
                          placeholder="Email, phone, or LinkedIn" />
                      </label>
                    </div>
                  </div>
                )}

                {/* ── Job details tab ── */}
                {detailTab === 'job' && (
                  <div className="detail-tab-body">
                    <div className="detail-grid">
                      <label>
                        Listed pay range
                        <input value={selectedApplication.salary}
                          onChange={(e) => updateApplication(selectedApplication.id, { salary: e.target.value })}
                          placeholder="e.g. $70k–$90k" />
                      </label>
                      <label>
                        Your target pay
                        <input value={selectedApplication.salaryTargeted}
                          onChange={(e) => updateApplication(selectedApplication.id, { salaryTargeted: e.target.value })}
                          placeholder="e.g. $82k" />
                      </label>
                      <label>
                        Work style
                        <input value={selectedApplication.workStyle}
                          onChange={(e) => updateApplication(selectedApplication.id, { workStyle: e.target.value })}
                          placeholder="Remote / Hybrid / On-site" />
                      </label>
                      <label>
                        Source
                        <select value={selectedApplication.source}
                          onChange={(e) => updateApplication(selectedApplication.id, { source: e.target.value })}>
                          <option>LinkedIn</option>
                          <option>Company Site</option>
                          <option>Referral</option>
                          <option>Indeed</option>
                          <option>Other</option>
                        </select>
                      </label>
                    </div>
                    <label className="notes-field">
                      Job description
                      <textarea value={selectedApplication.jobDescription}
                        onChange={(e) => updateApplication(selectedApplication.id, { jobDescription: e.target.value })}
                        placeholder="Paste job description here for reference…"
                        style={{ minHeight: '120px' }} />
                    </label>
                  </div>
                )}

                {/* ── Offer tab ── */}
                {detailTab === 'offer' && (
                  <div className="detail-tab-body">
                    {['Offer made', 'Offer accepted', 'Offer declined'].includes(selectedApplication.stage) ? (
                      <div className="offer-section">
                        <p className="offer-section-title">
                          {selectedApplication.stage === 'Offer accepted' ? '✓ Offer accepted' :
                           selectedApplication.stage === 'Offer declined' ? '✕ Offer declined' :
                           'Offer received'}
                        </p>
                        <label>
                          Offer amount
                          <input value={selectedApplication.offerAmount}
                            onChange={(e) => updateApplication(selectedApplication.id, { offerAmount: e.target.value })}
                            placeholder="e.g. $85,000 + $5k signing" />
                        </label>
                        <label className="notes-field">
                          Decision notes — pros, cons, factors
                          <textarea value={selectedApplication.decisionNotes}
                            onChange={(e) => updateApplication(selectedApplication.id, { decisionNotes: e.target.value })}
                            placeholder="Write out the pros, cons, salary comparison, culture fit, growth potential…"
                            style={{ minHeight: '100px' }} />
                        </label>
                        {selectedApplication.stage === 'Offer made' && (
                          <div className="offer-actions">
                            <button className="ghost-button success"
                              onClick={() => handleStageChange(selectedApplication, 'Offer accepted')}>
                              Accept offer
                            </button>
                            <button className="ghost-button danger"
                              onClick={() => handleStageChange(selectedApplication, 'Offer declined')}>
                              Decline offer
                            </button>
                          </div>
                        )}
                      </div>
                    ) : (
                      <div>
                        <p className="empty" style={{ marginBottom: '12px' }}>
                          No offer yet. When a company makes an offer, move the stage to "Offer made" and all your offer tracking will appear here.
                        </p>
                        <button className="ghost-button success"
                          onClick={() => handleStageChange(selectedApplication, 'Offer made')}>
                          Mark as offer made
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </article>
            )}
          </section>
        )}

        {/* ─── Pipeline ─── */}
        {activeView === 'pipeline' && (
          <section className="pipeline-grid">
            {pipelineBuckets.map((bucket) => {
              const bucketApps = activeApplications.filter((a) => bucket.stages.includes(a.stage))
              return (
                <article key={bucket.title} className="panel-card pipeline-column">
                  <div className="column-title">
                    <h3>{bucket.title}</h3>
                    <span>{bucketApps.length}</span>
                  </div>
                  <div className="column-list">
                    {bucketApps.length ? (
                      bucketApps.map((a) => (
                        <button key={a.id} className="pipeline-card"
                          onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                          <strong>{a.company}</strong>
                          <p>{a.role}</p>
                          <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                        </button>
                      ))
                    ) : (
                      <p className="empty">No roles here yet.</p>
                    )}
                  </div>
                </article>
              )
            })}
          </section>
        )}

        {/* ─── Interviews ─── */}
        {activeView === 'interviews' && (
          <section className="panel-card interviews-table">
            <div className="tracker-head">
              <span>Company / Role</span>
              <span>Interview</span>
              <span>Prep</span>
              <span>Status</span>
              <span></span>
            </div>
            {upcomingInterviews.length ? (
              upcomingInterviews.map((a) => (
                <button key={a.id} className="tracker-row"
                  onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                  <div><strong>{a.company}</strong><p>{a.role}</p></div>
                  <span>{formatDateTime(a.interviewDate)}</span>
                  <span>{a.prepStatus}</span>
                  <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                  <span></span>
                </button>
              ))
            ) : (
              <p className="empty" style={{ padding: '16px' }}>No interviews scheduled yet.</p>
            )}
          </section>
        )}

        {/* ─── Calendar ─── */}
        {activeView === 'calendar' && (
          <div className="panel-card">
            <CalendarView applications={activeApplications} />
          </div>
        )}

        {/* ─── Archive ─── */}
        {activeView === 'archive' && (
          <section className="panel-card interviews-table">
            <div className="tracker-head">
              <span>Company / Role</span>
              <span>Reason</span>
              <span>Detail</span>
              <span></span>
              <span></span>
            </div>
            {archivedApplications.length ? (
              archivedApplications.map((a) => (
                <div key={a.id} className="tracker-row static-row">
                  <div><strong>{a.company}</strong><p>{a.role}</p></div>
                  <span>{a.archiveReason || 'Not set'}</span>
                  <span>{a.archiveDetail || '—'}</span>
                  <span></span>
                  <button className="ghost-button"
                    onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                    Open
                  </button>
                </div>
              ))
            ) : (
              <p className="empty" style={{ padding: '16px' }}>Nothing archived yet.</p>
            )}
          </section>
        )}
      </main>
    </div>
  )
}

/* ─── Calendar View ─────────────────────────────── */
function CalendarView({ applications }: { applications: Application[] }) {
  const [calDate, setCalDate] = useState(new Date())
  const year  = calDate.getFullYear()
  const month = calDate.getMonth()

  // Build maps: dateStr → list of events
  const interviewMap = new Map<string, string[]>()
  const followUpMap  = new Map<string, string[]>()
  const offerMap     = new Map<string, string[]>()

  applications.forEach((a) => {
    if (a.interviewDate) {
      const k = a.interviewDate.slice(0, 10)
      interviewMap.set(k, [...(interviewMap.get(k) ?? []), a.company])
    }
    if (a.followUpOn) {
      followUpMap.set(a.followUpOn, [...(followUpMap.get(a.followUpOn) ?? []), a.company])
    }
    if (['Offer made', 'Offer accepted'].includes(a.stage) && a.interviewDate) {
      const k = a.interviewDate.slice(0, 10)
      offerMap.set(k, [...(offerMap.get(k) ?? []), a.company])
    }
  })

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()

  const today    = new Date()
  const todayStr = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`

  const monthLabel = calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })

  return (
    <div className="calendar-wrap">
      <div className="calendar-nav">
        <button className="ghost-button" onClick={() => setCalDate(new Date(year, month - 1, 1))}>‹ Prev</button>
        <h3>{monthLabel}</h3>
        <button className="ghost-button" onClick={() => setCalDate(new Date(year, month + 1, 1))}>Next ›</button>
      </div>

      <div className="cal-grid">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((d) => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}

        {/* Empty cells before month starts */}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`empty-${i}`} className="cal-cell empty" />
        ))}

        {/* Day cells */}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`
          const interviews = interviewMap.get(dateStr) ?? []
          const followUps  = followUpMap.get(dateStr)  ?? []
          const offers     = offerMap.get(dateStr)     ?? []
          const isToday    = dateStr === todayStr

          return (
            <div key={dateStr} className={`cal-cell${isToday ? ' today' : ''}`}>
              <span className="cal-day-num">{day}</span>
              <div className="cal-events">
                {interviews.map((co, i) => (
                  <span key={`iv-${i}`} className="cal-event interview" title={`${co} — Interview`}>{co}</span>
                ))}
                {offers.map((co, i) => (
                  <span key={`of-${i}`} className="cal-event offer" title={`${co} — Offer`}>{co} (offer)</span>
                ))}
                {followUps.map((co, i) => (
                  <span key={`fu-${i}`} className="cal-event followup" title={`${co} — Follow-up`}>{co}</span>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-legend-dot interview" />Interviews</div>
        <div className="cal-legend-item"><div className="cal-legend-dot followup" />Follow-ups</div>
        <div className="cal-legend-item"><div className="cal-legend-dot offer" />Offers</div>
      </div>
    </div>
  )
}

/* ─── Helper functions ──────────────────────────── */
function viewTitle(view: View) {
  if (view === 'dashboard')  return 'Command Center'
  if (view === 'tracker')    return 'Application Tracker'
  if (view === 'pipeline')   return 'Pipeline Flow'
  if (view === 'interviews') return 'Interview Calendar'
  if (view === 'calendar')   return 'Calendar'
  return 'Archive History'
}

function viewSubtitle(view: View) {
  if (view === 'dashboard')  return 'Quick pulse on follow-ups, top picks, and upcoming conversations.'
  if (view === 'tracker')    return 'Full job board — click a stage pill to change it instantly.'
  if (view === 'pipeline')   return 'Visual grouping by where each application currently stands.'
  if (view === 'interviews') return 'Everything scheduled so prep never slips through.'
  if (view === 'calendar')   return 'Interview dates and follow-ups laid out by month.'
  return 'Closed outcomes with reasons so you can spot patterns over time.'
}

function getNextStage(stage: Stage): Stage {
  const index = stageOptions.indexOf(stage)
  if (index === -1 || index === stageOptions.length - 1) return stage
  return stageOptions[index + 1]
}

function stageTone(stage: Stage) {
  if (stage === 'Offer accepted' || stage === 'Offer made') return 'tone-success'
  if (stage === 'Offer declined' || stage === 'No response' || stage === 'Archived') return 'tone-muted'
  if (stage.includes('Interview') || stage === 'Recruiter Screen') return 'tone-accent'
  if (stage.includes('Follow-Up') || stage === 'Waiting on response') return 'tone-warning'
  return 'tone-base'
}

function isStalled(application: Application) {
  if (application.stage === 'Archived') return false
  return daysSince(application.appliedOn) >= 7 && application.stage !== 'Offer accepted'
}

function isDue(date: string) {
  if (!date) return false
  return new Date(date) <= new Date()
}

function formatFollowUp(date: string) {
  if (!date) return 'No follow-up'
  const days = daysUntil(date)
  if (days < 0) return `Overdue ${Math.abs(days)}d`
  if (days === 0) return 'Due today'
  return `In ${days}d`
}

function formatDateTime(date: string) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit',
  }).format(new Date(date))
}

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function createHistoryEntry(label: string, detail: string, type: HistoryType, date?: string): HistoryEntry {
  return {
    id: Date.now() + Math.floor(Math.random() * 1000),
    label, detail, type,
    date: date ?? getTodayIso(),
  }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

export default App
