# Prospect — Full Redesign Implementation Plan

> **For Claude:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task.

**Goal:** Rebuild NextRound as "Prospect" — a premium fintech-aesthetic job hunting companion with warm personality, Hunt Session model, two-tier pipeline (Applied → In Play), simplified 7-state status system, command center dashboard, nudge engine, Gorilla Mode, and badge/achievement system.

**Architecture:** Migrate from monolithic App.tsx (2,359 lines) + raw CSS to a proper component tree with Tailwind CSS, shadcn/ui, Framer Motion, and Recharts. All existing business logic and localStorage data is preserved — only the UI layer is replaced. New data model adds Hunt Sessions and simplified stage system while remaining backwards-compatible.

**Tech Stack:** React 19 + TypeScript + Vite, Tailwind CSS v4, shadcn/ui, Framer Motion, Recharts, Lucide React, localStorage (no backend yet)

**Branch:** `prospect/redesign` (created from branch-6)

**Design System:**
- Display font: Bricolage Grotesque (Google Fonts)
- Body font: DM Sans (Google Fonts)
- Background: `#08090D` | Surface: `#10111A` | Surface 2: `#171825`
- Primary (brand): `#7EE8A2` (jade-green — growth, forward motion, warm)
- Gold (achievements/goals): `#FBBF24`
- Blue (info/links): `#60A5FA`
- Danger: `#F87171` | Warning: `#FB923C` | Success: `#4ADE80`
- Text: `#EEEEF5` | Muted: `#5F6B7A`

**App Vibe:** "Your successful best friend helping you find a job." Premium fintech with warmth. Satisfying to track. Never feels like work.

---

## PHASE 0 — Project Setup & Rename

### Task 1: Rename project to Prospect + install dependencies

**Files:**
- Modify: `package.json`
- Modify: `index.html`
- Modify: `vite.config.ts`

**Step 1: Install Tailwind CSS v4 for Vite**
```bash
cd ~/Desktop/dev/NextRound
npm install -D tailwindcss @tailwindcss/vite
```

**Step 2: Install shadcn/ui dependencies**
```bash
npm install class-variance-authority clsx tailwind-merge
npx shadcn@latest init
# When prompted: TypeScript=yes, style=default, base color=slate, CSS variables=yes
```

**Step 3: Install remaining deps**
```bash
npm install framer-motion lucide-react recharts
npm install @radix-ui/react-dialog @radix-ui/react-dropdown-menu @radix-ui/react-tabs @radix-ui/react-tooltip @radix-ui/react-progress @radix-ui/react-badge
```

**Step 4: Update package.json name**
Change `"name": "nextround"` → `"name": "prospect"`

**Step 5: Update index.html title**
Change `<title>NextRound</title>` → `<title>Prospect — Job Hunt HQ</title>`

**Step 6: Configure Tailwind in vite.config.ts**
```typescript
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
})
```

**Step 7: Verify dev server starts**
```bash
npm run dev
```
Expected: Server running at http://localhost:5175

**Step 8: Commit**
```bash
git add -A
git commit -m "chore: rename project to Prospect, install Tailwind + shadcn/ui + Framer Motion + Recharts"
```

---

### Task 2: Design system — global CSS tokens + fonts

**Files:**
- Modify: `src/index.css` (replace entirely)
- Delete: `src/App.css` (will be replaced by component styles)

**Step 1: Replace src/index.css with design system**
```css
@import url('https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,400;12..96,500;12..96,600;12..96,700;12..96,800&family=DM+Sans:ital,opsz,wght@0,9..40,300;0,9..40,400;0,9..40,500;0,9..40,600;1,9..40,400&display=swap');
@import "tailwindcss";

:root {
  /* Backgrounds */
  --bg:           #08090D;
  --bg-soft:      #0D0E14;
  --surface:      #10111A;
  --surface-2:    #171825;
  --surface-3:    #1E1F2E;

  /* Borders */
  --border:       rgba(255, 255, 255, 0.07);
  --border-hover: rgba(255, 255, 255, 0.13);
  --border-active:rgba(126, 232, 162, 0.35);

  /* Text */
  --text:         #EEEEF5;
  --text-soft:    #A8ABBE;
  --muted:        #5F6B7A;

  /* Brand — jade green (growth, forward motion) */
  --brand:        #7EE8A2;
  --brand-dim:    rgba(126, 232, 162, 0.10);
  --brand-hover:  rgba(126, 232, 162, 0.18);

  /* Gold — achievements, goals, celebrations */
  --gold:         #FBBF24;
  --gold-dim:     rgba(251, 191, 36, 0.12);

  /* Blue — info, links, secondary actions */
  --blue:         #60A5FA;
  --blue-dim:     rgba(96, 165, 250, 0.12);

  /* Status colors */
  --success:      #4ADE80;
  --success-dim:  rgba(74, 222, 128, 0.12);
  --warning:      #FB923C;
  --warning-dim:  rgba(251, 146, 60, 0.12);
  --danger:       #F87171;
  --danger-dim:   rgba(248, 113, 113, 0.10);
  --purple:       #A78BFA;
  --purple-dim:   rgba(167, 139, 250, 0.12);

  /* Typography */
  --font-display: 'Bricolage Grotesque', system-ui, sans-serif;
  --font-body:    'DM Sans', system-ui, sans-serif;

  font-family: var(--font-body);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  min-height: 100vh;
  background: var(--bg);
  color: var(--text);
  font-family: var(--font-body);
}

h1, h2, h3, h4, h5, h6 {
  font-family: var(--font-display);
  margin: 0;
}

p { margin: 0; }

/* Scrollbar */
::-webkit-scrollbar { width: 5px; height: 5px; }
::-webkit-scrollbar-track { background: transparent; }
::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.08); border-radius: 99px; }
::-webkit-scrollbar-thumb:hover { background: rgba(255,255,255,0.14); }

/* Selection */
::selection { background: var(--brand-dim); color: var(--brand); }
```

