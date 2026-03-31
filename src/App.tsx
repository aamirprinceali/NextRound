import React, { useEffect, useMemo, useState } from 'react'
import type { FormEvent } from 'react'
import './App.css'

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

type View = 'dashboard' | 'tracker' | 'pipeline' | 'interviews' | 'archive'

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
  salary: string
  workStyle: string
  recruiter: string
  interviewDate: string
  interviewStage: string
  prepStatus: 'Not started' | 'Light prep' | 'Ready'
  notes: string
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
    salary: '$70k - $90k',
    workStyle: 'Remote-friendly',
    recruiter: 'Erin / Elsie',
    interviewDate: '2026-04-02T10:00',
    interviewStage: '3rd round pending',
    prepStatus: 'Ready',
    notes: 'Strong fit. Keep top priority and follow up if no update by follow-up date.',
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
    salary: '$65k - $78k',
    workStyle: 'Hybrid',
    recruiter: 'Lena',
    interviewDate: '2026-04-04T13:00',
    interviewStage: '2nd round scheduled',
    prepStatus: 'Light prep',
    notes: 'Round 1 completed. Prep technical talking points and referral flow examples.',
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

/* ─── SVG Nav Icons ─────────────────────────────── */
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
  dashboard: DashboardIcon,
  tracker: TrackerIcon,
  pipeline: PipelineIcon,
  interviews: InterviewsIcon,
  archive: ArchiveIcon,
}

