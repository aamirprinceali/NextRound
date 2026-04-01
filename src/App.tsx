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

type View = 'dashboard' | 'tracker' | 'pipeline' | 'interviews' | 'calendar' | 'inbox' | 'archive'

type DetailTab = 'overview' | 'contact' | 'job' | 'prep' | 'offer'

type SortField = 'company' | 'stage' | 'priority' | 'followUpOn' | 'desireRank' | 'appliedOn'
type SortDir   = 'asc' | 'desc'

type HistoryType = 'Applied' | 'Follow-up' | 'Interview' | 'Status' | 'Prep' | 'Archive' | 'Waiting on response' | 'Note' | 'Offer'

type HistoryEntry = { id: number; date: string; label: string; detail: string; type: HistoryType }

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
  desireRank: number          // 0 = unranked, 1–5

  /* Pay */
  salary: string              // listed pay from job posting
  salaryTargeted: string      // what you actually want

  workStyle: string

  /* Contacts */
  recruiter: string
  recruiterContact: string    // email / phone / LinkedIn
  interviewingManager: string
  managerContact: string

  /* Interview */
  interviewDate: string
  interviewStage: string
  prepStatus: 'Not started' | 'Light prep' | 'Ready'

  /* Job details */
  jobPostingUrl: string
  jobDescription: string
  resumeVersion: string       // note: which resume you sent
  coverLetterNote: string     // note about cover letter

  /* Interview prep */
  companyResearch: string     // notes about the company
  prepQuestions: string       // questions to ask / prepare answers for
  talkingPoints: string       // key stories / STAR examples to hit

  /* Notes */
  notes: string

  /* Offer */
  offerAmount: string
  decisionNotes: string

  /* Archive */
  archiveReason: string
  archiveDetail: string

  history: HistoryEntry[]
}

/* Queued application — pre-tracker holding state, ready for email integration */
type QueuedApp = {
  id: number
  company: string
  role: string
  source: 'email' | 'manual' | 'linkedin' | 'other'
  snippet: string       // email preview or manual note
  receivedOn: string    // ISO date
  status: 'pending' | 'dismissed'
}

type QuickAddForm = {
  company: string
  role: string
  source: string
  salary: string
  appliedOn: string
}

/* ─── Constants ─────────────────────────────────── */
const STORAGE_KEY       = 'nextround-applications'
const QUEUE_KEY         = 'nextround-queue'
const GOAL_KEY          = 'nextround-weekly-goal'

const stageOptions: Stage[] = [
  'Saved', 'Application Submitted', 'Follow-Up 1', 'Follow-Up 2', 'Recruiter Screen',
  'Scheduled 1st Interview', 'Completed 1st Interview',
  'Scheduled 2nd Interview', 'Completed 2nd Interview',
  'Scheduled 3rd Interview', 'Completed 3rd Interview',
  'Scheduled 4th Interview', 'Completed 4th Interview',
  'Waiting on response', 'No response',
  'Offer made', 'Offer accepted', 'Offer declined', 'Archived',
]

const archiveReasons = [
  'Email rejection', 'Rejected after recruiter screen', 'Rejected after 1st round',
  'Rejected after final round', 'Role filled', 'Salary mismatch',
  'Withdrew', 'No longer interested', 'Unable to contact', 'Offer declined', 'Other',
]

/* Fields added after initial release — fill missing keys when loading old data */
const APP_DEFAULTS: Partial<Application> = {
  salaryTargeted: '', recruiterContact: '', interviewingManager: '', managerContact: '',
  desireRank: 0, jobPostingUrl: '', jobDescription: '', resumeVersion: '',
  coverLetterNote: '', companyResearch: '', prepQuestions: '', talkingPoints: '',
  offerAmount: '', decisionNotes: '',
}

const sampleApplications: Application[] = [
  {
    id: 1, company: 'AnswersNow', role: 'Intake Manager', source: 'LinkedIn',
    appliedOn: '2026-03-15', followUpOn: '2026-03-31', stage: 'Waiting on response',
    priority: 'High', fitScore: 94, desireRank: 5,
    salary: '$70k – $90k', salaryTargeted: '$82k', workStyle: 'Remote-friendly',
    recruiter: 'Erin / Elsie', recruiterContact: 'erin@answersnow.com',
    interviewingManager: 'Sarah Chen', managerContact: 'sarah@answersnow.com',
    interviewDate: '2026-04-02T10:00', interviewStage: '3rd round pending', prepStatus: 'Ready',
    jobPostingUrl: '', jobDescription: '', resumeVersion: 'Operations Resume v3',
    coverLetterNote: 'Tailored to operations leadership angle',
    companyResearch: 'ABA therapy platform, Series B, ~200 employees. Strong ops culture.',
    prepQuestions: 'What does success look like in the first 90 days?\nHow is the intake team currently structured?',
    talkingPoints: 'Enrollment ops at scale, 400+ students. Reduced onboarding time by 30%.',
    notes: 'Strong fit. Keep top priority and follow up if no update by follow-up date.',
    offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
    history: [
      createHistoryEntry('Applied via LinkedIn', 'Submitted profile and resume.', 'Applied', '2026-03-15'),
      createHistoryEntry('Completed 2nd interview', 'Leadership and operations deep dive.', 'Interview', '2026-03-24'),
    ],
  },
  {
    id: 2, company: 'InsightTech', role: 'Patient Engagement Specialist', source: 'Company Site',
    appliedOn: '2026-03-18', followUpOn: '2026-04-03', stage: 'Scheduled 2nd Interview',
    priority: 'High', fitScore: 88, desireRank: 4,
    salary: '$65k – $78k', salaryTargeted: '$74k', workStyle: 'Hybrid',
    recruiter: 'Lena', recruiterContact: 'lena.r@insighttech.io',
    interviewingManager: '', managerContact: '',
    interviewDate: '2026-04-04T13:00', interviewStage: '2nd round scheduled', prepStatus: 'Light prep',
    jobPostingUrl: '', jobDescription: '', resumeVersion: 'General Resume v3',
    coverLetterNote: '', companyResearch: '', prepQuestions: '', talkingPoints: '',
    notes: 'Round 1 completed. Prep technical talking points and referral flow examples.',
    offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
    history: [
      createHistoryEntry('Applied on company site', 'Submitted directly from careers page.', 'Applied', '2026-03-18'),
      createHistoryEntry('Round 2 scheduled', 'Invite received from recruiter.', 'Interview', '2026-03-29'),
    ],
  },
]