**Step 2: Delete the old App.css**
```bash
rm src/App.css
```

**Step 3: Commit**
```bash
git add -A
git commit -m "feat: add design system tokens, Bricolage Grotesque + DM Sans fonts"
```

---

## PHASE 1 — Data Model & Types

### Task 3: Update types to new simplified stage system

**Files:**
- Create: `src/types/index.ts`

**Goal:** Replace the 19-stage system with 7 main stages + optional sub-states. Maintain backwards-compatibility with old localStorage data.

**Step 1: Create src/types/index.ts**

```typescript
// ─── Stage System ─────────────────────────────────────────────────────────────
// 7 main stages. Sub-states are optional and never replace the main stage
// for counting/funnel purposes — they only add detail within a stage.

export type MainStage =
  | 'Applied'       // Staging tier — all submissions land here
  | 'Screening'     // Recruiter/phone screen
  | 'Assessment'    // Take-home test, coding challenge, etc.
  | 'Interviewing'  // Any live interview round
  | 'Deciding'      // Waiting on final decision
  | 'Offer'         // Offer received
  | 'Closed'        // Rejected, withdrawn, ghosted

export type SubStage =
  // Assessment sub-states
  | 'Assessment Assigned'
  | 'Assessment In Progress'
  | 'Assessment Submitted'
  // Interview rounds
  | 'Round 1'
  | 'Round 2'
  | 'Round 3'
  | 'Round 4+'
  // Deciding sub-states
  | 'Waiting on Decision'
  | 'Company Interviewing Others'
  // Offer sub-states
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

// Legacy stage type for backwards compat when reading old localStorage data
export type LegacyStage =
  | 'Saved' | 'Application Submitted' | 'Follow-Up 1' | 'Follow-Up 2'
  | 'Recruiter Screen' | 'Scheduled 1st Interview' | 'Completed 1st Interview'
  | 'Scheduled 2nd Interview' | 'Completed 2nd Interview'
  | 'Scheduled 3rd Interview' | 'Completed 3rd Interview'
  | 'Scheduled 4th Interview' | 'Completed 4th Interview'
  | 'Waiting on response' | 'No response'
  | 'Offer made' | 'Offer accepted' | 'Offer declined' | 'Archived'

// ─── Application ──────────────────────────────────────────────────────────────
export type HistoryType = 'Applied' | 'Follow-up' | 'Interview' | 'Status' | 'Prep' | 'Archive' | 'Note' | 'Offer'

export type HistoryEntry = {
  id: number
  date: string
  label: string
  detail: string
  type: HistoryType
}

export type Application = {
  id: number
  company: string
  role: string
  source: string
  appliedOn: string
  followUpOn: string

  // New stage system
  stage: MainStage
  subStage?: SubStage

  priority: 'High' | 'Medium' | 'Low'
  desireRank: number       // 0 = unranked, 1–5
  fitScore: number         // 0–100, calculated from priorities

  // Pay
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
  prepNotes: string        // General prep notes (new)

  // Job details
  jobPostingUrl: string
  jobDescription: string
  resumeVersion: string
  coverLetterNote: string

  // Interview prep (structured)
  companyResearch: string
  prepQuestions: string
  talkingPoints: string

  // Notes
  notes: string
  quickAddNote: string     // Note captured at quick-add time

  // Offer
  offerAmount: string
  decisionNotes: string

  // Closed
  closedReason?: SubStage  // One of the 'Rejected — *' or 'Ghosted' etc sub-stages

  // Tracking
  sourceQueueId?: number
  autoAdded?: boolean
  huntSessionId?: string   // Which hunt session this belongs to

  history: HistoryEntry[]
}

// ─── Hunt Session ─────────────────────────────────────────────────────────────
export type HuntMode = 'active' | 'casual' | 'off'

export type HuntSession = {
  id: string               // UUID
  startedAt: string        // ISO date
  endedAt?: string         // ISO date — set when offer accepted
  mode: 'active' | 'casual'
  targetRole: string
  targetSalary: string
  weeklyGoal: number       // Applications per week
  status: 'active' | 'completed' | 'paused'
  // Ending data (populated when session ends)
  totalDays?: number
  totalApplied?: number
  offersAccepted?: number
  finalCompany?: string
}

// ─── Queue (Applied Tier) ─────────────────────────────────────────────────────
export type EmailType = 'acknowledgment' | 'interview' | 'assessment' | 'next_steps' | 'offer' | 'rejection'

export type QueuedApp = {
  id: number
  company: string
  role: string
  source: 'email' | 'manual' | 'linkedin' | 'indeed' | 'other'
  emailType: EmailType
  snippet: string
  receivedOn: string
  salary?: string
  note?: string            // Quick-add note (new)
  status: 'pending' | 'dismissed' | 'tracked'
  trackedAppId?: number
  huntSessionId?: string
}

// ─── Gorilla Mode Session ─────────────────────────────────────────────────────
export type GorillaModeSession = {
  id: string
  startedAt: string
  durationMinutes: number  // User's target duration
  appTarget: number        // User's target applications for this session
  appsSubmitted: number    // Actual count
  completedAt?: string
  hitTarget: boolean
}

// ─── User Settings ────────────────────────────────────────────────────────────
export type UserSettings = {
  fullName: string
  availabilityNote: string
  emailSignature: string
  // Onboarding priorities (top 3 in order)
  priorities: ('salary' | 'role_growth' | 'culture' | 'remote' | 'work_life' | 'prestige')[]
  targetSalaryGlobal: string
  onboardingComplete: boolean
}

// ─── Badge / Achievement ──────────────────────────────────────────────────────
export type BadgeId =
  // Application milestones
  | 'apps_25' | 'apps_100' | 'apps_250' | 'apps_500' | 'apps_1000'
  // Rejection badges (badge of honor)
  | 'rej_25' | 'rej_100' | 'rej_250' | 'rej_500'
  // Achievement
  | 'first_interview' | 'first_offer' | 'first_accepted'
  | 'weekly_goal_streak_3' | 'gorilla_mode_10'
  // Endurance
  | 'hunt_30_days' | 'hunt_60_days' | 'hunt_90_days'

export type EarnedBadge = {
  id: BadgeId
  earnedAt: string
  sessionId: string
}

// ─── Career Stats (cross-session totals) ────────────────────────────────────
export type CareerStats = {
  totalApplied: number
  totalInterviews: number
  totalOffers: number
  totalAccepted: number
  totalRejections: number
  huntsCompleted: number
  badgesEarned: EarnedBadge[]
}

// ─── Navigation ───────────────────────────────────────────────────────────────
export type View =
  | 'dashboard'
  | 'applied'       // Renamed from 'inbox' — the Applied staging tier
  | 'tracker'       // In Play pipeline
  | 'pipeline'      // Kanban view
  | 'interviews'
  | 'calendar'
  | 'stats'
  | 'rejections'
  | 'resume-vault'  // New
  | 'archive'
  | 'settings'

export type DetailTab = 'overview' | 'contact' | 'job' | 'prep' | 'offer' | 'email'

// ─── Storage Keys ─────────────────────────────────────────────────────────────
export const STORAGE_KEYS = {
  APPLICATIONS: 'prospect-applications',
  QUEUE:        'prospect-queue',
  HUNT_SESSION: 'prospect-hunt-session',
  CAREER_STATS: 'prospect-career-stats',
  SETTINGS:     'prospect-settings',
  BADGES:       'prospect-badges',
  GORILLA_SESSIONS: 'prospect-gorilla-sessions',
  // Legacy keys (read-only, for migration)
  LEGACY_APPS:  'nextround-applications',
  LEGACY_QUEUE: 'nextround-queue',
  LEGACY_GOAL:  'nextround-weekly-goal',
  LEGACY_SETTINGS: 'nextround-settings',
} as const
```