/* ─── App ───────────────────────────────────────── */
function App() {
  const [applications, setApplications] = useState<Application[]>(() => {
    if (typeof window === 'undefined') return sampleApplications
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return sampleApplications
    return JSON.parse(saved) as Application[]
  })
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [selectedId, setSelectedId] = useState<number>(() => sampleApplications[0].id)
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
  const interviewingCount = activeApplications.filter((a) =>
    a.stage.includes('Interview') || a.stage === 'Recruiter Screen',
  ).length

  const filteredTracker = useMemo(
    () =>
      activeApplications.filter((a) => {
        const byStage = stageFilter === 'All' || a.stage === stageFilter
        const term = searchTerm.trim().toLowerCase()
        const byText =
          !term ||
          [a.company, a.role, a.source, a.notes].join(' ').toLowerCase().includes(term)
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
        'Scheduled 1st Interview',
        'Completed 1st Interview',
        'Scheduled 2nd Interview',
        'Completed 2nd Interview',
        'Scheduled 3rd Interview',
        'Completed 3rd Interview',
        'Scheduled 4th Interview',
        'Completed 4th Interview',
      ],
    },
    { title: 'Decision', stages: ['Offer made', 'Offer accepted', 'Offer declined', 'No response'] },
  ]

  function updateApplication(id: number, changes: Partial<Application>) {
    setApplications((curr) =>
      curr.map((a) => (a.id === id ? { ...a, ...changes } : a)),
    )
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
      workStyle: 'Unknown',
      recruiter: '',
      interviewDate: '',
      interviewStage: 'No interview yet',
      prepStatus: 'Not started',
      notes: '',
      archiveReason: '',
      archiveDetail: '',
      history: [
        createHistoryEntry('Quick add', 'Created from dashboard quick add.', 'Applied', quickAddForm.appliedOn),
      ],
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
    const headers = ['Company', 'Role', 'Stage', 'Follow Up', 'Interview Date', 'Source', 'Salary']
    const rows = applications.map((a) => [
      a.company, a.role, a.stage, a.followUpOn, a.interviewDate, a.source, a.salary,
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
      {/* ── Sidebar ── */}
      <aside className="left-nav">
        <div className="brand">
          <p className="brand-kicker">NextRound</p>
          <h1>CRM Tracker</h1>
          <p>Track every opportunity and follow-up.</p>
        </div>

        {/* Compact metrics */}
        <div className="nav-metrics">
          <article>
            <span>Active</span>
            <strong>{activeApplications.length}</strong>
          </article>
          <article>
            <span>Interviewing</span>
            <strong>{interviewingCount}</strong>
          </article>
          <article>
            <span>Attention</span>
            <strong>{needsAttention.length}</strong>
          </article>
          <article>
            <span>Archived</span>
            <strong>{archivedApplications.length}</strong>
          </article>
        </div>

        {/* Navigation */}
        <nav className="main-nav">
          {(['dashboard', 'tracker', 'pipeline', 'interviews', 'archive'] as View[]).map((view) => {
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

      {/* ── Main workspace ── */}
      <main className="workspace">
        <header className="workspace-header">
          <div>
            <h2>{viewTitle(activeView)}</h2>
            <p>{viewSubtitle(activeView)}</p>
          </div>
          <div className="header-actions">
            <button className="ghost-button" onClick={exportToCSV}>
              Export CSV
            </button>
            <button className="primary-button" onClick={() => setQuickAddOpen((v) => !v)}>
              + Quick add
            </button>
          </div>
        </header>

        {/* ── Quick add slide-in panel ── */}
        {quickAddOpen && (
          <>
            <div className="quick-add-overlay" onClick={() => setQuickAddOpen(false)} />
            <div className="quick-add-panel">
              <h3>Add a role</h3>
              <form className="quick-add-form" onSubmit={handleQuickAdd}>
                <label>
                  Company
                  <input
                    autoFocus
                    value={quickAddForm.company}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, company: e.target.value }))}
                  />
                </label>
                <label>
                  Role
                  <input
                    value={quickAddForm.role}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, role: e.target.value }))}
                  />
                </label>
                <label>
                  Platform
                  <select
                    value={quickAddForm.source}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, source: e.target.value }))}
                  >
                    <option>LinkedIn</option>
                    <option>Company Site</option>
                    <option>Referral</option>
                    <option>Indeed</option>
                    <option>Other</option>
                  </select>
                </label>
                <label>
                  Pay range
                  <input
                    value={quickAddForm.salary}
                    placeholder="e.g. $70k–$90k"
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, salary: e.target.value }))}
                  />
                </label>
                <label>
                  Applied on
                  <input
                    type="date"
                    value={quickAddForm.appliedOn}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, appliedOn: e.target.value }))}
                  />
                </label>
                <button type="submit" className="primary-button full-width">
                  Add role
                </button>
              </form>
            </div>
          </>
        )}

        {/* ── Dashboard ── */}
        {activeView === 'dashboard' && (
          <section className="dashboard-grid">
            <article className="panel-card">
              <h3>Needs attention</h3>
              <div className="list-stack">
                {needsAttention.length ? (
                  needsAttention.slice(0, 6).map((a) => (
                    <button
                      key={a.id}
                      className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}
                    >
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
                    <button
                      key={a.id}
                      className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('interviews') }}
                    >
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
          </section>
        )}

        {/* ── Tracker (main job board) ── */}
        {activeView === 'tracker' && (
          <section className="tracker-layout">
            <article className="panel-card tracker-table-wrap">
              <div className="tracker-toolbar">
                <input
                  placeholder="Search company, role, notes…"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
                <select
                  value={stageFilter}
                  onChange={(e) => setStageFilter(e.target.value as 'All' | Stage)}
                >
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
                  <span>Interview</span>
                </div>
                {filteredTracker.map((a) => (
                  <button
                    key={a.id}
                    className={a.id === selectedId ? 'tracker-row active' : 'tracker-row'}
                    onClick={() => setSelectedId(a.id)}
                  >
                    <div>
                      <strong>{a.company}</strong>
                      <p>{a.role}</p>
                    </div>
                    {/* Clickable stage pill — click to change directly in the table */}
                    <div className="stage-pill-wrap">
                      <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                      <select
                        className="stage-pill-select"
                        value={a.stage}
                        title="Change stage"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => {
                          e.stopPropagation()
                          handleStageChange(a, e.target.value as Stage)
                        }}
                      >
                        {stageOptions.map((s) => (
                          <option key={s} value={s}>{s}</option>
                        ))}
                      </select>
                    </div>
                    <span>
                      <span className={`priority-badge priority-${a.priority.toLowerCase()}`}>
                        {a.priority}
                      </span>
                    </span>
                    <span>{formatFollowUp(a.followUpOn)}</span>
                    <span>{a.interviewDate ? formatDateTime(a.interviewDate) : '—'}</span>
                  </button>
                ))}
              </div>
            </article>

            {/* Detail panel */}
            {selectedApplication && (
              <article className="panel-card detail-panel">
                <div className="detail-title">
                  <div>
                    <h3>{selectedApplication.company}</h3>
                    <p>{selectedApplication.role}</p>
                  </div>
                  <span className={`stage-pill ${stageTone(selectedApplication.stage)}`}>
                    {selectedApplication.stage}
                  </span>
                </div>

                <div className="detail-grid">
                  <label>
                    Stage
                    <select
                      value={selectedApplication.stage}
                      onChange={(e) => handleStageChange(selectedApplication, e.target.value as Stage)}
                    >
                      {stageOptions.map((s) => (
                        <option key={s} value={s}>{s}</option>
                      ))}
                    </select>
                  </label>
                  <label>
                    Follow-up date
                    <input
                      type="date"
                      value={selectedApplication.followUpOn}
                      onChange={(e) => updateApplication(selectedApplication.id, { followUpOn: e.target.value })}
                    />
                  </label>
                  <label>
                    Interview date
                    <input
                      type="datetime-local"
                      value={selectedApplication.interviewDate}
                      onChange={(e) => updateApplication(selectedApplication.id, { interviewDate: e.target.value })}
                    />
                  </label>
                  <label>
                    Prep status
                    <select
                      value={selectedApplication.prepStatus}
                      onChange={(e) =>
                        updateApplication(selectedApplication.id, {
                          prepStatus: e.target.value as Application['prepStatus'],
                        })
                      }
                    >
                      <option>Not started</option>
                      <option>Light prep</option>
                      <option>Ready</option>
                    </select>
                  </label>
                </div>

                <label className="notes-field">
                  Notes
                  <textarea
                    value={selectedApplication.notes}
                    onChange={(e) => updateApplication(selectedApplication.id, { notes: e.target.value })}
                  />
                </label>

                {selectedApplication.stage === 'Archived' && (
                  <div className="detail-grid">
                    <label>
                      Archive reason
                      <select
                        value={selectedApplication.archiveReason}
                        onChange={(e) =>
                          updateApplication(selectedApplication.id, { archiveReason: e.target.value })
                        }
                      >
                        <option value="">Select reason</option>
                        {archiveReasons.map((r) => (
                          <option key={r} value={r}>{r}</option>
                        ))}
                      </select>
                    </label>
                    <label>
                      Archive detail
                      <input
                        value={selectedApplication.archiveDetail}
                        onChange={(e) =>
                          updateApplication(selectedApplication.id, { archiveDetail: e.target.value })
                        }
                      />
                    </label>
                  </div>
                )}

                <div className="detail-actions">
                  <button
                    className="ghost-button"
                    onClick={() => handleStageChange(selectedApplication, getNextStage(selectedApplication.stage))}
                  >
                    Next stage
                  </button>
                  <button
                    className="ghost-button"
                    onClick={() => handleStageChange(selectedApplication, 'Archived')}
                  >
                    Archive
                  </button>
                  <button
                    className="ghost-button danger"
                    onClick={() => deleteApplication(selectedApplication.id)}
                  >
                    Delete
                  </button>
                </div>
              </article>
            )}
          </section>
        )}

        {/* ── Pipeline ── */}
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
                        <button
                          key={a.id}
                          className="pipeline-card"
                          onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}
                        >
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

        {/* ── Interviews ── */}
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
                <button
                  key={a.id}
                  className="tracker-row"
                  onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}
                >
                  <div>
                    <strong>{a.company}</strong>
                    <p>{a.role}</p>
                  </div>
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

        {/* ── Archive ── */}
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
                  <div>
                    <strong>{a.company}</strong>
                    <p>{a.role}</p>
                  </div>
                  <span>{a.archiveReason || 'Not set'}</span>
                  <span>{a.archiveDetail || '—'}</span>
                  <span></span>
                  <button
                    className="ghost-button"
                    onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}
                  >
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

/* ─── Small components ──────────────────────────── */

function viewTitle(view: View) {
  if (view === 'dashboard')  return 'Command Center'
  if (view === 'tracker')    return 'Application Tracker'
  if (view === 'pipeline')   return 'Pipeline Flow'
  if (view === 'interviews') return 'Interview Calendar'
  return 'Archive History'
}

function viewSubtitle(view: View) {
  if (view === 'dashboard')  return 'Quick pulse on follow-ups and upcoming conversations.'
  if (view === 'tracker')    return 'Full job board — click a stage pill to change it instantly.'
  if (view === 'pipeline')   return 'Visual grouping by where each application currently stands.'
  if (view === 'interviews') return 'Everything scheduled so prep never slips through.'
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
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
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
    label,
    detail,
    type,
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
