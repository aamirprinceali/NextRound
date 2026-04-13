import type {
  Application, QueuedApp, HuntSession, UserSettings,
  CareerStats, MainStage
} from '../types'
import { STORAGE_KEYS } from '../types'
import { LEGACY_TO_MAIN } from './stages'
import { getTodayIso } from './dates'

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? (JSON.parse(raw) as T) : fallback
  } catch {
    return fallback
  }
}

function safeSet(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // Storage quota exceeded — silently fail
  }
}

// Migrate a legacy application object to the new Application type
function migrateLegacyApp(raw: Record<string, unknown>): Application {
  const legacyStage = (raw.stage as string) ?? 'Application Submitted'
  const mainStage: MainStage = LEGACY_TO_MAIN[legacyStage] ?? 'Applied'

  return {
    id:                   (raw.id as number) ?? Date.now(),
    company:              (raw.company as string) ?? '',
    role:                 (raw.role as string) ?? '',
    source:               (raw.source as string) ?? '',
    appliedOn:            (raw.appliedOn as string) ?? getTodayIso(),
    followUpOn:           (raw.followUpOn as string) ?? '',
    stage:                mainStage,
    subStage:             undefined,
    priority:             (raw.priority as Application['priority']) ?? 'Medium',
    desireRank:           (raw.desireRank as number) ?? 0,
    fitScore:             (raw.fitScore as number) ?? 0,
    salary:               (raw.salary as string) ?? '',
    salaryTargeted:       (raw.salaryTargeted as string) ?? '',
    workStyle:            (raw.workStyle as string) ?? '',
    flagged:              (raw.flagged as boolean) ?? false,
    recruiter:            (raw.recruiter as string) ?? '',
    recruiterContact:     (raw.recruiterContact as string) ?? '',
    interviewingManager:  (raw.interviewingManager as string) ?? '',
    managerContact:       (raw.managerContact as string) ?? '',
    interviewDate:        (raw.interviewDate as string) ?? '',
    prepStatus:           (raw.prepStatus as Application['prepStatus']) ?? 'Not started',
    prepNotes:            '',
    jobPostingUrl:        (raw.jobPostingUrl as string) ?? '',
    jobDescription:       (raw.jobDescription as string) ?? '',
    resumeVersion:        (raw.resumeVersion as string) ?? '',
    coverLetterNote:      (raw.coverLetterNote as string) ?? '',
    companyResearch:      (raw.companyResearch as string) ?? '',
    prepQuestions:        (raw.prepQuestions as string) ?? '',
    talkingPoints:        (raw.talkingPoints as string) ?? '',
    notes:                (raw.notes as string) ?? '',
    quickAddNote:         '',
    offerAmount:          (raw.offerAmount as string) ?? '',
    decisionNotes:        (raw.decisionNotes as string) ?? '',
    huntSessionId:        undefined,
    history:              (raw.history as Application['history']) ?? [],
  }
}

// ─── Applications ──────────────────────────────────────────────────────────────
export function loadApplications(): Application[] {
  const newData = safeGet<Application[]>(STORAGE_KEYS.APPLICATIONS, [])
  if (newData.length > 0) return newData

  // Fall back to legacy NextRound data and migrate it
  const legacy = safeGet<Record<string, unknown>[]>(STORAGE_KEYS.LEGACY_APPS, [])
  if (legacy.length > 0) {
    const migrated = legacy.map(migrateLegacyApp)
    safeSet(STORAGE_KEYS.APPLICATIONS, migrated)
    return migrated
  }

  return []
}

export function saveApplications(apps: Application[]): void {
  safeSet(STORAGE_KEYS.APPLICATIONS, apps)
}

// ─── Queue ─────────────────────────────────────────────────────────────────────
export function loadQueue(): QueuedApp[] {
  const newData = safeGet<QueuedApp[]>(STORAGE_KEYS.QUEUE, [])
  if (newData.length > 0) return newData

  const legacy = safeGet<QueuedApp[]>(STORAGE_KEYS.LEGACY_QUEUE, [])
  if (legacy.length > 0) {
    safeSet(STORAGE_KEYS.QUEUE, legacy)
    return legacy
  }

  return []
}

export function saveQueue(queue: QueuedApp[]): void {
  safeSet(STORAGE_KEYS.QUEUE, queue)
}

// ─── Hunt Session ──────────────────────────────────────────────────────────────
export function loadHuntSession(): HuntSession | null {
  return safeGet<HuntSession | null>(STORAGE_KEYS.HUNT_SESSION, null)
}

export function saveHuntSession(session: HuntSession | null): void {
  safeSet(STORAGE_KEYS.HUNT_SESSION, session)
}

// ─── Settings ──────────────────────────────────────────────────────────────────
const SETTINGS_DEFAULTS: UserSettings = {
  fullName: '',
  availabilityNote: '',
  emailSignature: '',
  priorities: ['salary', 'role_growth', 'remote'],
  targetSalaryGlobal: '',
  onboardingComplete: false,
}

export function loadSettings(): UserSettings {
  const newData = safeGet<Partial<UserSettings>>(STORAGE_KEYS.SETTINGS, {})
  if (Object.keys(newData).length > 0) return { ...SETTINGS_DEFAULTS, ...newData }

  // Migrate legacy settings
  const legacy = safeGet<Partial<UserSettings>>(STORAGE_KEYS.LEGACY_SETTINGS, {})
  return { ...SETTINGS_DEFAULTS, ...legacy }
}

export function saveSettings(settings: UserSettings): void {
  safeSet(STORAGE_KEYS.SETTINGS, settings)
}

// ─── Career Stats ──────────────────────────────────────────────────────────────
const STATS_DEFAULTS: CareerStats = {
  totalApplied: 0,
  totalInterviews: 0,
  totalOffers: 0,
  totalAccepted: 0,
  totalRejections: 0,
  huntsCompleted: 0,
  badgesEarned: [],
}

export function loadCareerStats(): CareerStats {
  return safeGet<CareerStats>(STORAGE_KEYS.CAREER_STATS, STATS_DEFAULTS)
}

export function saveCareerStats(stats: CareerStats): void {
  safeSet(STORAGE_KEYS.CAREER_STATS, stats)
}