**Step 2: Commit**
```bash
git add src/types/index.ts
git commit -m "feat: add Prospect type system — 7-stage model, Hunt Sessions, Gorilla Mode, Badges"
```

---

### Task 4: Data utilities — stage migration + helpers

**Files:**
- Create: `src/utils/stages.ts`
- Create: `src/utils/storage.ts`
- Create: `src/utils/dates.ts`

**Step 1: Create src/utils/stages.ts**

```typescript
import type { MainStage, SubStage, LegacyStage } from '../types'

// Map legacy stages → new main stage
export const LEGACY_TO_MAIN: Record<LegacyStage, MainStage> = {
  'Saved':                    'Applied',
  'Application Submitted':    'Applied',
  'Follow-Up 1':              'Applied',
  'Follow-Up 2':              'Applied',
  'Recruiter Screen':         'Screening',
  'Scheduled 1st Interview':  'Interviewing',
  'Completed 1st Interview':  'Interviewing',
  'Scheduled 2nd Interview':  'Interviewing',
  'Completed 2nd Interview':  'Interviewing',
  'Scheduled 3rd Interview':  'Interviewing',
  'Completed 3rd Interview':  'Interviewing',
  'Scheduled 4th Interview':  'Interviewing',
  'Completed 4th Interview':  'Interviewing',
  'Waiting on response':      'Deciding',
  'No response':              'Closed',
  'Offer made':               'Offer',
  'Offer accepted':           'Offer',
  'Offer declined':           'Offer',
  'Archived':                 'Closed',
}

// Sub-states available per main stage
export const SUB_STAGES: Record<MainStage, SubStage[]> = {
  Applied:      [],
  Screening:    [],
  Assessment:   ['Assessment Assigned', 'Assessment In Progress', 'Assessment Submitted'],
  Interviewing: ['Round 1', 'Round 2', 'Round 3', 'Round 4+'],
  Deciding:     ['Waiting on Decision', 'Company Interviewing Others'],
  Offer:        ['Offer Received', 'Negotiating', 'Offer Accepted', 'Offer Declined'],
  Closed:       ['Rejected — Application', 'Rejected — After Screening', 'Rejected — After Round 1',
                 'Rejected — After Round 2', 'Rejected — Final Round', 'Rejected — Offer Stage',
                 'Ghosted', 'Withdrew', 'Role Filled', 'Salary Mismatch'],
}

// Stage display config
export const STAGE_CONFIG: Record<MainStage, { color: string; bg: string; label: string }> = {
  Applied:      { color: '#60A5FA', bg: 'rgba(96,165,250,0.12)',  label: 'Applied' },
  Screening:    { color: '#A78BFA', bg: 'rgba(167,139,250,0.12)', label: 'Screening' },
  Assessment:   { color: '#FBBF24', bg: 'rgba(251,191,36,0.12)',  label: 'Assessment' },
  Interviewing: { color: '#7EE8A2', bg: 'rgba(126,232,162,0.12)', label: 'Interviewing' },
  Deciding:     { color: '#FB923C', bg: 'rgba(251,146,60,0.12)',  label: 'Deciding' },
  Offer:        { color: '#4ADE80', bg: 'rgba(74,222,128,0.12)',  label: 'Offer' },
  Closed:       { color: '#5F6B7A', bg: 'rgba(95,107,122,0.12)', label: 'Closed' },
}

// Which stages count as "in play" (active pipeline, not Applied tier)
export const IN_PLAY_STAGES: MainStage[] = ['Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer']

// Which stages are terminal (no further action expected)
export const CLOSED_STAGES: MainStage[] = ['Closed']

// Stage ordering for funnel/pipeline display
export const STAGE_ORDER: MainStage[] = ['Applied', 'Screening', 'Assessment', 'Interviewing', 'Deciding', 'Offer', 'Closed']
```

