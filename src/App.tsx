import { useEffect, useMemo, useState } from 'react'
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

type View = 'dashboard' | 'pipeline' | 'interviews' | 'journey' | 'archive' | 'roadmap'

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
    salary: '$70k – $90k',
    workStyle: 'Remote-friendly',
    recruiter: 'Erin / Elsie',
    interviewDate: '2026-03-24T10:00',
    interviewStage: 'Completed 2nd Interview · third round pending',
    prepStatus: 'Ready',
    notes:
      'Second interview with Erin covered enrollment operations, referral handoffs, and supporting the enrollment team as the operations lead. Erin knows I am flexible and that they are my top choice; Elsie is coordinating the next conversation.',
    archiveReason: '',
    archiveDetail: '',
    history: [
      createHistoryEntry(
        'Applied via LinkedIn',
        'Referral-powered intake leadership role for therapy enrollment and operations support.',
        'Applied',
        '2026-03-15',
      ),
      createHistoryEntry(
        'Completed 1st interview',
        'Reviewed enrollment workflows, referral to therapy, and how to balance ops with leadership.',
        'Interview',
        '2026-03-22',
      ),
      createHistoryEntry(
        'Completed 2nd interview',
        'Shared timeline flexibility, leadership philosophy, and why this is the top choice.',
        'Interview',
        '2026-03-24',
      ),
      createHistoryEntry(
        'Waiting on response',
        'Erin is coordinating a call with Elsie; I confirmed availability and mentioned they remain my priority.',
        'Waiting on response',
        '2026-03-25',
      ),
    ],
  },
  {
    id: 2,
    company: 'InsightTech',
    role: 'Patient Engagement Specialist',
    source: 'Company site',
    appliedOn: '2026-03-18',
    followUpOn: '2026-04-03',
    stage: 'Waiting on response',
    priority: 'High',
    fitScore: 88,
    salary: '$65k – $78k',
    workStyle: 'Hybrid',
    recruiter: 'Lena',
    interviewDate: '',
    interviewStage: 'Round 2 penciled in; follow-up 4/3 if no update',
    prepStatus: 'Light prep',
    notes:
      'Round 1 showcased non-invasive MRI tech for Parkinson’s and tremor referrals, and how I coach families through the conversation. Lena asked me to reach back on 4/3 if I do not hear anything.',
    archiveReason: '',
    archiveDetail: '',
    history: [
      createHistoryEntry(
        'Applied via InsightTech portal',
        'Patient engagement role supporting MRI-based Parkinson’s and tremor referrals.',
        'Applied',
        '2026-03-18',
      ),
      createHistoryEntry(
        'Completed 1st interview',
        'Talked tech, doctor relationships, and how I guide families through the process.',
        'Interview',
        '2026-03-23',
      ),
      createHistoryEntry(
        'Waiting on response',
        'Lena said round two is likely in a week and I should check back on 4/3 if silent.',
        'Waiting on response',
        '2026-03-24',
      ),
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

function App() {
  const [applications, setApplications] = useState<Application[]>(() => {
    if (typeof window === 'undefined') return sampleApplications
    const saved = window.localStorage.getItem(STORAGE_KEY)
    if (!saved) return sampleApplications
    return JSON.parse(saved) as Application[]
  })
  const [selectedId, setSelectedId] = useState<number>(() => applications[0]?.id ?? sampleApplications[0].id)
  const [searchTerm, setSearchTerm] = useState('')
  const [stageFilter, setStageFilter] = useState<'All' | Stage>('All')
  const [quickAddOpen, setQuickAddOpen] = useState(false)
  const [quickAddForm, setQuickAddForm] = useState<QuickAddForm>(quickAddDefaults)
  const [activeView, setActiveView] = useState<View>('dashboard')
  const [showPipelineBoard, setShowPipelineBoard] = useState(false)

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(applications))
  }, [applications])

  useEffect(() => {
    if (!applications.length) {
      setSelectedId(0)
      return
    }
    if (!applications.some((application) => application.id === selectedId)) {
      setSelectedId(applications[0].id)
    }
  }, [applications, selectedId])

  const activeApplications = applications.filter((application) => application.stage !== 'Archived')
  const archivedApplications = applications.filter((application) => application.stage === 'Archived')
  const followUpsDue = activeApplications.filter((application) => isDue(application.followUpOn))
  const stalledApplications = activeApplications.filter((application) => isStalled(application))
  const selectedApplication = applications.find((application) => application.id === selectedId) ?? applications[0] ?? null

  const filteredCollection = useMemo(() => {
    return applications
      .filter((application) => application.stage !== 'Archived')
      .filter((application) => {
        const matchesStage = stageFilter === 'All' || application.stage === stageFilter
        const term = searchTerm.trim().toLowerCase()
        const matchesSearch =
          !term ||
          [application.company, application.role, application.source, application.notes]
            .join(' ')
            .toLowerCase()
            .includes(term)
        return matchesStage && matchesSearch
      })
  }, [applications, searchTerm, stageFilter])

  const summaryStats = useMemo(
    () => [
      { label: 'Tracked roles', value: activeApplications.length },
      {
        label: 'Interviews in play',
        value: activeApplications.filter((application) => stepHasInterview(application.stage)).length,
      },
      { label: 'Awaiting replies', value: followUpsDue.length },
      {
        label: 'Offers & decisions',
        value: applications.filter((application) =>
          ['Offer made', 'Offer accepted', 'Offer declined'].includes(application.stage),
        ).length,
      },
    ],
    [activeApplications, followUpsDue.length, applications],
  )

  const quickViewList = useMemo(
    () =>
      [...activeApplications]
        .sort(
          (a, b) =>
            new Date(a.followUpOn).getTime() - new Date(b.followUpOn).getTime() ||
            new Date(b.appliedOn).getTime() - new Date(a.appliedOn).getTime(),
        )
        .slice(0, 4),
    [activeApplications],
  )

  const stageSummary = useMemo(
    () =>
      stageOptions.map((stage) => ({
        stage,
        count: applications.filter((application) => application.stage === stage).length,
      })),
    [applications],
  )
  const activeStageSummary = stageSummary.filter((entry) => entry.count > 0 && entry.stage !== 'Archived')

  function updateApplication(id: number, changes: Partial<Application>) {
    setApplications((current) =>
      current.map((application) => (application.id === id ? { ...application, ...changes } : application)),
    )
  }

  function appendHistory(id: number, entry: HistoryEntry) {
    setApplications((current) =>
      current.map((application) =>
        application.id === id ? { ...application, history: [entry, ...application.history] } : application,
      ),
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
        `Stage updated from ${application.stage} to ${nextStage}.`,
        nextStage === 'Archived' ? 'Archive' : 'Status',
      ),
    )
  }

  function markFollowUpSent(application: Application) {
    const nextStage =
      application.stage === 'Application Submitted'
        ? 'Follow-Up 1'
        : application.stage === 'Follow-Up 1'
        ? 'Follow-Up 2'
        : application.stage
    updateApplication(application.id, {
      followUpOn: addDays(getTodayIso(), 5),
      stage: nextStage,
    })
    appendHistory(
      application.id,
      createHistoryEntry('Follow-up sent', 'Logged outreach and bumped the next checkpoint.', 'Follow-up'),
    )
  }

  function markPrepReady(application: Application) {
    updateApplication(application.id, { prepStatus: 'Ready' })
    appendHistory(application.id, createHistoryEntry('Prep marked ready', 'Ready for the next conversation.', 'Prep'))
  }

  function exportToCSV() {
    const headings = ['Company', 'Role', 'Stage', 'Follow Up', 'Salary', 'Last History']
    const rows = applications.map((application) => [
      application.company,
      application.role,
      application.stage,
      application.followUpOn,
      application.salary,
      application.history[0]?.date ?? '',
    ])
    const csv = [headings, ...rows].map((row) => row.map((cell) => `"${cell}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'nextround-applications.csv'
    link.click()
  }

  function scheduleNextRound(application: Application) {
    const nextStage = getNextStage(application.stage)
    if (nextStage === application.stage) return
    const interviewDate = application.interviewDate || `${addDays(getTodayIso(), 2)}T11:00`
    updateApplication(application.id, { stage: nextStage, interviewStage: nextStage, interviewDate })
    appendHistory(
      application.id,
      createHistoryEntry(
        `${nextStage} scheduled`,
        `Set next interview for ${formatDateTime(interviewDate)}.`,
        'Interview',
      ),
    )
  }

  function deleteApplication(id: number) {
    setApplications((current) => current.filter((application) => application.id !== id))
    if (selectedId === id) {
      const next = applications.find((application) => application.id !== id)
      if (next) setSelectedId(next.id)
    }
  }

  function openApplication(id: number) {
    setSelectedId(id)
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
      notes: 'Quick entry captured during application session.',
      archiveReason: '',
      archiveDetail: '',
      history: [
        createHistoryEntry('Quick add', 'Captured essential details fast.', 'Applied', quickAddForm.appliedOn),
      ],
    }
    setApplications((current) => [newApp, ...current])
    setSelectedId(newApp.id)
    setQuickAddForm(quickAddDefaults)
  }

  return (
    <div className="shell">
      <aside className="sidebar">
        <div className="brand-block">
          <p className="eyebrow eyebrow-bright">Job search command center</p>
          <h1>NextRound</h1>
          <p className="brand-copy">Premium CRM for the opportunities you truly care about.</p>
        </div>
        <div className="sidebar-highlight">
          <p className="section-label section-label-bright">Live pipeline</p>
          <strong>{activeApplications.length} active roles</strong>
          <span>{stalledApplications.length} flagged for attention</span>
          <span>
            {followUpsDue.length} follow-ups due · {archivedApplications.length} archived
          </span>
        </div>
        <nav className="nav-list" aria-label="Main sections">
          {['dashboard', 'pipeline', 'interviews', 'journey', 'archive', 'roadmap'].map((id) => (
            <button
              key={id}
              className={activeView === id ? 'nav-item active' : 'nav-item'}
              onClick={() => setActiveView(id as View)}
            >
              <span>{id}</span>
            </button>
          ))}
        </nav>
      </aside>

      <main className="workspace">
        <div className="command-header">
          <div>
            <p className="eyebrow">Command center</p>
            <h2>NextRound · premium pipeline</h2>
            <p className="hero-copy">
              Capture the essentials quickly, track every stage, and keep your focus on the roles that
              deserve follow-up.
            </p>
          </div>
          <div className="command-actions">
            <button className="ghost-button" onClick={() => setActiveView('journey')}>
              View journey map
            </button>
            <button className="primary-button" onClick={() => setQuickAddOpen(true)}>
              Quick add role
            </button>
          </div>
        </div>

        <div className="command-metrics">
          {summaryStats.map((stat) => (
            <MetricCard key={stat.label} label={stat.label} value={stat.value} />
          ))}
        </div>

        <section className="dashboard-grid">
          <div className="quick-add-card card">
            <div className="card-header">
              <div>
                <p className="section-label">Quick add</p>
                <h3>Capture roles while they are fresh</h3>
              </div>
              <button className="ghost-button" onClick={() => setQuickAddOpen((prev) => !prev)}>
                {quickAddOpen ? 'Hide quick add' : 'Quick capture'}
              </button>
            </div>
            <form className={`quick-add-form ${quickAddOpen ? 'is-expanded' : ''}`} onSubmit={handleQuickAdd}>
              <label>
                <span>Company</span>
                <input
                  value={quickAddForm.company}
                  onChange={(event) =>
                    setQuickAddForm((current) => ({ ...current, company: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Role</span>
                <input
                  value={quickAddForm.role}
                  onChange={(event) =>
                    setQuickAddForm((current) => ({ ...current, role: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Platform</span>
                <select
                  value={quickAddForm.source}
                  onChange={(event) =>
                    setQuickAddForm((current) => ({ ...current, source: event.target.value }))
                  }
                >
                  <option>LinkedIn</option>
                  <option>Company Site</option>
                  <option>Referral</option>
                  <option>Indeed</option>
                  <option>Other</option>
                </select>
              </label>
              <label>
                <span>Pay range</span>
                <input
                  value={quickAddForm.salary}
                  onChange={(event) =>
                    setQuickAddForm((current) => ({ ...current, salary: event.target.value }))
                  }
                />
              </label>
              <label>
                <span>Applied on</span>
                <input
                  type="date"
                  value={quickAddForm.appliedOn}
                  onChange={(event) =>
                    setQuickAddForm((current) => ({ ...current, appliedOn: event.target.value }))
                  }
                />
              </label>
              <div className="quick-add-footer">
                <button type="submit" className="primary-button">
                  Capture quick entry
                </button>
                <span className="muted">{applicationCountText(filteredCollection.length)}</span>
              </div>
            </form>
          </div>

          <div className="quick-view-card card">
          <div className="card-header">
            <div>
              <h3>Active attention</h3>
            </div>
            <span className="muted">{followUpsDue.length} follow-ups flagged</span>
          </div>
            <div className="quick-view-list">
              {quickViewList.map((application) => (
                <article key={application.id} className="quick-view-item">
                  <div>
                    <strong>{application.company}</strong>
                    <p>{application.role}</p>
                    <p className="quick-view-meta">{application.source}</p>
                  </div>
                  <div className="quick-view-meta">
                    <StageBadge stage={application.stage} attention={isStalled(application)} />
                    <span>{formatFollowUpLabel(application)}</span>
                  </div>
                  <button className="ghost-button" onClick={() => openApplication(application.id)}>
                    Details
                  </button>
                </article>
              ))}
            </div>
            <div className="quick-view-footer">
              <button className="secondary-button" onClick={() => setActiveView('pipeline')}>
                Jump to pipeline
              </button>
              <button className="ghost-button" onClick={() => setActiveView('archive')}>
                View archive
              </button>
            </div>
          </div>
        </section>

        <section className="log-panel card">
          <div className="log-header">
            <div>
              <h3>Application log</h3>
            </div>
            <div className="log-controls">
              <input
                value={searchTerm}
                onChange={(event) => setSearchTerm(event.target.value)}
                placeholder="Search jobs, companies, or notes..."
              />
              <select value={stageFilter} onChange={(event) => setStageFilter(event.target.value as 'All' | Stage)}>
                <option>All</option>
                {stageOptions.map((option) => (
                  <option key={option}>{option}</option>
                ))}
              </select>
              <button className="ghost-button" onClick={exportToCSV}>
                Export CSV
              </button>
            </div>
          </div>
          <div className="log-table">
            <div className="log-row log-heading">
              <span>Company · role</span>
              <span>Stage</span>
              <span>Platform</span>
              <span>Follow-up</span>
              <span>Interview</span>
              <span>Actions</span>
            </div>
            {filteredCollection.map((application) => (
              <div
                key={application.id}
                className={`log-row ${isStalled(application) ? 'stalled' : ''}`}
                onClick={() => openApplication(application.id)}
              >
                <div className="log-cell company-cell">
                  <strong>{application.company}</strong>
                  <p className="muted">{application.role}</p>
                </div>
                <div className="log-cell stage-cell">
                  <StageBadge stage={application.stage} attention={isStalled(application)} />
                  <select
                    value={application.stage}
                    onClick={(event) => event.stopPropagation()}
                    onChange={(event) => handleStageChange(application, event.target.value as Stage)}
                  >
                    {stageOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </div>
                <div className="log-cell">
                  {application.source}
                  <p className="muted">{application.salary}</p>
                </div>
                <div className="log-cell">
                  <strong>{formatFollowUpLabel(application)}</strong>
                  <p className="muted">{formatDate(application.followUpOn)}</p>
                </div>
                <div className="log-cell">
                  <strong>{formatInterviewLabel(application)}</strong>
                  <p className="muted">{application.interviewStage}</p>
                </div>
                <div className="log-cell actions-cell">
                  <button
                    className="ghost-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      openApplication(application.id)
                    }}
                  >
                    Details
                  </button>
                  <button
                    className="secondary-button"
                    onClick={(event) => {
                      event.stopPropagation()
                      scheduleNextRound(application)
                    }}
                  >
                    Next stage
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="pipeline-summary card">
          <div className="card-header">
            <div>
              <h3>Pipeline overview</h3>
              <p className="muted">Keep the board tucked until you need to peek at every stage.</p>
            </div>
            <button className="ghost-button" onClick={() => setShowPipelineBoard((prev) => !prev)}>
              {showPipelineBoard ? 'Hide board' : 'Show board'}
            </button>
          </div>
          <div className="stage-list">
            {activeStageSummary.slice(0, 5).map((entry) => (
              <div key={entry.stage} className="stage-chip">
                <StageBadge
                  stage={entry.stage}
                  attention={isStalled(
                    applications.find((application) => application.stage === entry.stage) ?? applications[0],
                  )}
                />
                <span>{entry.count}</span>
              </div>
            ))}
            {activeStageSummary.length > 5 && <span className="muted">+{activeStageSummary.length - 5} more stages</span>}
          </div>
        </section>

        {showPipelineBoard && (
          <section className="pipeline-board card">
            <div className="card-heading">
              <div>
                <h3>Stage breakdown</h3>
              </div>
              <p className="muted">Click a stage to jump straight into any detail view.</p>
            </div>
            <div className="journey-columns compressed">
              {stageOptions.map((stage) => {
                const stageApps = applications.filter((app) => app.stage === stage)
                if (!stageApps.length) return null
                return (
                  <div key={stage} className="journey-column">
                    <strong>{stageApps.length}</strong>
                    <p>{stage}</p>
                    {stageApps.map((app) => (
                      <div key={app.id} className="journey-pill" onClick={() => openApplication(app.id)}>
                        <span>{app.company}</span>
                        <StageBadge stage={app.stage} attention={isStalled(app)} />
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {selectedApplication && (
          <section className="detail-section card">
            <div className="detail-head">
              <div>
                <p className="section-label">Active focus</p>
                <h3>{selectedApplication.company}</h3>
                <p className="muted">
                  {selectedApplication.role} · Applied {formatDate(selectedApplication.appliedOn)} · {selectedApplication.source}
                </p>
              </div>
              <div className="detail-actions">
                <StageBadge stage={selectedApplication.stage} attention={isStalled(selectedApplication)} />
                <div>
                  <button
                    className="ghost-button"
                    onClick={() =>
                      handleStageChange(
                        selectedApplication,
                        selectedApplication.stage === 'Archived' ? 'Application Submitted' : 'Archived',
                      )
                    }
                  >
                    {selectedApplication.stage === 'Archived' ? 'Re-open' : 'Archive'}
                  </button>
                  <button className="ghost-button danger" onClick={() => deleteApplication(selectedApplication.id)}>
                    Delete
                  </button>
                </div>
              </div>
            </div>

            <div className="detail-ribbon">
              <div>
                <span>Follow up</span>
                <strong>{formatFollowUpLabel(selectedApplication)}</strong>
                <p className="muted">{formatDate(selectedApplication.followUpOn)}</p>
              </div>
              <div>
                <span>Interview</span>
                <strong>{formatInterviewLabel(selectedApplication)}</strong>
                <p className="muted">{selectedApplication.interviewStage}</p>
              </div>
              <div>
                <span>Prep</span>
                <strong>{selectedApplication.prepStatus}</strong>
                <p className="muted">{selectedApplication.recruiter || 'No recruiter yet'}</p>
              </div>
            </div>

            <div className="detail-grid">
              <label>
                <span>Current stage</span>
                <select
                  value={selectedApplication.stage}
                  onChange={(event) => handleStageChange(selectedApplication, event.target.value as Stage)}
                >
                  {stageOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Prep status</span>
                <select
                  value={selectedApplication.prepStatus}
                  onChange={(event) =>
                    updateApplication(selectedApplication.id, { prepStatus: event.target.value as Application['prepStatus'] })
                  }
                >
                  <option>Not started</option>
                  <option>Light prep</option>
                  <option>Ready</option>
                </select>
              </label>
              <label>
                <span>Follow-up date</span>
                <input
                  type="date"
                  value={selectedApplication.followUpOn}
                  onChange={(event) =>
                    updateApplication(selectedApplication.id, { followUpOn: event.target.value })
                  }
                />
              </label>
              <label>
                <span>Interview date</span>
                <input
                  type="datetime-local"
                  value={selectedApplication.interviewDate}
                  onChange={(event) =>
                    updateApplication(selectedApplication.id, { interviewDate: event.target.value })
                  }
                />
              </label>
            </div>

            <div className="detail-actions-panel">
              <button className="secondary-button" onClick={() => markFollowUpSent(selectedApplication)}>
                Log follow-up
              </button>
              <button className="secondary-button" onClick={() => scheduleNextRound(selectedApplication)}>
                Move to next stage
              </button>
              <button className="secondary-button" onClick={() => markPrepReady(selectedApplication)}>
                Prep ready
              </button>
            </div>

            <label className="detail-field">
              <span>Notes</span>
              <textarea
                value={selectedApplication.notes}
                onChange={(event) => updateApplication(selectedApplication.id, { notes: event.target.value })}
              />
            </label>

            <div className="detail-grid detail-grid--shrink">
              <label>
                <span>Archive reason</span>
                <select
                  value={selectedApplication.archiveReason}
                  disabled={selectedApplication.stage !== 'Archived'}
                  onChange={(event) =>
                    updateApplication(selectedApplication.id, { archiveReason: event.target.value })
                  }
                >
                  <option value="">Select reason</option>
                  {archiveReasons.map((reason) => (
                    <option key={reason} value={reason}>
                      {reason}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                <span>Archive detail</span>
                <input
                  disabled={selectedApplication.stage !== 'Archived'}
                  value={selectedApplication.archiveDetail}
                  onChange={(event) =>
                    updateApplication(selectedApplication.id, { archiveDetail: event.target.value })
                  }
                />
              </label>
            </div>

            <section className="detail-history">
              <div className="card-heading">
                <div>
                  <p className="section-label">History</p>
                  <h3>Timeline</h3>
                </div>
              </div>
              <div className="history-list">
                {selectedApplication.history.map((entry) => (
                  <article key={entry.id} className="history-item">
                    <div className={`history-dot history-${slugify(entry.type)}`} />
                    <div>
                      <strong>{entry.label}</strong>
                      <p>{entry.detail}</p>
                      <span>{formatLongDate(entry.date)}</span>
                    </div>
                  </article>
                ))}
              </div>
            </section>
          </section>
        )}

        {activeView === 'journey' && (
          <section className="journey-section card">
            <div className="card-heading">
              <div>
                <p className="section-label">Journey map</p>
                <h3>Visual history for every tracked opportunity</h3>
              </div>
            </div>
            <div className="journey-columns">
              {stageOptions.map((stage) => {
                const stageApps = applications.filter((app) => app.stage === stage)
                return (
                  <div key={stage} className="journey-column">
                    <strong>{stageApps.length}</strong>
                    <p>{stage}</p>
                    {stageApps.map((app) => (
                      <div key={app.id} className="journey-pill" onClick={() => openApplication(app.id)}>
                        <span>{app.company}</span>
                        <small>{app.role}</small>
                      </div>
                    ))}
                  </div>
                )
              })}
            </div>
          </section>
        )}

        {activeView === 'archive' && (
          <section className="archive-section card">
            <div className="card-heading">
              <div>
                <p className="section-label">Archive</p>
                <h3>Closed conversations</h3>
              </div>
            </div>
            {archivedApplications.length ? (
              <div className="archive-list">
                {archivedApplications.map((application) => (
                  <article key={application.id} className="archive-item">
                    <div>
                      <strong>{application.company}</strong>
                      <p>{application.role}</p>
                      <p className="muted">{application.archiveReason || 'Closed'}</p>
                    </div>
                    <div>
                      <span>{application.archiveDetail || 'No detail yet'}</span>
                      <button
                        className="ghost-button"
                        onClick={() => {
                          setActiveView('dashboard')
                          setSelectedId(application.id)
                        }}
                      >
                        View
                      </button>
                    </div>
                  </article>
                ))}
              </div>
            ) : (
              <p className="muted">No archived apps yet; close one once you hear back.</p>
            )}
          </section>
        )}

        {activeView === 'roadmap' && (
          <section className="card roadmap-card">
            <div className="card-heading">
              <div>
                <p className="section-label">Roadmap</p>
                <h3>What we’ve built and what’s next</h3>
              </div>
            </div>
            <p className="muted">
              Everything we discussed lives in `docs/master-roadmap.md`.
            </p>
          </section>
        )}
      </main>
    </div>
  )
}

function StageBadge({ stage, attention }: { stage: Stage; attention?: boolean }) {
  const tone = stageTone(stage)
  return <span className={`stage-badge tone-${tone} ${attention ? 'attention' : ''}`}>{stage}</span>
}

function MetricCard({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="metric-card">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  )
}

function stepHasInterview(stage: Stage) {
  return stage.includes('Interview') || stage === 'Recruiter Screen'
}

function stageTone(stage: Stage) {
  if (stage === 'Archived' || stage === 'No response' || stage === 'Offer declined') return 'muted'
  if (stage === 'Offer made' || stage === 'Offer accepted') return 'success'
  if (stage.includes('Interview') || stage === 'Recruiter Screen') return 'accent'
  if (stage.includes('Follow-Up') || stage === 'Waiting on response') return 'highlight'
  return 'primary'
}

function formatFollowUpLabel(application: Application) {
  if (!application.followUpOn) return 'No follow-up set'
  const days = daysUntil(application.followUpOn)
  if (days < 0) return `Overdue ${Math.abs(days)}d`
  if (days === 0) return 'Due today'
  return `Due in ${days}d`
}

function formatInterviewLabel(application: Application) {
  if (!application.interviewStage) return 'No interview yet'
  if (!application.interviewDate) return application.interviewStage
  return formatDateTime(application.interviewDate)
}

function applicationCountText(count: number) {
  return `${count} tracked roles`
}

function isStalled(application: Application) {
  const finalStages: Stage[] = ['Offer made', 'Offer accepted', 'Offer declined', 'Archived']
  if (finalStages.includes(application.stage)) return false
  return daysSince(application.appliedOn) >= 7
}

function isDue(date: string) {
  const target = new Date(date)
  const today = new Date()
  return today >= target
}

function daysSince(date: string) {
  const target = new Date(date)
  const today = new Date()
  const diff = today.getTime() - target.getTime()
  return Math.max(0, Math.floor(diff / 86400000))
}

function daysUntil(date: string) {
  const target = new Date(date)
  const today = new Date()
  const diff = target.getTime() - today.getTime()
  return Math.ceil(diff / 86400000)
}

function formatDate(date: string) {
  if (!date) return 'TBD'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function formatDateTime(date: string) {
  if (!date) return 'Not scheduled'
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(date))
}

function formatLongDate(date: string) {
  if (!date) return ''
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', year: 'numeric' }).format(
    new Date(date),
  )
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next.toISOString().slice(0, 10)
}

function slugify(value: string) {
  return value.toLowerCase().replace(/\s+/g, '-')
}

function getNextStage(stage: Stage): Stage {
  const order: Stage[] = stageOptions
  const idx = order.indexOf(stage)
  if (idx === -1 || idx === order.length - 1) return stage
  return order[idx + 1]
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

export default App
