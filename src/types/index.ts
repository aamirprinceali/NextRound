// ─── Stage System ──────────────────────────────────────────────────────────────
// 7 main stages. Sub-states add detail without replacing the main stage
// for counting/funnel purposes.

export type MainStage =
  | 'Applied'       // Staging tier — all submissions land here
  | 'Screening'     // Recruiter / phone screen
  | 'Assessment'    // Take-home, coding challenge, etc.
  | 'Interviewing'  // Any live interview round
  | 'Deciding'      // Waiting on final decision
  | 'Offer'         // Offer received
  | 'Closed'        // Rejected, withdrawn, ghosted

export type SubStage =
  // Assessment
  | 'Assessment Assigned'
  | 'Assessment In Progress'
  | 'Assessment Submitted'
  // Interview rounds
  | 'Round 1'
  | 'Round 2'
  | 'Round 3'
  | 'Round 4+'
  // Deciding
  | 'Waiting on Decision'
  | 'Company Interviewing Others'
  // Offer
  | 'Offer Received'
  | 'Negotiating'
  | 'Offer Accepted'
  | 'Offer Declined'
  // Closed reasons
  | 'Rejected — Application'
  | 'Rejected — After Screening'
  | 'Rejected — After Round 1'
  | 'Rejected — After Round 2'
  | 'Rejected — Final Round'
  | 'Rejected — Offer Stage'
  | 'Ghosted'
  | 'Withdrew'
  | 'Role Filled'
  | 'Salary Mismatch'

// ─── History ───────────────────────────────────────────────────────────────────
export type HistoryType =
  | 'Applied' | 'Follow-up' | 'Interview' | 'Status'
  | 'Prep' | 'Archive' | 'Note' | 'Offer'

export type HistoryEntry = {
  id: number
  date: string
  label: string
  detail: string
  type: HistoryType
}

// ─── Application ───────────────────────────────────────────────────────────────
export type Application = {
  id: number
  company: string
  role: string
  source: string
  appliedOn: string
  followUpOn: string

  stage: MainStage
  subStage?: SubStage

  priority: 'High' | 'Medium' | 'Low'
  desireRank: number       // 0 = unranked, 1–5
  fitScore: number         // 0–100

  salary: string           // Listed pay from job posting
  salaryTargeted: string   // What the user wants

  workStyle: string
  flagged?: boolean

  // Contacts
  recruiter: string
  recruiterContact: string
  interviewingManager: string
  managerContact: string

  // Interview
  interviewDate: string
  prepStatus: 'Not started' | 'Light prep' | 'Ready'
  prepNotes: string

  // Job details
  jobPostingUrl: string
  jobDescription: string
  resumeVersion: string
  coverLetterNote: string

  // Interview prep
  companyResearch: string
  prepQuestions: string
  talkingPoints: string

  // Notes
  notes: string
  quickAddNote: string

  // Offer
  offerAmount: string
  decisionNotes: string

  // Closed reason
  closedReason?: SubStage

  // Tracking
  sourceQueueId?: number
  autoAdded?: boolean
  huntSessionId?: string

  history: HistoryEntry[]
}

// ─── Hunt Session ──────────────────────────────────────────────────────────────
export type HuntSession = {
  id: string
  startedAt: string
  endedAt?: string
  mode: 'active' | 'casual'
  targetRole: string
  targetSalary: string
  weeklyGoal: number
  status: 'active' | 'completed' | 'paused'
  totalDays?: number
  totalApplied?: number
  offersAccepted?: number
  finalCompany?: string
}

// ─── Applied Queue ─────────────────────────────────────────────────────────────
export type EmailType =
  | 'acknowledgment' | 'interview' | 'assessment'
  | 'next_steps' | 'offer' | 'rejection'

export type QueuedApp = {
  id: number
  company: string
  role: string
  source: 'email' | 'manual' | 'linkedin' | 'indeed' | 'other'
  emailType: EmailType
  snippet: string
  receivedOn: string
  salary?: string
  note?: string
  status: 'pending' | 'dismissed' | 'tracked'
  trackedAppId?: number
  huntSessionId?: string
}

// ─── Gorilla Mode ──────────────────────────────────────────────────────────────
export type GorillaModeSession = {
  id: string
  startedAt: string
  durationMinutes: number
  appTarget: number
  appsSubmitted: number
  completedAt?: string
  hitTarget: boolean
}

// ─── Settings ──────────────────────────────────────────────────────────────────
export type UserPriority =
  | 'salary' | 'role_growth' | 'culture'
  | 'remote' | 'work_life' | 'prestige'

export type UserSettings = {
  fullName: string
  availabilityNote: string
  emailSignature: string
  priorities: UserPriority[]
  targetSalaryGlobal: string
  onboardingComplete: boolean
}

// ─── Badges ────────────────────────────────────────────────────────────────────
export type BadgeId =
  | 'apps_25' | 'apps_100' | 'apps_250' | 'apps_500' | 'apps_1000'
  | 'rej_25' | 'rej_100' | 'rej_250' | 'rej_500'
  | 'first_interview' | 'first_offer' | 'first_accepted'
  | 'weekly_goal_streak_3' | 'gorilla_mode_10'
  | 'hunt_30_days' | 'hunt_60_days' | 'hunt_90_days'

export type EarnedBadge = {
  id: BadgeId
  earnedAt: string
  sessionId: string
}

// ─── Career Stats ──────────────────────────────────────────────────────────────
export type CareerStats = {
  totalApplied: number
  totalInterviews: number
  totalOffers: number
  totalAccepted: number
  totalRejections: number
  huntsCompleted: number
  badgesEarned: EarnedBadge[]
}

// ─── Navigation ────────────────────────────────────────────────────────────────
export type View =
  | 'dashboard'
  | 'applied'
  | 'tracker'
  | 'pipeline'
  | 'interviews'
  | 'calendar'
  | 'stats'
  | 'rejections'
  | 'resume-vault'
  | 'archive'
  | 'settings'

export type DetailTab = 'overview' | 'contact' | 'job' | 'prep' | 'offer' | 'email'

// ─── Storage Keys ──────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  APPLICATIONS:     'prospect-applications',
  QUEUE:            'prospect-queue',
  HUNT_SESSION:     'prospect-hunt-session',
  CAREER_STATS:     'prospect-career-stats',
  SETTINGS:         'prospect-settings',
  BADGES:           'prospect-badges',
  GORILLA_SESSIONS: 'prospect-gorilla-sessions',
  // Legacy keys for migration
  LEGACY_APPS:      'nextround-applications',
  LEGACY_QUEUE:     'nextround-queue',
  LEGACY_GOAL:      'nextround-weekly-goal',
  LEGACY_SETTINGS:  'nextround-settings',
} as const