**Step 2: Create src/utils/dates.ts**

```typescript
export function getTodayIso(): string {
  return new Date().toISOString().slice(0, 10)
}

export function formatDate(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}

export function formatDateTime(iso: string): string {
  if (!iso) return '—'
  const d = new Date(iso)
  return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) +
    ' at ' + d.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit' })
}

export function daysBetween(dateA: string, dateB: string): number {
  const a = new Date(dateA).getTime()
  const b = new Date(dateB).getTime()
  return Math.floor(Math.abs(b - a) / (1000 * 60 * 60 * 24))
}

export function daysAgo(iso: string): number {
  return daysBetween(iso, getTodayIso())
}

export function daysUntil(iso: string): number {
  const today = new Date(getTodayIso()).getTime()
  const target = new Date(iso).getTime()
  return Math.ceil((target - today) / (1000 * 60 * 60 * 24))
}

export function getWeekStart(): string {
  const d = new Date()
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1) // Monday
  const mon = new Date(d.setDate(diff))
  return mon.toISOString().slice(0, 10)
}
```

**Step 3: Create src/utils/storage.ts**

```typescript
import type { Application, QueuedApp, HuntSession, UserSettings, CareerStats, EarnedBadge } from '../types'
import { STORAGE_KEYS } from '../types'
import { LEGACY_TO_MAIN } from './stages'
import { getTodayIso } from './dates'

function safeGet<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch { return fallback }
}

function safeSet(key: string, value: unknown): void {
  try { localStorage.setItem(key, JSON.stringify(value)) } catch { /* quota */ }
}

// Migrate a single legacy application to the new type
function migrateLegacyApp(raw: Record<string, unknown>): Application {
  const legacyStage = raw.stage as string
  const mainStage = LEGACY_TO_MAIN[legacyStage as keyof typeof LEGACY_TO_MAIN] ?? 'Applied'

  return {
    id: raw.id as number,
    company: (raw.company as string) ?? '',
    role: (raw.role as string) ?? '',
    source: (raw.source as string) ?? '',
    appliedOn: (raw.appliedOn as string) ?? getTodayIso(),
    followUpOn: (raw.followUpOn as string) ?? '',
    stage: mainStage,
    subStage: undefined,
    priority: (raw.priority as Application['priority']) ?? 'Medium',
    desireRank: (raw.desireRank as number) ?? 0,
    fitScore: (raw.fitScore as number) ?? 0,
    salary: (raw.salary as string) ?? '',
    salaryTargeted: (raw.salaryTargeted as string) ?? '',
    workStyle: (raw.workStyle as string) ?? '',
    flagged: (raw.flagged as boolean) ?? false,
    recruiter: (raw.recruiter as string) ?? '',
    recruiterContact: (raw.recruiterContact as string) ?? '',
    interviewingManager: (raw.interviewingManager as string) ?? '',
    managerContact: (raw.managerContact as string) ?? '',
    interviewDate: (raw.interviewDate as string) ?? '',
    prepStatus: (raw.prepStatus as Application['prepStatus']) ?? 'Not started',
    prepNotes: '',
    jobPostingUrl: (raw.jobPostingUrl as string) ?? '',
    jobDescription: (raw.jobDescription as string) ?? '',
    resumeVersion: (raw.resumeVersion as string) ?? '',
    coverLetterNote: (raw.coverLetterNote as string) ?? '',
    companyResearch: (raw.companyResearch as string) ?? '',
    prepQuestions: (raw.prepQuestions as string) ?? '',
    talkingPoints: (raw.talkingPoints as string) ?? '',
    notes: (raw.notes as string) ?? '',
    quickAddNote: '',
    offerAmount: (raw.offerAmount as string) ?? '',
    decisionNotes: (raw.decisionNotes as string) ?? '',
    huntSessionId: undefined,
    history: (raw.history as Application['history']) ?? [],
  }
}

export function loadApplications(): Application[] {
  // Try new key first
  const newData = safeGet<Application[]>(STORAGE_KEYS.APPLICATIONS, [])
  if (newData.length > 0) return newData

  // Fall back to legacy key + migrate
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

export function loadQueue(): QueuedApp[] {
  const newData = safeGet<QueuedApp[]>(STORAGE_KEYS.QUEUE, [])
  if (newData.length > 0) return newData

  // Migrate legacy queue
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

export function loadHuntSession(): HuntSession | null {
  return safeGet<HuntSession | null>(STORAGE_KEYS.HUNT_SESSION, null)
}

export function saveHuntSession(session: HuntSession | null): void {
  safeSet(STORAGE_KEYS.HUNT_SESSION, session)
}

export function loadSettings(): UserSettings {
  const defaults: UserSettings = {
    fullName: '', availabilityNote: '', emailSignature: '',
    priorities: ['salary', 'role_growth', 'remote'],
    targetSalaryGlobal: '', onboardingComplete: false,
  }
  // Try new key
  const newData = safeGet<Partial<UserSettings>>(STORAGE_KEYS.SETTINGS, {})
  if (Object.keys(newData).length > 0) return { ...defaults, ...newData }

  // Migrate legacy settings
  const legacy = safeGet<Partial<UserSettings>>(STORAGE_KEYS.LEGACY_SETTINGS, {})
  return { ...defaults, ...legacy }
}

export function saveSettings(settings: UserSettings): void {
  safeSet(STORAGE_KEYS.SETTINGS, settings)
}

export function loadCareerStats(): CareerStats {
  return safeGet<CareerStats>(STORAGE_KEYS.CAREER_STATS, {
    totalApplied: 0, totalInterviews: 0, totalOffers: 0,
    totalAccepted: 0, totalRejections: 0, huntsCompleted: 0, badgesEarned: [],
  })
}

export function saveCareerStats(stats: CareerStats): void {
  safeSet(STORAGE_KEYS.CAREER_STATS, stats)
}
```

