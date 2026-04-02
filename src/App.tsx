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

type View = 'dashboard' | 'tracker' | 'pipeline' | 'interviews' | 'calendar' | 'inbox' | 'stats' | 'rejections' | 'archive'

type DetailTab = 'overview' | 'contact' | 'job' | 'prep' | 'offer' | 'email'

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

  /* Tracking origin */
  sourceQueueId?: number
  autoAdded?: boolean
  flagged?: boolean       // hard "I really want this one" flag (separate from desireRank)

  /* Offer */
  offerAmount: string
  decisionNotes: string

  /* Archive */
  archiveReason: string
  archiveDetail: string

  history: HistoryEntry[]
}

/*
 * Email type determines how an incoming message gets routed:
 *   acknowledgment → Queue only (user decides whether to track)
 *   interview | assessment | next_steps | offer | rejection → auto-route to tracker
 */
type EmailType = 'acknowledgment' | 'interview' | 'assessment' | 'next_steps' | 'offer' | 'rejection'

/* Queued application — pre-tracker holding state, ready for email integration */
type QueuedApp = {
  id: number
  company: string
  role: string
  source: 'email' | 'manual' | 'linkedin' | 'other'
  emailType: EmailType
  snippet: string         // email preview or manual note
  receivedOn: string      // ISO date
  /*
   * pending      — waiting in queue for user decision
   * dismissed    — user doesn't want to track this one
   * tracked      — either user selected it OR an email auto-converted it
   *                (a "tracked" item can NEVER become a second tracker entry)
   */
  status: 'pending' | 'dismissed' | 'tracked'
  trackedAppId?: number   // links to Application.id once tracked
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
const SETTINGS_KEY      = 'nextround-settings'

type UserSettings = {
  fullName: string
  availabilityNote: string   // free-text block, e.g. "Mon–Fri 9am–5pm CST"
  emailSignature: string
}

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

/*
 * Maps an email type to the Stage it should produce in the tracker.
 * This is the single source of truth for "what does this email mean?"
 */
const EMAIL_TYPE_TO_STAGE: Record<EmailType, Stage> = {
  acknowledgment: 'Application Submitted',  // → queue only, not used as a stage upgrade
  next_steps:     'Recruiter Screen',
  assessment:     'Recruiter Screen',
  interview:      'Scheduled 1st Interview',
  offer:          'Offer made',
  rejection:      'No response',
}

const EMAIL_TYPE_LABELS: Record<EmailType, string> = {
  acknowledgment: 'Thanks for applying (acknowledgment)',
  next_steps:     'Next steps / moving forward',
  assessment:     'Assessment / screening',
  interview:      'Interview invite',
  offer:          'Offer letter / offer made',
  rejection:      'Rejection',
}

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
  {
    id: 101, company: 'Acme Health', role: 'Operations Coordinator',
    source: 'email', emailType: 'acknowledgment', status: 'pending',
    receivedOn: '2026-03-26',
    snippet: 'Thank you for applying to the Operations Coordinator position. We have received your application and will be reviewing it shortly.',
  },
  {
    id: 102, company: 'BrightPath', role: 'Intake Specialist',
    source: 'linkedin', emailType: 'acknowledgment', status: 'pending',
    receivedOn: '2026-03-28',
    snippet: "Hi Aamir, thanks for your interest in BrightPath! We've received your application and our team will be in touch.",
  },
]

const quickAddDefaults: QuickAddForm = {
  company: '', role: '', source: 'LinkedIn', salary: '', appliedOn: getTodayIso(),
}

/* ─── Email templates ───────────────────────────── */
type EmailTemplateKey = 'followUp' | 'thankYou' | 'availability' | 'withdrawal' | 'scheduleConfirm'

const EMAIL_TEMPLATES: Record<EmailTemplateKey, { label: string; description: string }> = {
  followUp:        { label: 'Follow-up after applying',        description: 'Check in after no response for 5–7 days' },
  thankYou:        { label: 'Thank-you after interview',       description: 'Send within 24 hours of an interview' },
  availability:    { label: 'Send your availability',          description: 'When asked to schedule an interview' },
  scheduleConfirm: { label: 'Confirm interview time',          description: 'Confirm a scheduled interview' },
  withdrawal:      { label: 'Withdraw from process',           description: 'Politely exit without burning bridges' },
}

function buildEmailTemplate(
  key: EmailTemplateKey,
  app: Application,
  settings: UserSettings,
): string {
  const { availabilityNote, emailSignature } = settings
  const recruiterFirst = (app.recruiter || 'Hiring Team').split(' ')[0].split('/')[0].trim()
  const company  = app.company
  const role     = app.role
  const interviewDateStr = app.interviewDate ? formatDateTimeStr(app.interviewDate) : ''

  switch (key) {
    case 'followUp':
      return `Hi ${recruiterFirst},

I hope you're doing well. I wanted to follow up on my application for the ${role} role at ${company}. I submitted my application on ${app.appliedOn} and wanted to reiterate my strong interest in the position.

If there's any additional information I can provide or if you have any questions, please don't hesitate to reach out. I look forward to hearing from you.

${emailSignature}`

    case 'thankYou':
      return `Hi ${recruiterFirst},

Thank you for taking the time to speak with me${interviewDateStr ? ` on ${interviewDateStr}` : ''} about the ${role} position at ${company}. I really enjoyed our conversation and learning more about the team and the role.

[ADD: 1–2 specific things from the conversation that excited you]

I'm very enthusiastic about the opportunity and look forward to the next steps. Please let me know if you need anything else from me in the meantime.

${emailSignature}`

    case 'availability':
      return `Hi ${recruiterFirst},

Thank you for reaching out! I'm excited about the opportunity to interview for the ${role} role at ${company}.

I'm available during the following times:

${availabilityNote}

Please feel free to send over a calendar invite for any of those windows, or let me know what works best on your end and I'll make it happen.

Looking forward to connecting!

${emailSignature}`

    case 'scheduleConfirm':
      return `Hi ${recruiterFirst},

I wanted to confirm my upcoming interview for the ${role} position at ${company}${interviewDateStr ? ` scheduled for ${interviewDateStr}` : ''}.

[ADD: video link / call-in number / address if applicable]

Please let me know if anything changes. I'm looking forward to speaking with you!

${emailSignature}`

    case 'withdrawal':
      return `Hi ${recruiterFirst},

I hope you're well. After careful consideration, I've decided to withdraw my application for the ${role} position at ${company}.

[OPTIONAL: brief, positive reason — e.g. "I've accepted a position that's a closer fit to my current goals."]

I have a lot of respect for the team and the work happening at ${company}, and I hope our paths cross again in the future.

Thank you for your time throughout this process.

${emailSignature}`
  }
}