const sampleQueue: QueuedApp[] = [
  { id: 101, company: 'Acme Health', role: 'Operations Coordinator', source: 'email', receivedOn: '2026-03-26', status: 'pending', snippet: 'Thank you for applying to the Operations Coordinator position. We have received your application and will be reviewing it shortly.' },
  { id: 102, company: 'BrightPath', role: 'Intake Specialist', source: 'linkedin', receivedOn: '2026-03-28', status: 'pending', snippet: 'Hi Aamir, thanks for your interest in BrightPath! We\'ve received your application and our team will be in touch.' },
]

const quickAddDefaults: QuickAddForm = {
  company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(),
}

/* ─── SVG Icons ─────────────────────────────────── */
const DashboardIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
    <rect x="8.5" y="1" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
    <rect x="1" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
    <rect x="8.5" y="8.5" width="5.5" height="5.5" rx="1.2" fill="currentColor"/>
  </svg>
)

const TrackerIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="2.5" width="13" height="1.8" rx="0.9" fill="currentColor"/>
    <rect x="1" y="6.6" width="13" height="1.8" rx="0.9" fill="currentColor"/>
    <rect x="1" y="10.7" width="13" height="1.8" rx="0.9" fill="currentColor"/>
  </svg>
)

const PipelineIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="2" width="3.5" height="11" rx="1" fill="currentColor"/>
    <rect x="5.75" y="4" width="3.5" height="9" rx="1" fill="currentColor"/>
    <rect x="10.5" y="6" width="3.5" height="7" rx="1" fill="currentColor"/>
  </svg>
)

const InterviewsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M7.5 4.5V7.5L9.5 9" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
)

const CalendarIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="2.5" width="13" height="11" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M1 6h13" stroke="currentColor" strokeWidth="1.2"/>
    <path d="M5 1.5v2.5M10 1.5v2.5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const InboxIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M1.5 9.5h3l1.5 2h4l1.5-2h3" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" strokeLinejoin="round"/>
    <rect x="1.5" y="2.5" width="12" height="10" rx="1.5" stroke="currentColor" strokeWidth="1.3"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="2" width="13" height="2.8" rx="1" fill="currentColor"/>
    <path d="M2.5 4.8V12a1 1 0 001 1h8a1 1 0 001-1V4.8" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5.5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