**Step 4: Commit**
```bash
git add src/utils/
git commit -m "feat: add stage migration utils, storage helpers, date utilities"
```

---

## PHASE 2 — Layout Shell

### Task 5: App shell — sidebar navigation + layout

**Files:**
- Create: `src/components/layout/Sidebar.tsx`
- Create: `src/components/layout/AppShell.tsx`
- Modify: `src/App.tsx` (strip to skeleton, will be rebuilt incrementally)

**Step 1: Create src/components/layout/Sidebar.tsx**

Full sidebar with:
- Prospect logo + wordmark at top
- Hunt Session status indicator (active hunt banner with day counter)
- Nav links grouped: Main (Dashboard, Applied, Tracker, Pipeline) and Tools (Interviews, Calendar, Stats, Rejections, Resume Vault, Archive)
- Gorilla Mode button (glowing when session active)
- Settings link at bottom
- Active state: brand-colored left border + bg highlight
- Animated with Framer Motion (stagger on mount)

Key design notes:
- Width: 240px
- Background: `var(--surface)` with right border `var(--border)`
- Logo: "Prospect" in Bricolage Grotesque, brand color dot
- Nav items: 40px tall, 12px horizontal padding, 8px border-radius
- Active item: `var(--brand-dim)` background, `var(--brand)` left border 2px, `var(--brand)` text
- Hunt banner: small card showing "Day 14 · Active Hunt" in gold
- Gorilla Mode CTA: subtle glowing button at bottom of nav section