function formatDateTimeStr(dt: string): string {
  if (!dt) return ''
  return new Intl.DateTimeFormat('en-US', {
    weekday: 'long', month: 'long', day: 'numeric',
    hour: 'numeric', minute: '2-digit',
  }).format(new Date(dt))
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

const StatsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <path d="M1 12L5 7.5L8 9.5L11 5L14 7" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
    <circle cx="5" cy="7.5" r="1" fill="currentColor"/>
    <circle cx="8" cy="9.5" r="1" fill="currentColor"/>
    <circle cx="11" cy="5" r="1" fill="currentColor"/>
  </svg>
)

const ArchiveIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <rect x="1" y="2" width="13" height="2.8" rx="1" fill="currentColor"/>
    <path d="M2.5 4.8V12a1 1 0 001 1h8a1 1 0 001-1V4.8" stroke="currentColor" strokeWidth="1.4"/>
    <path d="M5.5 8.5h4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
  </svg>
)

const RejectionsIcon = () => (
  <svg width="15" height="15" viewBox="0 0 15 15" fill="none">
    <circle cx="7.5" cy="7.5" r="6" stroke="currentColor" strokeWidth="1.3"/>
    <path d="M4.5 4.5l6 6M10.5 4.5l-6 6" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
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
  /* ── Settings ── */
  const [settings, setSettings] = useState<UserSettings>(() => {
    const s = localStorage.getItem(SETTINGS_KEY)
    return s ? JSON.parse(s) : { fullName: 'Aamir Ali', availabilityNote: 'Monday–Friday, 9am–5pm CST', emailSignature: 'Best,\nAamir Ali\n972-214-4380' }
  })
  const [_showSettings, _setShowSettings] = useState(false)

  /* ── Email composer state ── */
  const [emailTemplate, setEmailTemplate]   = useState<EmailTemplateKey>('followUp')
  const [emailOutput, setEmailOutput]       = useState('')
  const [emailCopied, setEmailCopied]       = useState(false)

  const [showDismissed, setShowDismissed]   = useState(false)
  const [showTracked, setShowTracked]       = useState(false)
  const [showQueueForm, setShowQueueForm]   = useState(false)
  const [showSimulate, setShowSimulate]     = useState(false)
  const [simResult, setSimResult]           = useState<{ type: 'success' | 'info'; message: string } | null>(null)
  const [simForm, setSimForm]               = useState({
    company: '', role: '', emailType: 'acknowledgment' as EmailType,
    source: 'email' as QueuedApp['source'], snippet: '',
  })

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
    emailType: 'acknowledgment' as EmailType,
    snippet: '', receivedOn: getTodayIso(),
  })

  /* ── Persist ── */
  useEffect(() => { localStorage.setItem(STORAGE_KEY, JSON.stringify(applications)) }, [applications])
  useEffect(() => { localStorage.setItem(QUEUE_KEY, JSON.stringify(queue)) }, [queue])
  useEffect(() => { localStorage.setItem(GOAL_KEY, String(weeklyGoal)) }, [weeklyGoal])
  useEffect(() => { localStorage.setItem(SETTINGS_KEY, JSON.stringify(settings)) }, [settings])

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
  const trackedQueue   = queue.filter((q) => q.status === 'tracked')

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
      source: queueForm.source, emailType: queueForm.emailType,
      snippet: queueForm.snippet.trim(),
      receivedOn: queueForm.receivedOn, status: 'pending',
    }, ...curr])
    setQueueForm({ company: '', role: '', source: 'manual', emailType: 'acknowledgment', snippet: '', receivedOn: getTodayIso() })
    setShowQueueForm(false)
  }

  /* Convert a queue item into a full tracker application and mark it tracked */
  function trackFromQueue(q: QueuedApp, overrideStage?: Stage) {
    const stage: Stage = overrideStage ?? EMAIL_TYPE_TO_STAGE[q.emailType] ?? 'Application Submitted'
    const appId = Date.now()
    const newApp: Application = {
      id: appId, company: q.company, role: q.role,
      source: q.source === 'email' ? 'Email' : q.source === 'linkedin' ? 'LinkedIn' : 'Other',
      appliedOn: q.receivedOn, followUpOn: addDays(q.receivedOn, 7),
      stage, priority: 'Medium', fitScore: 0, desireRank: 0,
      salary: 'TBD', salaryTargeted: '', workStyle: '',
      recruiter: '', recruiterContact: '', interviewingManager: '', managerContact: '',
      interviewDate: '', interviewStage: '', prepStatus: 'Not started',
      jobPostingUrl: '', jobDescription: '', resumeVersion: '', coverLetterNote: '',
      companyResearch: '', prepQuestions: '', talkingPoints: '',
      notes: q.snippet || '', offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
      sourceQueueId: q.id, autoAdded: false,
      history: [createHistoryEntry(
        `Added from inbox`, q.snippet || 'Moved from inbox to tracker.', 'Applied', q.receivedOn,
      )],
    }
    setApplications((curr) => [newApp, ...curr])
    /* Mark as tracked (not deleted) so we remember where it came from */
    setQueue((curr) => curr.map((item) =>
      item.id === q.id ? { ...item, status: 'tracked', trackedAppId: appId } : item,
    ))
    setSelectedId(appId)
    setActiveView('tracker')
    setDetailTab('overview')
  }

  function dismissFromQueue(id: number) {
    setQueue((curr) => curr.map((q) => q.id === id ? { ...q, status: 'dismissed' } : q))
  }

  function restoreFromQueue(id: number) {
    setQueue((curr) => curr.map((q) => q.id === id ? { ...q, status: 'pending' } : q))
  }

  /*
   * ── handleIncomingEmail ──────────────────────────────────────────────────
   * Core deduplication + routing logic.
   * This is what n8n will call (via webhook) when an email comes in.
   * Until then, the Simulate panel calls it directly for testing.
   *
   * Routing rules:
   *  1. "acknowledgment" → always goes to queue (user decides to track or not)
   *  2. Any other type:
   *     a. Company already in tracker (non-archived) → update stage only, no new entry
   *     b. Company in queue (pending) → convert queue item to tracker + set stage
   *     c. Not found anywhere → auto-add directly to tracker at the mapped stage
   */
  function handleIncomingEmail(
    company: string, role: string,
    emailType: EmailType,
    source: QueuedApp['source'],
    snippet: string,
  ): string {
    const norm = company.trim().toLowerCase()

    /* Rule 1 — acknowledgment emails go to queue for the user to decide */
    if (emailType === 'acknowledgment') {
      /* Don't add a duplicate if this company+status is already pending */
      const alreadyQueued = queue.some(
        (q) => q.company.trim().toLowerCase() === norm && q.status === 'pending',
      )
      const alreadyTracked = applications.some(
        (a) => a.company.trim().toLowerCase() === norm && a.stage !== 'Archived',
      )
      if (alreadyTracked) {
        return `ℹ️ "${company}" is already being tracked — acknowledgment email ignored.`
      }
      if (alreadyQueued) {
        return `ℹ️ "${company}" is already in your inbox queue.`
      }
      const newQueueItem: QueuedApp = {
        id: Date.now(), company: company.trim(), role: role.trim(),
        source, emailType, snippet, receivedOn: getTodayIso(), status: 'pending',
      }
      setQueue((curr) => [newQueueItem, ...curr])
      return `📬 Added "${company}" to your inbox queue — select it to start tracking.`
    }

    const newStage = EMAIL_TYPE_TO_STAGE[emailType]

    /* Rule 2a — company already in tracker → update stage (no new entry) */
    const existingApp = applications.find(
      (a) => a.company.trim().toLowerCase() === norm && a.stage !== 'Archived',
    )
    if (existingApp) {
      const currIdx = stageOptions.indexOf(existingApp.stage)
      const newIdx  = stageOptions.indexOf(newStage)
      if (newIdx > currIdx) {
        /* Only move forward, never backward */
        handleStageChange(existingApp, newStage)
        appendHistory(existingApp.id, createHistoryEntry(
          `Email: ${EMAIL_TYPE_LABELS[emailType]}`,
          snippet || `Incoming email triggered stage update.`,
          'Status',
        ))
        return `✅ Updated "${company}" in your tracker → ${newStage}`
      }
      return `ℹ️ "${company}" is already at "${existingApp.stage}" — no stage change needed.`
    }

    /* Rule 2b — company found in queue (pending) → convert + set stage */
    const queueItem = queue.find(
      (q) => q.company.trim().toLowerCase() === norm && q.status === 'pending',
    )
    if (queueItem) {
      const appId = Date.now()
      const newApp: Application = {
        id: appId, company: queueItem.company, role: queueItem.role || role,
        source: source === 'email' ? 'Email' : source === 'linkedin' ? 'LinkedIn' : 'Other',
        appliedOn: queueItem.receivedOn, followUpOn: addDays(queueItem.receivedOn, 7),
        stage: newStage, priority: 'Medium', fitScore: 0, desireRank: 0,
        salary: 'TBD', salaryTargeted: '', workStyle: '',
        recruiter: '', recruiterContact: '', interviewingManager: '', managerContact: '',
        interviewDate: '', interviewStage: '', prepStatus: 'Not started',
        jobPostingUrl: '', jobDescription: '', resumeVersion: '', coverLetterNote: '',
        companyResearch: '', prepQuestions: '', talkingPoints: '',
        notes: snippet || '', offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
        sourceQueueId: queueItem.id, autoAdded: true,
        history: [
          createHistoryEntry('Auto-added from email', snippet || `Email triggered: ${EMAIL_TYPE_LABELS[emailType]}`, 'Applied', queueItem.receivedOn),
          createHistoryEntry(EMAIL_TYPE_LABELS[emailType], snippet, 'Status'),
        ],
      }
      setApplications((curr) => [newApp, ...curr])
      setQueue((curr) => curr.map((q) =>
        q.id === queueItem.id ? { ...q, status: 'tracked', trackedAppId: appId } : q,
      ))
      return `✅ "${company}" was in your queue — moved to tracker automatically at "${newStage}"`
    }

    /* Rule 2c — not found anywhere → auto-add to tracker */
    const appId = Date.now()
    const newApp: Application = {
      id: appId, company: company.trim(), role: role.trim(),
      source: source === 'email' ? 'Email' : source === 'linkedin' ? 'LinkedIn' : 'Other',
      appliedOn: getTodayIso(), followUpOn: addDays(getTodayIso(), 7),
      stage: newStage, priority: 'Medium', fitScore: 0, desireRank: 0,
      salary: 'TBD', salaryTargeted: '', workStyle: '',
      recruiter: '', recruiterContact: '', interviewingManager: '', managerContact: '',
      interviewDate: '', interviewStage: '', prepStatus: 'Not started',
      jobPostingUrl: '', jobDescription: '', resumeVersion: '', coverLetterNote: '',
      companyResearch: '', prepQuestions: '', talkingPoints: '',
      notes: snippet || '', offerAmount: '', decisionNotes: '', archiveReason: '', archiveDetail: '',
      autoAdded: true,
      history: [createHistoryEntry(
        'Auto-added from email', snippet || `Email triggered: ${EMAIL_TYPE_LABELS[emailType]}`, 'Applied',
      )],
    }
    setApplications((curr) => [newApp, ...curr])
    return `✅ "${company}" auto-added to your tracker at "${newStage}" (new entry — wasn't in your queue or tracker)`
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
          {(['dashboard','tracker','pipeline','interviews','calendar','inbox','stats','rejections','archive'] as View[]).map((view) => {
            const icons: Record<View, React.ReactElement> = {
              dashboard: <DashboardIcon />, tracker: <TrackerIcon />,
              pipeline: <PipelineIcon />, interviews: <InterviewsIcon />,
              calendar: <CalendarIcon />, inbox: <InboxIcon />,
              stats: <StatsIcon />, rejections: <RejectionsIcon />, archive: <ArchiveIcon />,
            }
            const labels: Record<View, string> = {
              dashboard: 'Dashboard', tracker: 'Tracker', pipeline: 'Pipeline',
              interviews: 'Interviews', calendar: 'Calendar', inbox: 'Inbox',
              stats: 'Stats', rejections: 'Rejections', archive: 'Archive',
            }
            const rejectionCount = applications.filter((a) =>
              a.stage === 'No response' || a.stage === 'Archived'
            ).length
            return (
              <button
                key={view}
                className={activeView === view ? 'nav-link active' : 'nav-link'}
                onClick={() => setActiveView(view)}
              >
                {icons[view]}
                {labels[view]}
                {view === 'inbox' && pendingQueue.length > 0 && (
                  <span className="nav-badge">{pendingQueue.length}</span>
                )}
                {view === 'rejections' && rejectionCount > 0 && (
                  <span className="nav-badge danger">{rejectionCount}</span>
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
                  {(['overview','contact','job','prep','offer','email'] as DetailTab[]).map((tab) => (
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

                {/* ── Email composer tab ── */}
                {detailTab === 'email' && (
                  <div className="detail-tab-body">
                    <div className="email-composer">
                      <div className="email-templates-row">
                        {(Object.entries(EMAIL_TEMPLATES) as [EmailTemplateKey, { label: string; description: string }][]).map(([k, v]) => (
                          <button
                            key={k}
                            className={`email-template-chip${emailTemplate === k ? ' active' : ''}`}
                            onClick={() => {
                              setEmailTemplate(k)
                              setEmailOutput(buildEmailTemplate(k, selectedApplication, settings))
                              setEmailCopied(false)
                            }}
                          >
                            {v.label}
                          </button>
                        ))}
                      </div>
                      {emailOutput ? (
                        <>
                          <p style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>
                            {EMAIL_TEMPLATES[emailTemplate].description} — edit before sending.
                          </p>
                          <textarea
                            className="email-output"
                            value={emailOutput}
                            onChange={(e) => setEmailOutput(e.target.value)}
                          />
                          <div className="email-actions">
                            <button
                              className={`ghost-button${emailCopied ? ' success' : ''}`}
                              onClick={() => {
                                navigator.clipboard.writeText(emailOutput)
                                setEmailCopied(true)
                                setTimeout(() => setEmailCopied(false), 2500)
                              }}
                            >
                              {emailCopied ? '✓ Copied!' : 'Copy to clipboard'}
                            </button>
                            <a
                              className="ghost-button"
                              href={`mailto:${selectedApplication.recruiterContact || ''}?subject=Re: ${selectedApplication.role} at ${selectedApplication.company}&body=${encodeURIComponent(emailOutput)}`}
                              style={{ textDecoration: 'none', display: 'inline-flex', alignItems: 'center' }}
                            >
                              Open in email client →
                            </a>
                          </div>
                        </>
                      ) : (
                        <p className="empty">Select a template above to generate an email pre-filled with this application's details.</p>
                      )}
                    </div>

                    <div className="section-divider" />
                    <span className="section-label">Your availability (used in scheduling template)</span>
                    <label className="notes-field">
                      <textarea
                        value={settings.availabilityNote}
                        onChange={(e) => setSettings((s) => ({ ...s, availabilityNote: e.target.value }))}
                        style={{ minHeight: '60px' }}
                        placeholder="e.g. Monday–Friday, 9am–5pm CST. Prefer mornings."
                      />
                    </label>
                    <label className="form-label">Email signature
                      <textarea
                        value={settings.emailSignature}
                        onChange={(e) => setSettings((s) => ({ ...s, emailSignature: e.target.value }))}
                        style={{ minHeight: '56px' }}
                        placeholder="Best,&#10;Your Name&#10;Phone"
                      />
                    </label>
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

        {/* ─── Stats / Reporting ─── */}
        {activeView === 'stats' && (
          <StatsView applications={applications} />
        )}

        {/* ─── Inbox / Queue ─── */}
        {activeView === 'inbox' && (
          <div className="inbox-wrap">

            {/* Toolbar */}
            <div className="inbox-toolbar">
              <div>
                <strong style={{ fontSize: '0.9rem' }}>{pendingQueue.length} pending</strong>
                <span style={{ color: 'var(--muted)', fontSize: '0.82rem', marginLeft: '8px' }}>
                  — pick which applications you want to track
                </span>
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button className="ghost-button" style={{ fontSize: '0.8rem' }}
                  onClick={() => { setShowSimulate((v) => !v); setSimResult(null) }}>
                  {showSimulate ? 'Hide simulator' : '⚡ Test email routing'}
                </button>
                <button className="ghost-button" onClick={() => setShowQueueForm((v) => !v)}>
                  {showQueueForm ? 'Cancel' : '+ Add manually'}
                </button>
              </div>
            </div>

            {/*
              ── Email Routing Simulator ──────────────────────────────────
              Lets you test the dedup logic before n8n is connected.
              When n8n is live, it will call handleIncomingEmail() via a webhook
              and this panel won't be needed for production use.
            */}
            {showSimulate && (
              <div className="simulate-panel">
                <div className="simulate-header">
                  <strong>Email routing simulator</strong>
                  <span>
                    Test how an incoming email gets routed — same logic n8n will use.
                    Try simulating "thanks for applying" then "interview invite" for the same company.
                  </span>
                </div>
                <div className="simulate-form">
                  <label className="form-label">Company name
                    <input value={simForm.company} placeholder="e.g. Acme Health"
                      onChange={(e) => setSimForm((f) => ({ ...f, company: e.target.value }))} />
                  </label>
                  <label className="form-label">Role (optional)
                    <input value={simForm.role} placeholder="e.g. Operations Manager"
                      onChange={(e) => setSimForm((f) => ({ ...f, role: e.target.value }))} />
                  </label>
                  <label className="form-label">Email type
                    <select value={simForm.emailType}
                      onChange={(e) => setSimForm((f) => ({ ...f, emailType: e.target.value as EmailType }))}>
                      {(Object.entries(EMAIL_TYPE_LABELS) as [EmailType, string][]).map(([k, v]) => (
                        <option key={k} value={k}>{v}</option>
                      ))}
                    </select>
                  </label>
                  <label className="form-label">Source
                    <select value={simForm.source}
                      onChange={(e) => setSimForm((f) => ({ ...f, source: e.target.value as QueuedApp['source'] }))}>
                      <option value="email">Email</option>
                      <option value="linkedin">LinkedIn</option>
                      <option value="manual">Manual</option>
                    </select>
                  </label>
                  <label className="form-label" style={{ gridColumn: '1 / -1' }}>
                    Email snippet (optional)
                    <input value={simForm.snippet} placeholder="Paste a line from the email to save as a note…"
                      onChange={(e) => setSimForm((f) => ({ ...f, snippet: e.target.value }))} />
                  </label>
                  <button
                    type="button"
                    className="primary-button"
                    style={{ gridColumn: '1 / -1' }}
                    disabled={!simForm.company.trim()}
                    onClick={() => {
                      const result = handleIncomingEmail(
                        simForm.company, simForm.role,
                        simForm.emailType, simForm.source, simForm.snippet,
                      )
                      setSimResult({ type: result.startsWith('✅') ? 'success' : 'info', message: result })
                    }}
                  >
                    Simulate incoming email →
                  </button>
                </div>
                {simResult && (
                  <div className={`sim-result ${simResult.type}`}>
                    {simResult.message}
                  </div>
                )}
              </div>
            )}

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
                <label className="form-label">Email / message type
                  <select value={queueForm.emailType}
                    onChange={(e) => setQueueForm((f) => ({ ...f, emailType: e.target.value as EmailType }))}>
                    {(Object.entries(EMAIL_TYPE_LABELS) as [EmailType, string][]).map(([k, v]) => (
                      <option key={k} value={k}>{v}</option>
                    ))}
                  </select>
                </label>
                <label className="form-label">Received on
                  <input type="date" value={queueForm.receivedOn}
                    onChange={(e) => setQueueForm((f) => ({ ...f, receivedOn: e.target.value }))} />
                </label>
                <label className="form-label" style={{ gridColumn: '1 / -1' }}>
                  Note / email snippet
                  <textarea value={queueForm.snippet} style={{ minHeight: '60px' }}
                    placeholder="Paste the email subject line or a short note…"
                    onChange={(e) => setQueueForm((f) => ({ ...f, snippet: e.target.value }))} />
                </label>
                <button type="submit" className="primary-button" style={{ gridColumn: '1 / -1' }}>
                  Add to queue
                </button>
              </form>
            )}

            {/* How the queue works */}
            {!showSimulate && !showQueueForm && (
              <div className="inbox-how-it-works">
                <span className="inbox-how-step">
                  <span className="inbox-how-num">1</span>
                  Apply anywhere online
                </span>
                <span className="inbox-how-arrow">→</span>
                <span className="inbox-how-step">
                  <span className="inbox-how-num">2</span>
                  Confirmation email arrives here
                </span>
                <span className="inbox-how-arrow">→</span>
                <span className="inbox-how-step">
                  <span className="inbox-how-num">3</span>
                  Track the ones you care about
                </span>
                <span className="inbox-how-arrow">→</span>
                <span className="inbox-how-step">
                  <span className="inbox-how-num">4</span>
                  Interview invite? Auto-promoted
                </span>
              </div>
            )}

            {/* Pending queue */}
            {pendingQueue.length === 0 && !showQueueForm && !showSimulate ? (
              <div className="inbox-empty">
                <div className="inbox-empty-icon">📬</div>
                <p>
                  Your inbox is empty. Once Gmail is connected via n8n, "thanks for applying" emails
                  will appear here automatically. Use "Test email routing" to try the logic now, or
                  add items manually.
                </p>
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
                          <span className="queue-meta-item">{EMAIL_TYPE_LABELS[q.emailType]}</span>
                          <span className="queue-meta-item">Received {formatDate(q.receivedOn)}</span>
                          {overdue && (
                            <span className="queue-meta-item warn">
                              ⚠ {daysWaiting}d waiting
                            </span>
                          )}
                        </div>
                        {q.snippet && <p className="queue-snippet">{q.snippet}</p>}
                        <p className="queue-hint">
                          Track this to monitor it — if an interview invite comes in for this company, it'll auto-promote to your tracker.
                        </p>
                      </div>
                      <div className="queue-actions">
                        <button className="primary-button sm" onClick={() => trackFromQueue(q)}>
                          Track this →
                        </button>
                        <button className="ghost-button sm" onClick={() => dismissFromQueue(q.id)}>
                          Not interested
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}

            {/* Already tracking (from queue) */}
            {trackedQueue.length > 0 && (
              <>
                <button className="inbox-dismissed-toggle" onClick={() => setShowTracked((v) => !v)}>
                  {showTracked ? '▾' : '▸'} {trackedQueue.length} already tracking
                </button>
                {showTracked && (
                  <div className="queue-list">
                    {trackedQueue.map((q) => (
                      <div key={q.id} className="queue-card dismissed">
                        <div className="queue-card-body">
                          <div className="queue-card-title">
                            <strong>{q.company}</strong>
                            {q.role && <span className="queue-role">{q.role}</span>}
                          </div>
                          <div className="queue-meta">
                            <span className="queue-source-badge source-manual"
                              style={{ background: 'var(--ok-dim)', color: 'var(--ok)', borderColor: 'rgba(52,211,153,0.22)' }}>
                              tracking
                            </span>
                            <span className="queue-meta-item">Received {formatDate(q.receivedOn)}</span>
                          </div>
                        </div>
                        <div className="queue-actions">
                          {q.trackedAppId && (
                            <button className="ghost-button sm" onClick={() => {
                              setSelectedId(q.trackedAppId!)
                              setActiveView('tracker')
                            }}>
                              Open
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}

            {/* Dismissed */}
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

        {/* ─── Rejection Center ─── */}
        {activeView === 'rejections' && (
          <RejectionCenterView
            applications={applications}
            onOpen={(id) => { setSelectedId(id); setActiveView('tracker') }}
          />
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
/* ─── Stats View ────────────────────────────────── */
function StatsView({ applications }: { applications: Application[] }) {
  const active   = applications.filter((a) => a.stage !== 'Archived')
  const archived = applications.filter((a) => a.stage === 'Archived')
  const total    = applications.length

  /* Funnel stages */
  const funnelStages = [
    { label: 'Applied',          count: applications.filter((a) => ['Saved','Application Submitted','Follow-Up 1','Follow-Up 2','Waiting on response'].includes(a.stage)).length },
    { label: 'Recruiter Screen', count: applications.filter((a) => a.stage === 'Recruiter Screen').length },
    { label: 'Round 1',          count: applications.filter((a) => ['Scheduled 1st Interview','Completed 1st Interview'].includes(a.stage)).length },
    { label: 'Round 2',          count: applications.filter((a) => ['Scheduled 2nd Interview','Completed 2nd Interview'].includes(a.stage)).length },
    { label: 'Round 3+',         count: applications.filter((a) => ['Scheduled 3rd Interview','Completed 3rd Interview','Scheduled 4th Interview','Completed 4th Interview'].includes(a.stage)).length },
    { label: 'Offer',            count: applications.filter((a) => ['Offer made','Offer accepted','Offer declined'].includes(a.stage)).length },
  ]
  const funnelMax = Math.max(funnelStages[0].count, 1)

  /* Rejections */
  const rejectionReasons = archiveReasonsConst.filter((r) => r.toLowerCase().includes('reject') || r === 'Email rejection')
  const rejectedApps = archived.filter((a) =>
    rejectionReasons.some((r) => a.archiveReason?.includes(r)) ||
    a.archiveReason?.toLowerCase().includes('reject')
  )
  const noResponseApps = applications.filter((a) => a.stage === 'No response')
  const totalRejections = rejectedApps.length + noResponseApps.length

  /* Rejection by stage */
  const rejByStage = [
    { label: 'No response / ghosted',    count: noResponseApps.length },
    { label: 'Rejected after screen',    count: archived.filter((a) => a.archiveReason === 'Rejected after recruiter screen').length },
    { label: 'Rejected after Round 1',   count: archived.filter((a) => a.archiveReason === 'Rejected after 1st round').length },
    { label: 'Rejected after final',     count: archived.filter((a) => a.archiveReason === 'Rejected after final round').length },
    { label: 'Email rejection',          count: archived.filter((a) => a.archiveReason === 'Email rejection').length },
    { label: 'Role filled / other',      count: archived.filter((a) => ['Role filled','Salary mismatch','Other'].includes(a.archiveReason)).length },
  ].filter((r) => r.count > 0)

  /* By source */
  const sourceMap: Record<string, number> = {}
  applications.forEach((a) => {
    const s = a.source || 'Other'
    sourceMap[s] = (sourceMap[s] ?? 0) + 1
  })
  const sourceMax = Math.max(...Object.values(sourceMap), 1)

  /* Response rate */
  const gotResponse = applications.filter((a) =>
    !['Saved','Application Submitted','Waiting on response'].includes(a.stage)
  ).length
  const responseRate = total > 0 ? Math.round((gotResponse / total) * 100) : 0

  /* Next steps count (ever got past applied) */
  const nextStepsCount = applications.filter((a) =>
    stageOptions.indexOf(a.stage) >= stageOptions.indexOf('Recruiter Screen')
  ).length

  return (
    <div className="stats-wrap">

      {/* Overview chips */}
      <div className="stats-chips">
        <div className="stats-chip">
          <span className="stats-chip-num">{total}</span>
          <span className="stats-chip-label">Total applied</span>
        </div>
        <div className="stats-chip">
          <span className="stats-chip-num">{active.length}</span>
          <span className="stats-chip-label">Still active</span>
        </div>
        <div className="stats-chip accent">
          <span className="stats-chip-num">{nextStepsCount}</span>
          <span className="stats-chip-label">Got next steps</span>
        </div>
        <div className="stats-chip warn">
          <span className="stats-chip-num">{totalRejections}</span>
          <span className="stats-chip-label">Rejections</span>
        </div>
        <div className="stats-chip ok">
          <span className="stats-chip-num">{applications.filter((a) => ['Offer made','Offer accepted'].includes(a.stage)).length}</span>
          <span className="stats-chip-label">Offers received</span>
        </div>
        <div className="stats-chip">
          <span className="stats-chip-num">{responseRate}%</span>
          <span className="stats-chip-label">Response rate</span>
        </div>
      </div>

      <div className="stats-grid">

        {/* Funnel */}
        <div className="panel-card stats-panel">
          <h3>Application funnel</h3>
          <div className="funnel-chart">
            {funnelStages.map((s, i) => {
              const pct = Math.round((s.count / funnelMax) * 100)
              const conv = i > 0 && funnelStages[i-1].count > 0
                ? Math.round((s.count / funnelStages[i-1].count) * 100)
                : null
              return (
                <div key={s.label} className="funnel-row">
                  <span className="funnel-label">{s.label}</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill" style={{ width: `${pct}%` }} />
                  </div>
                  <span className="funnel-count">{s.count}</span>
                  {conv !== null && (
                    <span className="funnel-conv" title="conversion from previous stage">
                      {conv}%
                    </span>
                  )}
                </div>
              )
            })}
          </div>
          {total === 0 && <p className="empty">No data yet — add applications to see your funnel.</p>}
        </div>

        {/* Rejection breakdown */}
        <div className="panel-card stats-panel">
          <h3>Rejection breakdown</h3>
          {totalRejections === 0 ? (
            <p className="empty">No rejections logged yet.</p>
          ) : (
            <>
              <div className="rejection-list">
                {rejByStage.map((r) => (
                  <div key={r.label} className="rejection-row">
                    <span className="rejection-label">{r.label}</span>
                    <div className="rejection-bar-track">
                      <div className="rejection-bar-fill"
                        style={{ width: `${Math.round((r.count / totalRejections) * 100)}%` }} />
                    </div>
                    <span className="rejection-count">{r.count}</span>
                  </div>
                ))}
              </div>
              {rejectedApps.length > 0 && (
                <>
                  <p className="section-label" style={{ marginTop: '12px' }}>Recent rejections</p>
                  <div className="list-stack" style={{ marginTop: '6px' }}>
                    {rejectedApps.slice(0, 5).map((a) => (
                      <div key={a.id} className="list-item" style={{ cursor: 'default', padding: '7px 11px' }}>
                        <div>
                          <strong>{a.company}</strong>
                          <p>{a.role}</p>
                        </div>
                        <span style={{ fontSize: '0.75rem', color: 'var(--muted)' }}>{a.archiveReason}</span>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </div>

        {/* By source */}
        <div className="panel-card stats-panel">
          <h3>Applications by source</h3>
          {Object.keys(sourceMap).length === 0 ? (
            <p className="empty">No data yet.</p>
          ) : (
            <div className="funnel-chart">
              {Object.entries(sourceMap).sort((a, b) => b[1] - a[1]).map(([source, count]) => (
                <div key={source} className="funnel-row">
                  <span className="funnel-label">{source}</span>
                  <div className="funnel-bar-track">
                    <div className="funnel-bar-fill blue" style={{ width: `${Math.round((count / sourceMax) * 100)}%` }} />
                  </div>
                  <span className="funnel-count">{count}</span>
                  <span className="funnel-conv">{Math.round((count / total) * 100)}%</span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Round-by-round */}
        <div className="panel-card stats-panel">
          <h3>Interview rounds reached</h3>
          <div className="rounds-list">
            {[
              { label: 'Recruiter Screen',    count: applications.filter((a) => stageOptions.indexOf(a.stage) >= stageOptions.indexOf('Recruiter Screen')).length },
              { label: '1st Round Interview', count: applications.filter((a) => stageOptions.indexOf(a.stage) >= stageOptions.indexOf('Scheduled 1st Interview')).length },
              { label: '2nd Round Interview', count: applications.filter((a) => stageOptions.indexOf(a.stage) >= stageOptions.indexOf('Scheduled 2nd Interview')).length },
              { label: '3rd Round+',          count: applications.filter((a) => stageOptions.indexOf(a.stage) >= stageOptions.indexOf('Scheduled 3rd Interview')).length },
              { label: 'Offer received',      count: applications.filter((a) => ['Offer made','Offer accepted','Offer declined'].includes(a.stage)).length },
              { label: 'Offer accepted',      count: applications.filter((a) => a.stage === 'Offer accepted').length },
            ].map((r) => (
              <div key={r.label} className="rounds-row">
                <span className="rounds-label">{r.label}</span>
                <span className="rounds-count">{r.count}</span>
                <span className="rounds-pct">{total > 0 ? `${Math.round((r.count / total) * 100)}% of all` : '—'}</span>
              </div>
            ))}
          </div>
        </div>

      </div>
    </div>
  )
}

/* Archive reasons constant (used in StatsView) */
const archiveReasonsConst = [
  'Email rejection', 'Rejected after recruiter screen', 'Rejected after 1st round',
  'Rejected after final round', 'Role filled', 'Salary mismatch',
  'Withdrew', 'No longer interested', 'Unable to contact', 'Offer declined', 'Other',
]

/* ─── Rejection Center ──────────────────────────── */
function RejectionCenterView({
  applications,
  onOpen,
}: {
  applications: Application[]
  onOpen: (id: number) => void
}) {
  const [filter, setFilter] = useState<'all' | 'ghosted' | 'near-miss' | 'early'>('all')

  function stageReachedLabel(a: Application): string {
    if (a.stage === 'No response') return 'No response (ghosted)'
    const r = a.archiveReason || ''
    if (r === 'Email rejection')                  return 'Email rejection (no contact)'
    if (r === 'Rejected after recruiter screen')  return 'Recruiter screen'
    if (r === 'Rejected after 1st round')         return 'Round 1 interview'
    if (r === 'Rejected after final round')       return 'Final round interview'
    if (r === 'Offer declined')                   return 'Offer stage (you declined)'
    if (r === 'Role filled')                      return 'Role filled'
    if (r === 'Salary mismatch')                  return 'Salary mismatch'
    if (r === 'Withdrew')                         return 'Withdrew'
    if (a.stage === 'Archived') {
      const hist = a.history ?? []
      if (hist.some((h) => ['Scheduled 4th Interview','Completed 4th Interview','Scheduled 3rd Interview','Completed 3rd Interview'].includes(h.label))) return 'Late-round interview'
      if (hist.some((h) => ['Scheduled 2nd Interview','Completed 2nd Interview'].includes(h.label))) return 'Round 2 interview'
      if (hist.some((h) => ['Scheduled 1st Interview','Completed 1st Interview'].includes(h.label))) return 'Round 1 interview'
    }
    return a.archiveReason || 'Unknown'
  }

  function isNearMiss(a: Application): boolean {
    return ['Round 1 interview','Round 2 interview','Late-round interview','Final round interview'].includes(stageReachedLabel(a))
  }

  function isGhosted(a: Application): boolean {
    return a.stage === 'No response' || stageReachedLabel(a) === 'Email rejection (no contact)'
  }

  const allRejections = applications.filter((a) => {
    if (a.stage === 'No response') return true
    if (a.stage === 'Archived') {
      const r = a.archiveReason || ''
      if (r === 'No longer interested' || r === 'Unable to contact') return false
      return true
    }
    return false
  })

  const displayed = allRejections.filter((a) => {
    if (filter === 'all')       return true
    if (filter === 'ghosted')   return isGhosted(a)
    if (filter === 'near-miss') return isNearMiss(a)
    if (filter === 'early')     return !isNearMiss(a) && !isGhosted(a)
    return true
  })

  const groups: Record<string, Application[]> = {}
  displayed.forEach((a) => {
    const label = stageReachedLabel(a)
    if (!groups[label]) groups[label] = []
    groups[label].push(a)
  })

  const groupOrder = [
    'Final round interview','Late-round interview','Round 2 interview','Round 1 interview',
    'Offer stage (you declined)','Recruiter screen','Role filled',
    'Email rejection (no contact)','No response (ghosted)','Salary mismatch','Withdrew','Unknown',
  ]
  const sortedGroups = groupOrder
    .filter((g) => groups[g]?.length)
    .map((g) => ({ label: g, apps: groups[g] }))
  Object.keys(groups).forEach((g) => {
    if (!groupOrder.includes(g) && groups[g].length) sortedGroups.push({ label: g, apps: groups[g] })
  })

  const nearMissCount = allRejections.filter(isNearMiss).length
  const ghostedCount  = allRejections.filter(isGhosted).length
  const earlyCount    = allRejections.length - nearMissCount - ghostedCount

  function desireStars(n: number) {
    return '★'.repeat(n) + '☆'.repeat(5 - n)
  }

  return (
    <div className="rej-wrap">
      <div className="rej-chips">
        <div className="rej-chip">
          <span className="rej-chip-num">{allRejections.length}</span>
          <span className="rej-chip-label">Total closed</span>
        </div>
        <div className="rej-chip near-miss">
          <span className="rej-chip-num">{nearMissCount}</span>
          <span className="rej-chip-label">Near misses (got interviews)</span>
        </div>
        <div className="rej-chip ghosted">
          <span className="rej-chip-num">{ghostedCount}</span>
          <span className="rej-chip-label">Ghosted / no response</span>
        </div>
        <div className="rej-chip">
          <span className="rej-chip-num">{earlyCount}</span>
          <span className="rej-chip-label">Early-stage rejections</span>
        </div>
      </div>

      <div className="rej-filters">
        {([['all','All'],['near-miss','Near misses'],['ghosted','Ghosted'],['early','Early stage']] as const).map(([val, label]) => (
          <button
            key={val}
            className={`rej-filter-btn${filter === val ? ' active' : ''}`}
            onClick={() => setFilter(val)}
          >
            {label}
          </button>
        ))}
      </div>

      {displayed.length === 0 ? (
        <div className="inbox-empty">
          <div className="inbox-empty-icon">🎯</div>
          <p>No rejections to show here — keep applying!</p>
        </div>
      ) : (
        <div className="rej-groups">
          {sortedGroups.map(({ label, apps }) => (
            <div key={label} className="rej-group">
              <div className="rej-group-header">
                <span className="rej-group-label">{label}</span>
                <span className="rej-group-count">{apps.length}</span>
              </div>
              <div className="rej-cards">
                {apps.map((a) => (
                  <div key={a.id} className={`rej-card${isNearMiss(a) ? ' near-miss' : ''}`}>
                    <div className="rej-card-body">
                      <div className="rej-card-top">
                        <div>
                          <strong className="rej-card-company">{a.company}</strong>
                          <span className="rej-card-role">{a.role}</span>
                        </div>
                        {a.desireRank > 0 && (
                          <span className="rej-card-stars" title={`Desire: ${a.desireRank}/5`}>
                            {desireStars(a.desireRank)}
                          </span>
                        )}
                      </div>
                      <div className="rej-card-meta">
                        <span>Applied {formatDate(a.appliedOn)}</span>
                        {a.source && <span>{a.source}</span>}
                        {a.salary && a.salary !== 'TBD' && <span>{a.salary}</span>}
                        {a.archiveDetail && <span className="rej-card-detail">"{a.archiveDetail}"</span>}
                      </div>
                    </div>
                    <button className="ghost-button sm" onClick={() => onOpen(a.id)}>View →</button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
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
    interviews: 'Interview Schedule', calendar: 'Calendar', inbox: 'Application Inbox',
    stats: 'Stats & Reporting', rejections: 'Rejection Center', archive: 'Archive',
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
    stats:      'Full picture — funnel, rejection breakdown, sources, and response rates.',
    rejections: 'Every no — organized by how far you got. Learn the patterns.',
    archive:    'All closed outcomes — rejections, withdrawals, and inactive roles.',
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