/* ─── App ───────────────────────────────────────── */
function App() {
  /* ── Applications state ── */
  const [applications, setApplications] = useState<Application[]>(() => {
    if (typeof window === 'undefined') return sampleApplications
    const saved = localStorage.getItem(STORAGE_KEY)
    if (!saved) return sampleApplications
    return (JSON.parse(saved) as Application[]).map((a) => ({ ...APP_DEFAULTS, ...a }))
  })

  /* ── Queue state ── */
  const [queue, setQueue] = useState<QueuedApp[]>(() => {
    if (typeof window === 'undefined') return sampleQueue
    const saved = localStorage.getItem(QUEUE_KEY)
    if (!saved) return sampleQueue
    return JSON.parse(saved) as QueuedApp[]
  })

  /* ── UI state ── */
  const [activeView, setActiveView]       = useState<View>('dashboard')
  const [selectedId, setSelectedId]       = useState<number>(() => sampleApplications[0].id)
  const [detailTab, setDetailTab]         = useState<DetailTab>('overview')
  const [searchTerm, setSearchTerm]       = useState('')
  const [stageFilter, setStageFilter]     = useState<'All' | Stage>('All')
  const [sortField, setSortField]         = useState<SortField>('appliedOn')
  const [sortDir, setSortDir]             = useState<SortDir>('desc')
  const [quickAddOpen, setQuickAddOpen]   = useState(false)
  const [quickAddForm, setQuickAddForm]   = useState<QuickAddForm>(quickAddDefaults)
  const [showDismissed, setShowDismissed] = useState(false)
  const [showQueueForm, setShowQueueForm] = useState(false)

  /* ── Weekly goal state ── */
  const [weeklyGoal, setWeeklyGoal] = useState<number>(() => {
    const s = localStorage.getItem(GOAL_KEY)
    return s ? parseInt(s) : 5
  })
  const [editingGoal, setEditingGoal] = useState(false)
  const [goalDraft, setGoalDraft]     = useState(5)

  /* ── Queue form state ── */
  const [queueForm, setQueueForm] = useState({
    company: '', role: '', source: 'manual' as QueuedApp['source'],
    snippet: '', receivedOn: getTodayIso(),
  })

  /* ── Persist ── */
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)) }, [applications])
  useEffect(() => { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) }, [queue])
  useEffect(() => { localStorage.setItem(GOAL_KEY, String(weeklyGoal)) }, [weeklyGoal])

  useEffect(() => {
    if (!applications.length) return
    if (!applications.some((a) => a.id === selectedId)) setSelectedId(applications[0].id)
  }, [applications, selectedId])

  /* ── Derived ── */
  const activeApplications   = applications.filter((a) => a.stage !== 'Archived')
  const archivedApplications = applications.filter((a) => a.stage === 'Archived')
  const selectedApplication  = applications.find((a) => a.id === selectedId) ?? applications[0] ?? null
  const upcomingInterviews   = activeApplications
    .filter((a) => a.interviewDate)
    .sort((a, b) => new Date(a.interviewDate).getTime() - new Date(b.interviewDate).getTime())
  const needsAttention     = activeApplications.filter((a) => isStalled(a) || isDue(a.followUpOn))
  const interviewingCount  = activeApplications.filter(
    (a) => a.stage.includes('Interview') || a.stage === 'Recruiter Screen',
  ).length
  const topPicks = [...activeApplications]
    .filter((a) => a.desireRank > 0)
    .sort((a, b) => b.desireRank - a.desireRank)
    .slice(0, 5)

  const pendingQueue   = queue.filter((q) => q.status === 'pending')
  const dismissedQueue = queue.filter((q) => q.status === 'dismissed')

  /* This week's applications (Mon–Sun) */
  const thisWeekApps = useMemo(() => {
    const now = new Date()
    const startOfWeek = new Date(now)
    startOfWeek.setDate(now.getDate() - now.getDay())
    startOfWeek.setHours(0, 0, 0, 0)
    return applications.filter((a) => new Date(a.appliedOn) >= startOfWeek).length
  }, [applications])

  /* Sorted + filtered tracker */
  const filteredTracker = useMemo(() => {
    const filtered = activeApplications.filter((a) => {
      const byStage = stageFilter === 'All' || a.stage === stageFilter
      const term    = searchTerm.trim().toLowerCase()
      const byText  = !term || [a.company, a.role, a.source, a.notes, a.recruiter, a.interviewingManager]
        .join(' ').toLowerCase().includes(term)
      return byStage && byText
    })
    const priorityRank = { High: 0, Medium: 1, Low: 2 }
    return [...filtered].sort((a, b) => {
      let cmp = 0
      if (sortField === 'company')    cmp = a.company.localeCompare(b.company)
      if (sortField === 'stage')      cmp = stageOptions.indexOf(a.stage) - stageOptions.indexOf(b.stage)
      if (sortField === 'priority')   cmp = priorityRank[a.priority] - priorityRank[b.priority]
      if (sortField === 'followUpOn') cmp = a.followUpOn.localeCompare(b.followUpOn)
      if (sortField === 'desireRank') cmp = b.desireRank - a.desireRank
      if (sortField === 'appliedOn')  cmp = a.appliedOn.localeCompare(b.appliedOn)
      return sortDir === 'asc' ? cmp : -cmp
    })
  }, [activeApplications, searchTerm, stageFilter, sortField, sortDir])

  /* ── Sort toggle ── */
  function toggleSort(field: SortField) {
    if (sortField === field) setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    else { setSortField(field); setSortDir('asc') }
  }

  const pipelineBuckets: Array<{ title: string; stages: Stage[] }> = [
    { title: 'Applied',      stages: ['Saved','Application Submitted','Follow-Up 1','Follow-Up 2','Waiting on response'] },
    { title: 'Interviewing', stages: ['Recruiter Screen','Scheduled 1st Interview','Completed 1st Interview','Scheduled 2nd Interview','Completed 2nd Interview','Scheduled 3rd Interview','Completed 3rd Interview','Scheduled 4th Interview','Completed 4th Interview'] },
    { title: 'Decision',     stages: ['Offer made','Offer accepted','Offer declined','No response'] },
  ]

  /* ── Application updaters ── */
  function updateApplication(id: number, changes: Partial<Application>) {
    setApplications((curr) => curr.map((a) => (a.id === id ? { ...a, ...changes } : a)))
  }

  function appendHistory(id: number, entry: HistoryEntry) {
    setApplications((curr) =>
      curr.map((a) => (a.id === id ? { ...a, history: [entry, ...a.history] } : a)),
    )
  }

  function handleStageChange(app: Application, nextStage: Stage) {
    if (app.stage === nextStage) return
    updateApplication(app.id, {
      stage: nextStage,
      archiveReason: nextStage === 'Archived' ? app.archiveReason || 'Other' : app.archiveReason,
    })
    appendHistory(app.id, createHistoryEntry(
      `Moved to ${nextStage}`,
      `Stage changed from ${app.stage} to ${nextStage}.`,
      nextStage === 'Archived' ? 'Archive' : 'Status',
    ))
    if (['Offer made', 'Offer accepted', 'Offer declined'].includes(nextStage)) setDetailTab('offer')
  }

  function handleQuickAdd(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!quickAddForm.company.trim() || !quickAddForm.role.trim()) return
    const newApp: Application = {
      id: Date.now(), company: quickAddForm.company.trim(), role: quickAddForm.role.trim(),
      source: quickAddForm.source, appliedOn: quickAddForm.appliedOn,
      followUpOn: addDays(quickAddForm.appliedOn, 7), stage: 'Application Submitted',
      priority: 'Medium', fitScore: 3, desireRank: 0,
      salary: quickAddForm.salary.trim() || 'TBD', salaryTargeted: '', workStyle: 'Unknown',
      recruiter: '', recruiterContact: '', interviewingManager: '', managerContact: '',
      interviewDate: '', interviewStage: 'No interview yet', prepStatus: 'Not started',
      jobPostingUrl: '', jobDescription: '', resumeVersion: '', coverLetterNote: '',
      companyResearch: '', prepQuestions: '', talkingPoints: '',
      notes: '', offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
      history: [createHistoryEntry('Quick add', 'Created from quick add.', 'Applied', quickAddForm.appliedOn)],
    }
    setApplications((curr) => [newApp, ...curr])
    setSelectedId(newApp.id)
    setQuickAddForm(quickAddDefaults)
    setQuickAddOpen(false)
    setActiveView('tracker')
    setDetailTab('overview')
  }

  function deleteApplication(id: number) {
    setApplications((curr) => curr.filter((a) => a.id !== id))
  }

  /* ── Queue actions ── */
  function addToQueueManually(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!queueForm.company.trim()) return
    setQueue((curr) => [{
      id: Date.now(), company: queueForm.company.trim(), role: queueForm.role.trim(),
      source: queueForm.source, snippet: queueForm.snippet.trim(),
      receivedOn: queueForm.receivedOn, status: 'pending',
    }, ...curr])
    setQueueForm({ company: '', role: '', source: 'manual', snippet: '', receivedOn: getTodayIso() })
    setShowQueueForm(false)
  }

  function trackFromQueue(q: QueuedApp) {
    const newApp: Application = {
      id: Date.now(), company: q.company, role: q.role,
      source: q.source === 'email' ? 'Email' : q.source === 'linkedin' ? 'LinkedIn' : 'Other',
      appliedOn: q.receivedOn, followUpOn: addDays(q.receivedOn, 7),
      stage: 'Application Submitted', priority: 'Medium', fitScore: 0, desireRank: 0,
      salary: 'TBD', salaryTargeted: '', workStyle: '',
      recruiter: '', recruiterContact: '', interviewingManager: '', managerContact: '',
      interviewDate: '', interviewStage: '', prepStatus: 'Not started',
      jobPostingUrl: '', jobDescription: '', resumeVersion: '', coverLetterNote: '',
      companyResearch: '', prepQuestions: '', talkingPoints: '',
      notes: q.snippet || '', offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
      history: [createHistoryEntry('Added from queue', q.snippet || 'Moved from inbox to tracker.', 'Applied', q.receivedOn)],
    }
    setApplications((curr) => [newApp, ...curr])
    setQueue((curr) => curr.filter((item) => item.id !== q.id))
    setSelectedId(newApp.id)
    setActiveView('tracker')
    setDetailTab('overview')
  }

  function dismissFromQueue(id: number) {
    setQueue((curr) => curr.map((q) => q.id === id ? { ...q, status: 'dismissed' } : q))
  }

  function restoreFromQueue(id: number) {
    setQueue((curr) => curr.map((q) => q.id === id ? { ...q, status: 'pending' } : q))
  }

  /* ── CSV export ── */
  function exportToCSV() {
    const headers = ['Company','Role','Stage','Priority','Desire','Listed Pay','Target Pay','Follow Up','Interview','Recruiter','Manager','Source']
    const rows = applications.map((a) => [
      a.company, a.role, a.stage, a.priority, a.desireRank,
      a.salary, a.salaryTargeted, a.followUpOn, a.interviewDate,
      a.recruiter, a.interviewingManager, a.source,
    ])
    const csv = [headers, ...rows].map((row) => row.map((c) => `"${c}"`).join(',')).join('\n')
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' })
    const link = document.createElement('a')
    link.href = URL.createObjectURL(blob)
    link.download = 'nextround-export.csv'
    link.click()
  }

  /* ─────────── Render ─────────── */
  return (
    <div className="app-shell">

      {/* ─── Sidebar ─── */}
      <aside className="left-nav">
        <div className="brand">
          <p className="brand-kicker">NextRound</p>
          <h1>Job Hunt HQ</h1>
          <p className="brand-tagline">From first application to signed offer.</p>
        </div>

        <div className="nav-metrics">
          <article>
            <span className="metric-label">Active</span>
            <strong className="metric-val">{activeApplications.length}</strong>
          </article>
          <article>
            <span className="metric-label">Interviewing</span>
            <strong className="metric-val">{interviewingCount}</strong>
          </article>
          <article>
            <span className="metric-label">Needs attention</span>
            <strong className={`metric-val${needsAttention.length > 0 ? ' attention' : ''}`}>
              {needsAttention.length}
            </strong>
          </article>
          <article>
            <span className="metric-label">Archived</span>
            <strong className="metric-val">{archivedApplications.length}</strong>
          </article>
        </div>

        <nav className="main-nav">
          {(['dashboard','tracker','pipeline','interviews','calendar','inbox','archive'] as View[]).map((view) => {
            const icons: Record<View, React.ReactElement> = {
              dashboard: <DashboardIcon />, tracker: <TrackerIcon />,
              pipeline: <PipelineIcon />, interviews: <InterviewsIcon />,
              calendar: <CalendarIcon />, inbox: <InboxIcon />, archive: <ArchiveIcon />,
            }
            return (
              <button
                key={view}
                className={activeView === view ? 'nav-link active' : 'nav-link'}
                onClick={() => setActiveView(view)}
              >
                {icons[view]}
                {view}
                {view === 'inbox' && pendingQueue.length > 0 && (
                  <span className="nav-badge">{pendingQueue.length}</span>
                )}
              </button>
            )
          })}
        </nav>
      </aside>

      {/* ─── Main workspace ─── */}
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
              <button className="panel-close" onClick={() => setQuickAddOpen(false)}>✕</button>
              <form className="quick-add-form" onSubmit={handleQuickAdd}>
                <label>Company<input autoFocus value={quickAddForm.company}
                  onChange={(e) => setQuickAddForm((f) => ({ ...f, company: e.target.value }))} /></label>
                <label>Role title<input value={quickAddForm.role}
                  onChange={(e) => setQuickAddForm((f) => ({ ...f, role: e.target.value }))} /></label>
                <label>Platform
                  <select value={quickAddForm.source}
                    onChange={(e) => setQuickAddForm((f) => ({ ...f, source: e.target.value }))}>
                    <option>LinkedIn</option><option>Company Site</option>
                    <option>Referral</option><option>Indeed</option><option>Other</option>
                  </select>
                </label>
                <label>Listed pay range<input value={quickAddForm.salary} placeholder="e.g. $70k–$90k"
                  onChange={(e) => setQuickAddForm((f) => ({ ...f, salary: e.target.value }))} /></label>
                <label>Applied on<input type="date" value={quickAddForm.appliedOn}
                  onChange={(e) => setQuickAddForm((f) => ({ ...f, appliedOn: e.target.value }))} /></label>
                <button type="submit" className="primary-button full-width">Add to tracker</button>
              </form>
            </div>
          </>
        )}

        {/* ─── Dashboard ─── */}
        {activeView === 'dashboard' && (
          <section className="dashboard-grid">

            {/* Weekly goal */}
            <article className="panel-card">
              <h3>Weekly goal</h3>
              <div className="goal-widget">
                <div className="goal-header">
                  <span style={{ fontSize: '0.82rem', color: 'var(--muted)' }}>Applications this week</span>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700 }}>
                    {thisWeekApps} <span style={{ color: 'var(--muted)', fontWeight: 400 }}>/ {weeklyGoal}</span>
                  </span>
                </div>
                <div className="goal-progress-track">
                  <div className="goal-progress-fill"
                    style={{ width: `${Math.min(100, (thisWeekApps / weeklyGoal) * 100)}%` }} />
                </div>
                <div className="goal-footer">
                  <span className="goal-count">
                    {thisWeekApps >= weeklyGoal
                      ? <strong style={{ color: 'var(--ok)' }}>Goal reached 🎯</strong>
                      : <><strong>{weeklyGoal - thisWeekApps}</strong> more to hit your goal</>
                    }
                  </span>
                  {editingGoal ? (
                    <span className="goal-edit">
                      Goal:
                      <input type="number" min={1} max={50} value={goalDraft}
                        onChange={(e) => setGoalDraft(parseInt(e.target.value) || 1)} />
                      <button className="ghost-button sm" onClick={() => { setWeeklyGoal(goalDraft); setEditingGoal(false) }}>
                        Save
                      </button>
                    </span>
                  ) : (
                    <button className="ghost-button sm" onClick={() => { setGoalDraft(weeklyGoal); setEditingGoal(true) }}>
                      Set goal
                    </button>
                  )}
                </div>
              </div>
            </article>

            {/* Needs attention */}
            <article className="panel-card">
              <h3>Needs attention</h3>
              <div className="list-stack">
                {needsAttention.length ? (
                  needsAttention.slice(0, 5).map((a) => (
                    <button key={a.id} className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                      <div><strong>{a.company}</strong><p>{a.role}</p></div>
                      <span>{formatFollowUp(a.followUpOn)}</span>
                    </button>
                  ))
                ) : <p className="empty">No urgent follow-ups right now.</p>}
              </div>
            </article>

            {/* Upcoming interviews */}
            <article className="panel-card">
              <h3>Upcoming interviews</h3>
              <div className="list-stack">
                {upcomingInterviews.length ? (
                  upcomingInterviews.slice(0, 5).map((a) => (
                    <button key={a.id} className="list-item"
                      onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                      <div><strong>{a.company}</strong><p>{a.role}</p></div>
                      <span>{formatDateTime(a.interviewDate)}</span>
                    </button>
                  ))
                ) : <p className="empty">No interviews scheduled.</p>}
              </div>
            </article>

            {/* Top picks */}
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
                          {[1,2,3,4,5].map((n) => (
                            <span key={n} className={`star-sm${a.desireRank >= n ? ' filled' : ''}`}>★</span>
                          ))}
                        </div>
                      </div>
                      <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                    </button>
                  ))
                ) : <p className="empty">Rate your want for any role (★★★★★) in the tracker to see it here.</p>}
              </div>
            </article>

          </section>
        )}

        {/* ─── Tracker ─── */}
        {activeView === 'tracker' && (
          <section className="tracker-layout">

            {/* Table */}
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

              <div className="tracker-table-scroll">
                <div className="tracker-head">
                  <SortCol field="company"    label="Company / Role" curr={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortCol field="stage"      label="Stage"          curr={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortCol field="priority"   label="Priority"       curr={sortField} dir={sortDir} onSort={toggleSort} />
                  <SortCol field="followUpOn" label="Follow-up"      curr={sortField} dir={sortDir} onSort={toggleSort} />
                  <span>Recruiter / Manager</span>
                </div>

                {filteredTracker.length === 0 && (
                  <p className="empty" style={{ padding: '16px 14px' }}>
                    No applications match your search.
                  </p>
                )}

                {filteredTracker.map((a) => (
                  <button
                    key={a.id}
                    className={['tracker-row', a.id === selectedId ? 'active' : '', `priority-border-${a.priority.toLowerCase()}`].join(' ')}
                    onClick={() => { setSelectedId(a.id); setDetailTab('overview') }}
                  >
                    <div>
                      <strong>{a.company}</strong>
                      <p>{a.role}</p>
                      {a.desireRank > 0 && (
                        <div className="desire-dots">
                          {[1,2,3,4,5].map((n) => (
                            <span key={n} className={`desire-dot${a.desireRank >= n ? ' filled' : ''}`} />
                          ))}
                        </div>
                      )}
                    </div>
                    {/* Click stage pill to change it */}
                    <div className="stage-pill-wrap">
                      <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                      <select className="stage-pill-select" value={a.stage} title="Change stage"
                        onClick={(e) => e.stopPropagation()}
                        onChange={(e) => { e.stopPropagation(); handleStageChange(a, e.target.value as Stage) }}>
                        {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                      </select>
                    </div>
                    <span><span className={`priority-badge priority-${a.priority.toLowerCase()}`}>{a.priority}</span></span>
                    <span>{formatFollowUp(a.followUpOn)}</span>
                    <span style={{ fontSize: '0.8rem', color: 'var(--muted)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {a.recruiter || a.interviewingManager || '—'}
                    </span>
                  </button>
                ))}
              </div>
            </article>

            {/* ─── Detail panel ─── */}
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

                <div className="detail-tabs">
                  {(['overview','contact','job','prep','offer'] as DetailTab[]).map((tab) => (
                    <button key={tab} className={`detail-tab${detailTab === tab ? ' active' : ''}`}
                      onClick={() => setDetailTab(tab)}>
                      {tab.charAt(0).toUpperCase() + tab.slice(1)}
                    </button>
                  ))}
                </div>

                {/* Overview */}
                {detailTab === 'overview' && (
                  <div className="detail-tab-body">
                    <div className="detail-grid">
                      <label>Stage
                        <select value={selectedApplication.stage}
                          onChange={(e) => handleStageChange(selectedApplication, e.target.value as Stage)}>
                          {stageOptions.map((s) => <option key={s} value={s}>{s}</option>)}
                        </select>
                      </label>
                      <label>Priority
                        <select value={selectedApplication.priority}
                          onChange={(e) => updateApplication(selectedApplication.id, { priority: e.target.value as Application['priority'] })}>
                          <option>High</option><option>Medium</option><option>Low</option>
                        </select>
                      </label>
                      <label>Follow-up date
                        <input type="date" value={selectedApplication.followUpOn}
                          onChange={(e) => updateApplication(selectedApplication.id, { followUpOn: e.target.value })} />
                      </label>
                      <label>Interview date
                        <input type="datetime-local" value={selectedApplication.interviewDate}
                          onChange={(e) => updateApplication(selectedApplication.id, { interviewDate: e.target.value })} />
                      </label>
                      <label>Prep status
                        <select value={selectedApplication.prepStatus}
                          onChange={(e) => updateApplication(selectedApplication.id, { prepStatus: e.target.value as Application['prepStatus'] })}>
                          <option>Not started</option><option>Light prep</option><option>Ready</option>
                        </select>
                      </label>
                    </div>

                    <div className="desire-rank-row">
                      <span className="section-label">How much do you want this?</span>
                      {[1,2,3,4,5].map((n) => (
                        <button key={n}
                          className={`desire-star-btn${selectedApplication.desireRank >= n ? ' filled' : ''}`}
                          onClick={() => updateApplication(selectedApplication.id, {
                            desireRank: selectedApplication.desireRank === n ? 0 : n,
                          })}>★</button>
                      ))}
                    </div>

                    <label className="notes-field">
                      Notes
                      <textarea value={selectedApplication.notes}
                        onChange={(e) => updateApplication(selectedApplication.id, { notes: e.target.value })}
                        placeholder="General notes, status updates, anything you want to remember…" />
                    </label>

                    {selectedApplication.stage === 'Archived' && (
                      <div className="detail-grid">
                        <label>Archive reason
                          <select value={selectedApplication.archiveReason}
                            onChange={(e) => updateApplication(selectedApplication.id, { archiveReason: e.target.value })}>
                            <option value="">Select reason</option>
                            {archiveReasons.map((r) => <option key={r} value={r}>{r}</option>)}
                          </select>
                        </label>
                        <label>Archive detail
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

                {/* Contact */}
                {detailTab === 'contact' && (
                  <div className="detail-tab-body">
                    <span className="section-label">Recruiter</span>
                    <div className="contact-grid">
                      <label>Name
                        <input value={selectedApplication.recruiter}
                          onChange={(e) => updateApplication(selectedApplication.id, { recruiter: e.target.value })}
                          placeholder="Recruiter name" />
                      </label>
                      <label>Contact info (email, phone, or LinkedIn)
                        <input value={selectedApplication.recruiterContact}
                          onChange={(e) => updateApplication(selectedApplication.id, { recruiterContact: e.target.value })}
                          placeholder="e.g. erin@company.com · 214-555-1234" />
                      </label>
                    </div>
                    <div className="section-divider" />
                    <span className="section-label">Interviewing Manager / Hiring Lead</span>
                    <div className="contact-grid">
                      <label>Name
                        <input value={selectedApplication.interviewingManager}
                          onChange={(e) => updateApplication(selectedApplication.id, { interviewingManager: e.target.value })}
                          placeholder="Manager or hiring lead name" />
                      </label>
                      <label>Contact info (email, phone, or LinkedIn)
                        <input value={selectedApplication.managerContact}
                          onChange={(e) => updateApplication(selectedApplication.id, { managerContact: e.target.value })}
                          placeholder="e.g. sarah@company.com · LinkedIn URL" />
                      </label>
                    </div>
                  </div>
                )}

                {/* Job details */}
                {detailTab === 'job' && (
                  <div className="detail-tab-body">
                    <div className="detail-grid">
                      <label>Listed pay (from posting)
                        <input value={selectedApplication.salary}
                          onChange={(e) => updateApplication(selectedApplication.id, { salary: e.target.value })}
                          placeholder="e.g. $70k–$90k" />
                      </label>
                      <label>Your target pay
                        <input value={selectedApplication.salaryTargeted}
                          onChange={(e) => updateApplication(selectedApplication.id, { salaryTargeted: e.target.value })}
                          placeholder="e.g. $82k" />
                      </label>
                      <label>Work style
                        <input value={selectedApplication.workStyle}
                          onChange={(e) => updateApplication(selectedApplication.id, { workStyle: e.target.value })}
                          placeholder="Remote / Hybrid / On-site" />
                      </label>
                      <label>Source
                        <select value={selectedApplication.source}
                          onChange={(e) => updateApplication(selectedApplication.id, { source: e.target.value })}>
                          <option>LinkedIn</option><option>Company Site</option>
                          <option>Referral</option><option>Indeed</option><option>Other</option>
                        </select>
                      </label>
                    </div>
                    <div className="section-divider" />
                    <span className="section-label">Files & Links</span>
                    <div className="contact-grid">
                      <label>Job posting URL
                        <input value={selectedApplication.jobPostingUrl}
                          onChange={(e) => updateApplication(selectedApplication.id, { jobPostingUrl: e.target.value })}
                          placeholder="https://…" />
                      </label>
                      <label>Resume version sent
                        <input value={selectedApplication.resumeVersion}
                          onChange={(e) => updateApplication(selectedApplication.id, { resumeVersion: e.target.value })}
                          placeholder="e.g. Operations Resume v3 — Desktop/Resumes/..." />
                      </label>
                      <label>Cover letter note
                        <input value={selectedApplication.coverLetterNote}
                          onChange={(e) => updateApplication(selectedApplication.id, { coverLetterNote: e.target.value })}
                          placeholder="e.g. Tailored for ops leadership angle" />
                      </label>
                    </div>
                    <label className="notes-field">
                      Job description
                      <textarea value={selectedApplication.jobDescription}
                        onChange={(e) => updateApplication(selectedApplication.id, { jobDescription: e.target.value })}
                        placeholder="Paste the full job description here so you always have it for reference…"
                        style={{ minHeight: '110px' }} />
                    </label>
                  </div>
                )}

                {/* Interview prep */}
                {detailTab === 'prep' && (
                  <div className="detail-tab-body">
                    <span className="section-label">Company research</span>
                    <label className="notes-field">
                      <textarea value={selectedApplication.companyResearch}
                        onChange={(e) => updateApplication(selectedApplication.id, { companyResearch: e.target.value })}
                        placeholder="What do they do? Size, funding, culture, Glassdoor notes, who runs it…"
                        style={{ minHeight: '80px' }} />
                    </label>
                    <div className="section-divider" />
                    <span className="section-label">Questions to ask them</span>
                    <label className="notes-field">
                      <textarea value={selectedApplication.prepQuestions}
                        onChange={(e) => updateApplication(selectedApplication.id, { prepQuestions: e.target.value })}
                        placeholder="Questions to ask the interviewer. One per line."
                        style={{ minHeight: '80px' }} />
                    </label>
                    <div className="section-divider" />
                    <span className="section-label">Talking points / STAR stories</span>
                    <label className="notes-field">
                      <textarea value={selectedApplication.talkingPoints}
                        onChange={(e) => updateApplication(selectedApplication.id, { talkingPoints: e.target.value })}
                        placeholder="Key stories, achievements, or points you want to hit in the interview…"
                        style={{ minHeight: '80px' }} />
                    </label>
                  </div>
                )}

                {/* Offer */}
                {detailTab === 'offer' && (
                  <div className="detail-tab-body">
                    {['Offer made','Offer accepted','Offer declined'].includes(selectedApplication.stage) ? (
                      <div className="offer-section">
                        <p className="offer-section-title">
                          {selectedApplication.stage === 'Offer accepted' ? '✓ Offer accepted' :
                           selectedApplication.stage === 'Offer declined' ? '✕ Offer declined' :
                           '💬 Offer received — make your decision'}
                        </p>
                        <label className="form-label">Offer amount
                          <input value={selectedApplication.offerAmount}
                            onChange={(e) => updateApplication(selectedApplication.id, { offerAmount: e.target.value })}
                            placeholder="e.g. $85,000 base + $5k signing + equity" />
                        </label>
                        <label className="notes-field">
                          Decision notes — pros, cons, factors
                          <textarea value={selectedApplication.decisionNotes}
                            onChange={(e) => updateApplication(selectedApplication.id, { decisionNotes: e.target.value })}
                            placeholder="Salary vs target, culture, growth, commute, PTO, benefits, gut feeling…"
                            style={{ minHeight: '90px' }} />
                        </label>
                        {selectedApplication.stage === 'Offer made' && (
                          <div className="offer-actions">
                            <button className="ghost-button success"
                              onClick={() => handleStageChange(selectedApplication, 'Offer accepted')}>
                              Accept offer ✓
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
                          No offer yet. When a company makes an offer, mark it below — you'll be able to log the amount, write decision notes, and officially accept or decline right here.
                        </p>
                        <button className="ghost-button success"
                          onClick={() => handleStageChange(selectedApplication, 'Offer made')}>
                          Mark as offer received
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
                    ) : <p className="empty">No roles here yet.</p>}
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
              <span>Company / Role</span><span>Interview</span>
              <span>Prep</span><span>Status</span><span></span>
            </div>
            {upcomingInterviews.length ? (
              upcomingInterviews.map((a) => (
                <button key={a.id} className="tracker-row"
                  onClick={() => { setSelectedId(a.id); setActiveView('tracker'); setDetailTab('prep') }}>
                  <div><strong>{a.company}</strong><p>{a.role}</p></div>
                  <span>{formatDateTime(a.interviewDate)}</span>
                  <span>{a.prepStatus}</span>
                  <span className={`stage-pill ${stageTone(a.stage)}`}>{a.stage}</span>
                  <span></span>
                </button>
              ))
            ) : <p className="empty" style={{ padding: '16px' }}>No interviews scheduled yet.</p>}
          </section>
        )}

        {/* ─── Calendar ─── */}
        {activeView === 'calendar' && (
          <div className="panel-card">
            <CalendarView applications={activeApplications} />
          </div>
        )}

        {/* ─── Inbox / Queue ─── */}
        {activeView === 'inbox' && (
          <div className="inbox-wrap">

            {/* Toolbar */}
            <div className="inbox-toolbar">
              <div>
                <strong style={{ fontSize: '0.9rem' }}>
                  {pendingQueue.length} pending
                </strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.82rem', marginLeft: '8px' }}>
                  — select which applications to officially track
                </span>
              </div>
              <button className="ghost-button" onClick={() => setShowQueueForm((v) => !v)}>
                {showQueueForm ? 'Cancel' : '+ Add manually'}
              </button>
            </div>

            {/* Manual add form */}
            {showQueueForm && (
              <form className="inbox-add-form" onSubmit={addToQueueManually}>
                <label className="form-label">Company
                  <input autoFocus value={queueForm.company}
                    onChange={(e) => setQueueForm((f) => ({ ...f, company: e.target.value }))} />
                </label>
                <label className="form-label">Role (optional)
                  <input value={queueForm.role}
                    onChange={(e) => setQueueForm((f) => ({ ...f, role: e.target.value }))} />
                </label>
                <label className="form-label">Source
                  <select value={queueForm.source}
                    onChange={(e) => setQueueForm((f) => ({ ...f, source: e.target.value as QueuedApp['source'] }))}>
                    <option value="manual">Manual</option>
                    <option value="email">Email</option>
                    <option value="linkedin">LinkedIn</option>
                    <option value="other">Other</option>
                  </select>
                </label>
                <label className="form-label">Received on
                  <input type="date" value={queueForm.receivedOn}
                    onChange={(e) => setQueueForm((f) => ({ ...f, receivedOn: e.target.value }))} />
                </label>
                <label className="form-label" style={{ gridColumn: '1 / -1' }}>
                  Note / email snippet
                  <textarea value={queueForm.snippet} style={{ minHeight: '60px' }}
                    placeholder="Paste the email subject line or a short note about this application…"
                    onChange={(e) => setQueueForm((f) => ({ ...f, snippet: e.target.value }))} />
                </label>
                <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>
                  Add to queue
                </button>
              </form>
            )}

            {/* Queue list */}
            {pendingQueue.length === 0 && !showQueueForm ? (
              <div className="inbox-empty">
                <div className="inbox-empty-icon">📬</div>
                <p>Your inbox is empty. Applications from email will appear here automatically once the Gmail integration is set up. You can also add them manually above.</p>
              </div>
            ) : (
              <div className="queue-list">
                {pendingQueue.map((q) => {
                  const daysWaiting = daysSince(q.receivedOn)
                  const overdue     = daysWaiting >= 5
                  return (
                    <div key={q.id} className={`queue-card${overdue ? ' overdue' : ''}`}>
                      <div className="queue-card-body">
                        <div className="queue-card-title">
                          <strong>{q.company}</strong>
                          {q.role && <span className="queue-role">{q.role}</span>}
                        </div>
                        <div className="queue-meta">
                          <span className={`queue-source-badge source-${q.source}`}>{q.source}</span>
                          <span className="queue-meta-item">Received {formatDate(q.receivedOn)}</span>
                          {overdue && (
                            <span className="queue-meta-item warn">
                              ⚠ {daysWaiting}d waiting — consider following up
                            </span>
                          )}
                        </div>
                        {q.snippet && <p className="queue-snippet">{q.snippet}</p>}
                      </div>
                      <div className="queue-actions">
                        <button className="ghost-button sm success" onClick={() => trackFromQueue(q)}>
                          Start tracking
                        </button>
                        <button className="ghost-button sm" onClick={() => dismissFromQueue(q.id)}>
                          Dismiss
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Dismissed section */}
            {dismissedQueue.length > 0 && (
              <>
                <button className="inbox-dismissed-toggle" onClick={() => setShowDismissed((v) => !v)}>
                  {showDismissed ? '▾' : '▸'} {dismissedQueue.length} dismissed
                </button>
                {showDismissed && (
                  <div className="queue-list">
                    {dismissedQueue.map((q) => (
                      <div key={q.id} className="queue-card dismissed">
                        <div className="queue-card-body">
                          <div className="queue-card-title">
                            <strong>{q.company}</strong>
                            {q.role && <span className="queue-role">{q.role}</span>}
                          </div>
                          <div className="queue-meta">
                            <span className={`queue-source-badge source-${q.source}`}>{q.source}</span>
                          </div>
                        </div>
                        <div className="queue-actions">
                          <button className="ghost-button sm" onClick={() => restoreFromQueue(q.id)}>
                            Restore
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

          </div>
        )}

        {/* ─── Archive ─── */}
        {activeView === 'archive' && (
          <section className="panel-card interviews-table">
            <div className="tracker-head">
              <span>Company / Role</span><span>Reason</span>
              <span>Detail</span><span></span><span></span>
            </div>
            {archivedApplications.length ? (
              archivedApplications.map((a) => (
                <div key={a.id} className="tracker-row static-row">
                  <div><strong>{a.company}</strong><p>{a.role}</p></div>
                  <span>{a.archiveReason || 'Not set'}</span>
                  <span>{a.archiveDetail || '—'}</span>
                  <span></span>
                  <button className="ghost-button sm"
                    onClick={() => { setSelectedId(a.id); setActiveView('tracker') }}>
                    Open
                  </button>
                </div>
              ))
            ) : <p className="empty" style={{ padding: '16px' }}>Nothing archived yet.</p>}
          </section>
        )}

      </main>
    </div>
  )
}

/* ─── Sortable column header ────────────────────── */
function SortCol({ field, label, curr, dir, onSort }: {
  field: SortField; label: string
  curr: SortField; dir: SortDir
  onSort: (f: SortField) => void
}) {
  const active = field === curr
  return (
    <span className={`sort-col${active ? ' active' : ''}`} onClick={() => onSort(field)}>
      {label}
      {active && <span className="sort-arrow">{dir === 'asc' ? '↑' : '↓'}</span>}
    </span>
  )
}

/* ─── Calendar View ─────────────────────────────── */
function CalendarView({ applications }: { applications: Application[] }) {
  const [calDate, setCalDate] = useState(new Date())
  const year = calDate.getFullYear()
  const month = calDate.getMonth()

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
    if (['Offer made','Offer accepted'].includes(a.stage) && a.offerAmount) {
      const k = getTodayIso()
      offerMap.set(k, [...(offerMap.get(k) ?? []), a.company])
    }
  })

  const firstDayOfWeek = new Date(year, month, 1).getDay()
  const daysInMonth    = new Date(year, month + 1, 0).getDate()
  const today          = new Date()
  const todayStr       = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`

  return (
    <div className="calendar-wrap">
      <div className="calendar-nav">
        <button className="ghost-button" onClick={() => setCalDate(new Date(year, month-1, 1))}>‹ Prev</button>
        <h3>{calDate.toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</h3>
        <button className="ghost-button" onClick={() => setCalDate(new Date(year, month+1, 1))}>Next ›</button>
      </div>

      <div className="cal-grid">
        {['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].map((d) => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}
        {Array.from({ length: firstDayOfWeek }).map((_, i) => (
          <div key={`e${i}`} className="cal-cell empty" />
        ))}
        {Array.from({ length: daysInMonth }, (_, i) => i + 1).map((day) => {
          const dateStr  = `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`
          const ivs  = interviewMap.get(dateStr) ?? []
          const fus  = followUpMap.get(dateStr)  ?? []
          const offs = offerMap.get(dateStr)     ?? []
          return (
            <div key={dateStr} className={`cal-cell${dateStr === todayStr ? ' today' : ''}`}>
              <span className="cal-day-num">{day}</span>
              <div className="cal-events">
                {ivs.map((co, i)  => <span key={`iv${i}`} className="cal-event interview" title={`${co} — Interview`}>{co}</span>)}
                {offs.map((co, i) => <span key={`of${i}`} className="cal-event offer" title={`${co} — Offer`}>{co}</span>)}
                {fus.map((co, i)  => <span key={`fu${i}`} className="cal-event followup" title={`${co} — Follow-up`}>{co}</span>)}
              </div>
            </div>
          )
        })}
      </div>

      <div className="cal-legend">
        <div className="cal-legend-item"><div className="cal-legend-dot interview"/>Interviews</div>
        <div className="cal-legend-item"><div className="cal-legend-dot followup"/>Follow-ups</div>
        <div className="cal-legend-item"><div className="cal-legend-dot offer"/>Offers</div>
      </div>
    </div>
  )
}

/* ─── Helpers ───────────────────────────────────── */
function viewTitle(v: View) {
  const t: Record<View, string> = {
    dashboard: 'Command Center', tracker: 'Application Tracker', pipeline: 'Pipeline Flow',
    interviews: 'Interview Schedule', calendar: 'Calendar', inbox: 'Application Inbox', archive: 'Archive',
  }
  return t[v]
}

function viewSubtitle(v: View) {
  const s: Record<View, string> = {
    dashboard:  'Your job hunt at a glance — goals, follow-ups, interviews, and top picks.',
    tracker:    'Full job board. Click any stage pill to update it instantly.',
    pipeline:   'Visual snapshot of where every application currently stands.',
    interviews: 'Every scheduled interview. Click any row to open its prep notes.',
    calendar:   'Interviews, follow-up dates, and offers laid out by month.',
    inbox:      'Holding queue for incoming applications. Decide what to officially track.',
    archive:    'Closed outcomes — track patterns and reasons over time.',
  }
  return s[v]
}

function getNextStage(stage: Stage): Stage {
  const i = stageOptions.indexOf(stage)
  if (i === -1 || i === stageOptions.length - 1) return stage
  return stageOptions[i + 1]
}

function stageTone(stage: Stage) {
  if (stage === 'Offer accepted' || stage === 'Offer made') return 'tone-success'
  if (stage === 'Offer declined' || stage === 'No response' || stage === 'Archived') return 'tone-muted'
  if (stage.includes('Interview') || stage === 'Recruiter Screen') return 'tone-accent'
  if (stage.includes('Follow-Up') || stage === 'Waiting on response') return 'tone-warning'
  return 'tone-base'
}

function isStalled(a: Application) {
  if (a.stage === 'Archived') return false
  return daysSince(a.appliedOn) >= 7 && a.stage !== 'Offer accepted'
}

function isDue(date: string) {
  return !!date && new Date(date) <= new Date()
}

function formatFollowUp(date: string) {
  if (!date) return 'No follow-up'
  const d = daysUntil(date)
  if (d < 0) return `Overdue ${Math.abs(d)}d`
  if (d === 0) return 'Due today'
  return `In ${d}d`
}

function formatDateTime(date: string) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' }).format(new Date(date))
}

function formatDate(date: string) {
  if (!date) return '—'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(date))
}

function daysSince(date: string) {
  return Math.max(0, Math.floor((Date.now() - new Date(date).getTime()) / 86400000))
}

function daysUntil(date: string) {
  return Math.ceil((new Date(date).getTime() - Date.now()) / 86400000)
}

function createHistoryEntry(label: string, detail: string, type: HistoryType, date?: string): HistoryEntry {
  return { id: Date.now() + Math.floor(Math.random() * 1000), label, detail, type, date: date ?? getTodayIso() }
}

function getTodayIso() {
  return new Date().toISOString().slice(0, 10)
}

function addDays(date: string, days: number) {
  const d = new Date(date)
  d.setDate(d.getDate() + days)
  return d.toISOString().slice(0, 10)
}

export default App