**Step 2: Create src/components/layout/AppShell.tsx**

```tsx
// Grid layout: sidebar (240px) + main content (1fr)
// Main content area has its own scroll, sidebar is sticky
// Passes currentView and setView down via props
```

**Step 3: Strip App.tsx to skeleton**

Temporarily replace App.tsx content with a minimal shell that:
- Loads data from storage utils
- Renders AppShell with a placeholder for each view
- Verifies the sidebar renders correctly

**Step 4: Verify in browser**
```bash
npm run dev
```
Expected: Sidebar visible, navigation links present, brand colors correct, fonts loading

**Step 5: Commit**
```bash
git add src/components/ src/App.tsx
git commit -m "feat: add AppShell + Sidebar with Prospect branding, hunt session banner, nav groups"
```

---

## PHASE 3 — Dashboard (Command Center)

### Task 6: Dashboard — Command Center view

**Files:**
- Create: `src/components/dashboard/Dashboard.tsx`
- Create: `src/components/dashboard/HuntHeader.tsx`
- Create: `src/components/dashboard/TodaysFocus.tsx`
- Create: `src/components/dashboard/PipelineGlance.tsx`
- Create: `src/components/dashboard/WeeklyGoalCard.tsx`
- Create: `src/components/dashboard/UpcomingInterviews.tsx`
- Create: `src/components/dashboard/AlertsFeed.tsx`
- Create: `src/components/dashboard/ResponseRate.tsx`
- Create: `src/components/dashboard/NudgeCard.tsx`

**Dashboard layout (grid):**
```
[ HuntHeader — full width                          ]
[ TodaysFocus (2/3) ]  [ WeeklyGoalCard (1/3)      ]
[ PipelineGlance — full width                      ]
[ UpcomingInterviews (1/2) ] [ AlertsFeed (1/2)    ]
[ ResponseRate (1/2) ]       [ NudgeCard (1/2)     ]
```

**HuntHeader component:**
- Shows: "Day {N} of your {mode} hunt" | "Week {N}"
- Progress bar toward weekly application goal (gold color)
- Session start date, target role, target salary
- "End Hunt" button (opens confirmation modal)
- If no active hunt: "Start a New Hunt" CTA prominently displayed

**TodaysFocus component:**
- Smart list of 2–4 action items generated from data:
  - Interviews today or tomorrow → "Interview at [Company] tomorrow — prep tab is {status}"
  - Follow-ups overdue → "[Company] follow-up is {N} days overdue"
  - Unreviewed new additions → "{N} new jobs added to Applied since your last visit"
  - No prep done for upcoming interview → "You haven't prepped for [Company] yet"
- Each item is clickable → navigates to the relevant application

**WeeklyGoalCard component:**
- Current week progress: "{N} of {goal} applications"
- Circular or bar progress indicator in gold
- Small streak indicator: "3-week streak!" if they've hit goal 3 weeks running
- Celebrate animation (Framer Motion) when goal is hit

**PipelineGlance component:**
- Horizontal strip showing counts per stage
- Applied (N) → Screening (N) → Assessment (N) → Interviewing (N) → Deciding (N) → Offer (N)
- Each stage chip is clickable → navigates to tracker filtered to that stage
- Visual flow with arrows between stages

**UpcomingInterviews component:**
- Next 5 interviews sorted by date
- Shows: company, role, date/time, prep status badge
- Color-coded by how soon (green = 3+ days, amber = 1–2 days, red = today)
- Click → opens application detail to prep tab

**AlertsFeed component:**
- New jobs auto-added since last visit
- Next-step emails received
- Follow-ups overdue (7+ days)
- Each alert is dismissible

**ResponseRate component:**
- Your response rate: Applied → Next Steps (not counting acknowledgments)
- National average comparison: "National avg: ~5–8%"
- Framing: If below avg → "Let's work on that resume." If above → "Above average. Keep going."
- Small trend line (Recharts) showing rate over last 4 weeks

**NudgeCard component:**
- Single rotating nudge from the nudge engine
- Warm, friendly tone: "Your best friend who wants you to get the job"
- Examples: "You haven't applied in 3 days. 15 minutes. Go." | "Interview at Salesforce tomorrow. You've got this." | "30 days in. Most people quit. You didn't."

**Step 5: Commit**
```bash
git add src/components/dashboard/
git commit -m "feat: add Command Center dashboard — hunt header, focus list, pipeline glance, goals, alerts, nudge"
```

---

## PHASE 4 — Applied Tier (Staging Area)

### Task 7: Applied view — all submitted applications

**Files:**
- Create: `src/components/applied/AppliedView.tsx`
- Create: `src/components/applied/AppliedCard.tsx`
- Create: `src/components/applied/QuickAddModal.tsx`

**Design:**
- Clean table/card hybrid
- Header: "Applied" title + count badge + "Quick Add" button
- Search/filter bar
- Each row: company logo placeholder, company name, role, date applied, source badge, salary, status pill
- Status pill = "Application Submitted" by default, changes to "Promoted" when moved to In Play
- Hover → reveals action buttons: "Promote to In Play", "View Details", "Dismiss"
- Bulk promote option (select multiple, promote all)
- Running counter: "Total applications this hunt: {N}"

**QuickAddModal:**
- Fields: Company, Role, Source (dropdown), Salary (optional), Date Applied (defaults to today), Note (new — textarea)
- Keyboard-friendly: Tab between fields, Enter to submit
- Instant feedback: toast notification on add

**Step 6: Commit**
```bash
git add src/components/applied/
git commit -m "feat: add Applied tier — staging view with quick add modal, promote to In Play flow"
```

---

## PHASE 5 — In Play Tracker

### Task 8: Tracker — active pipeline

**Files:**
- Create: `src/components/tracker/TrackerView.tsx`
- Create: `src/components/tracker/TrackerRow.tsx`
- Create: `src/components/tracker/StageSelector.tsx`
- Create: `src/components/tracker/ApplicationDetail.tsx`
- Create: `src/components/tracker/DetailTabs.tsx`

**TrackerView:**
- Full sortable table: Company, Role, Stage, Sub-Stage, Pay, Desire, Follow-up, Priority
- Sort by any column (click header)
- Filter bar: search text + stage filter chips
- Each row shows pay from job listing (was missing before — bug fix)
- Row click → opens ApplicationDetail slide-in panel

**StageSelector:**
- Inline stage change: click current stage pill → dropdown appears with 7 options
- If selected stage has sub-states → second row of sub-state options appears
- Smooth animation (Framer Motion height animation)
- Never more than 2 clicks to change any stage
- Auto-closes after selection

**ApplicationDetail:**
- Slide-in panel from right (Framer Motion)
- 6 tabs: Overview, Contact, Job, Prep, Offer, Email
- Prep tab now has "General Notes" textarea at the top (new)
- All tabs use clean form inputs with auto-save on blur

**Step 7: Commit**
```bash
git add src/components/tracker/
git commit -m "feat: add In Play tracker — sortable table, inline stage selector, detail panel with 6 tabs"
```

---

## PHASE 6 — Supporting Views

### Task 9: Stats view + rejection center redesign

**Files:**
- Create: `src/components/stats/StatsView.tsx`
- Create: `src/components/stats/FunnelChart.tsx`
- Create: `src/components/rejections/RejectionsView.tsx`

**StatsView additions:**
- Session selector: "Current Hunt" vs past sessions
- 4 key conversion metrics (Applied→Response, Applied→Interview, Interview→Offer, Offer→Accepted)
- Response rate vs national average comparison
- All charts using Recharts with brand color palette

**Step 8: Commit**
```bash
git add src/components/stats/ src/components/rejections/
git commit -m "feat: redesign stats view + rejection center with session-based filtering"
```

---

### Task 10: Gorilla Mode + Hunt Session activation

**Files:**
- Create: `src/components/hunt/HuntActivationModal.tsx`
- Create: `src/components/hunt/GorillaModeModal.tsx`
- Create: `src/components/hunt/BadgesPanel.tsx`

**HuntActivationModal:**
- 3-step flow: Step 1 = mode selection (Actively / Casually), Step 2 = goals (weekly app goal, target salary, target role), Step 3 = motivational launch screen
- Launch screen: personalized message + confetti animation
- Saves HuntSession to localStorage

**GorillaModeModal:**
- Set duration (25, 45, 60 min or custom)
- Set application target (10, 20, custom)
- Countdown timer displayed while active (shown in sidebar banner)
- End screen: "You submitted {N} applications in {time}. {result message}"

**BadgesPanel:**
- Grid of all badges (earned = full color, unearned = muted/locked)
- Earned badges show date earned
- Career totals at top: total apps, total interviews, total offers, total accepted

**Step 9: Commit**
```bash
git add src/components/hunt/
git commit -m "feat: add Hunt Activation modal, Gorilla Mode timer, Badges panel"
```

---

### Task 11: Resume Vault

**Files:**
- Create: `src/components/resume/ResumeVaultView.tsx`

**Features:**
- Upload resume versions (stored as base64 in localStorage until Supabase is added)
- Name + version tag each resume
- Tag which resume was used per application (from the Job tab in detail panel)
- Stats: response rate per resume version (only counts tagged applications)

**Step 10: Commit**
```bash
git add src/components/resume/
git commit -m "feat: add Resume Vault — version management, per-application tagging"
```

---

### Task 12: Nudge Engine

**Files:**
- Create: `src/utils/nudges.ts`

**Step 1: Create the nudge generator**

```typescript
// Generates context-aware nudges from application data
// Returns a NudgeMessage with text, type, and optional action

export type NudgeType = 'followup' | 'prep' | 'goal' | 'milestone' | 'encouragement'

export type NudgeMessage = {
  id: string
  type: NudgeType
  message: string
  actionLabel?: string
  actionTarget?: { view: string; appId?: number }
  priority: 1 | 2 | 3  // 1 = urgent, 3 = ambient
}

// Nudge messages by type — consistent voice, warm + accountable
const NUDGE_COPY: Record<NudgeType, string[]> = {
  followup: [
    "{company} has been quiet for {days} days. A quick follow-up takes 2 minutes.",
    "You applied to {company} {days} days ago. They haven't forgotten you — make sure they haven't.",
  ],
  prep: [
    "Interview at {company} is {days_away}. Your prep tab is empty. Let's fix that.",
    "You've got {company} coming up. What do you know about them? {prep_status}",
  ],
  goal: [
    "You're {remaining} applications from your weekly goal. You've got this.",
    "{applied} applications this week. Goal is {goal}. {remaining} to go — lock in.",
  ],
  milestone: [
    "First interview locked in. That's momentum. Keep going.",
    "{count} applications in. Every one gets you closer.",
  ],
  encouragement: [
    "{days} days in. Most people quit by now. You haven't.",
    "Job hunting is a numbers game, and you're playing it. Keep stacking.",
    "This week's response rate: {rate}%. The average is 5–8%. You're {comparison}.",
  ],
}
```

**Step 2: Commit**
```bash
git add src/utils/nudges.ts
git commit -m "feat: add Nudge Engine — context-aware, consistent voice, warm + accountable tone"
```

---

## PHASE 7 — Bug Fixes

### Task 13: Fix dashboard not reflecting tracker additions

**Root cause:** Dashboard was computing metrics from a snapshot that wasn't re-derived after tracker updates. Fix: ensure all dashboard metrics are computed via useMemo from the same applications state.

**Files:**
- Modify: `src/App.tsx` (or the state management hook once refactored)

**Step 1:** Verify the bug — add an application in tracker, check if dashboard count updates.
**Step 2:** Ensure applications state is lifted to App.tsx root and passed down as props.
**Step 3:** All derived values (counts per stage, weekly goal progress, etc.) computed from the same state reference.

---

## PHASE 8 — Polish & Memory Update

### Task 14: Final polish

- Verify all views render without errors
- Test localStorage migration from old nextround data
- Verify fonts load (Bricolage Grotesque + DM Sans)
- Check all stage transitions work (7-stage + sub-stages)
- Verify hunt session activation/deactivation flow
- Test Gorilla Mode timer
- Check responsive layout at 1280px+ (primary target width)
- `npm run build` — should complete without errors

### Task 15: Update all project memory files

**Files to update:**
- `CLAUDE.md` — update branch, stack, status
- `.ai/project/SESSION_HANDOFF.md`
- `.ai/project/FEATURES.md`
- `.ai/project/PROJECT_PLAN.md`
- `~/.claude/CLAUDE.md` — update global NextRound entry to "Prospect"

---

## Build Priority Order

1. **Phase 0** — Setup (must do first, unblocks everything)
2. **Phase 1** — Types + utils (foundation for all components)
3. **Phase 2** — Layout shell (required to see anything)
4. **Phase 3** — Dashboard (this is the hero screen — nail it)
5. **Phase 4** — Applied tier
6. **Phase 5** — Tracker + detail panel
7. **Phase 6** — Supporting views (stats, gorilla mode, badges)
8. **Phase 7** — Bug fixes
9. **Phase 8** — Polish + memory update

---

## What's Deferred to Later Phases

These are captured in the backlog — don't build them now:

- AI companion / brainstorm buddy
- n8n + Gmail OAuth email automation
- Auto-email responses
- Auto-scheduling / calendar integration
- Cover letter generator
- Onboarding flow (guided tour)
- Supabase file storage for resumes
- Scheduling conflict detection
- Job quality fit score (needs onboarding + AI)
- Browser extension

---

*Plan authored: 2026-04-12 | Branch: prospect/redesign*
