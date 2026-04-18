# Prospect — Features

## Status Key
- ✅ Built & working
- 🔧 Built but needs improvement
- 📋 Planned / prioritized (has a phase in master plan)
- 💡 Ideas backlog
- 🚀 Future / requires backend

---

## Core Screens

### Dashboard (Command Center)
- ✅ Hero stat row: Total Applied, In Play, Response Rate, Interviews — count-up animated
- ✅ AnimatedCount — video game feel, numbers climb when they increase
- ✅ Today's Calendar Snapshot — today's interviews + follow-ups as clickable pills
- ✅ Upcoming interviews with Prep Room shortcut button per row
- ✅ Pipeline glance with per-stage animated counters
- ✅ All cards clickable → navigate to relevant view
- 📋 Next-step rate widget ("X% of your apps got a response")
- 📋 Interview countdown widget (48hr warning with prep nudge)
- 📋 Stale app nudge ("3 apps haven't moved in 14+ days")
- 📋 Today's Focus: shows tasks due today + today's interviews + stalling app reminders

### Active (In Play / Tracker) — Phase 3F
- ✅ Sortable table — company, stage, priority, follow-up, desire rank, applied date
- ✅ Inline stage selector with DropdownPortal (escapes overflow:hidden clipping)
- ✅ Quick Add (defaults to Screening stage)
- ✅ Priority badges (High/Medium/Low)
- 📋 **Rename "In Play" → "Active"** (nav: Active, heading: Active Applications)
- 📋 Health indicator dots (green/yellow/red/blue/purple per activity/stage)
- 📋 Days in stage column
- 📋 Last activity column
- 📋 Next action column (linked task — shows date + overdue warning)
- 📋 Summary bar: total active + per-stage counts, all clickable to filter
- 📋 Filter system: by stage, priority, health, source, next action date
- 📋 Sort: days in stage (default), next action date, priority, desire rank
- 📋 Hover quick actions: change stage, add next action, open prep, close out
- 📋 Bulk actions: change stage, set priority, close out multiple

### Applied (Inbox / Triage) — Phase 10
- ✅ Pending queue + submitted apps + quick add
- ✅ "Track this →" to move to tracker
- 📋 **3-bucket redesign:** Applied (thank-you stats) / Next Steps (interested emails) / Rejections (pre-interview)
- 📋 Next Steps bucket: contact pulled from email, user moves to In Play intentionally
- 📋 Pre-integration: manual add buttons for each bucket
- 📋 Separate counters per bucket (no double counting)

### Pipeline — Phase 3G
- ✅ Kanban board by stage with stage count chips and scroll gradient
- 📋 **Drag-and-drop between columns** (Framer Motion drag API)
- 📋 Auto-label on drop: Interviewing → "Round 1", Offer → prompt for offer amount
- 📋 Column headers show app count
- 📋 Cards show: health dot, days in stage, next action date
- 📋 Edit still done in detail panel — drag only changes stage

### Interview Schedule
- ✅ Table of all apps with scheduled interview dates
- ✅ Shows company, role, date/time, prep status, stage, countdown

### Prep Room
- ✅ Full-screen two-column interview workspace
- ✅ 4 tabs: General Notes, Questions, Talking Points, Response Library
- ✅ Auto-save with debounce + "Saving..." indicator
- ✅ Response Library: shared across all apps, saved to localStorage
- ✅ Common prompt starters + expandable response cards
- ✅ Accessible from Dashboard upcoming interviews shortcut

### Full Interview Prep Page — Phase 9
- 📋 Own nav item under Main
- 📋 Lists all apps in Interviewing stage
- 📋 Select app → full-screen prep workspace
- 📋 "Create Prep" button stub (AI fills it in Phase 15)

### Calendar View
- ✅ Monthly calendar grid (Sun–Sat, prev/next navigation, Today button)
- ✅ Interview dates (jade) + follow-up dates (gold) from existing app data
- ✅ Click event → opens app detail
- ✅ "Google Calendar integration coming soon" badge
- 🚀 Calendar sync: write interviews to Google Calendar (Phase 14)

### Stats & Reporting — Phase 8 + 16
- ✅ Overview chips, funnel chart, rejection breakdown, source breakdown
- 📋 Session-based filtering (current hunt vs all-time)
- 📋 Next-step rate widget on Dashboard
- 📋 Source effectiveness (which platform converts best)
- 📋 Rejection breakdown: pre-interview vs post-interview
- 📋 Time-in-stage distribution
- 📋 **Generate Report** (Phase 16): Claude analyzes all data → personalized written report
  - Where You Stand, Where You're Dropping Off, What's Working, Recommendations, This Week's Priority
- 📋 Full analytics dashboard with funnel visualization and drop-off heatmap

### Rejection Center
- ✅ Summary chips, filter tabs, grouped by stage, near-miss highlighting
- ✅ Red badge count on sidebar nav

### Archive — Phase 3B (close-out system)
- ✅ Table of all closed apps
- 📋 **Close-Out modal** — Rejection path (pre-interview / by round / ghosted) + Withdrew path (reasons)
- 📋 Auto-archive after 90 days of no movement
- 📋 Archive entry: company, role, stage reached, date closed, reason, desire rank, salary, contact snapshot

### Contacts Section — Phase 4
- ✅ Contact fields exist on each app (recruiter + manager fields)
- 📋 **Contact tab redesign**: Add Contact button → modal (name, title, email, phone x2 with type, notes)
- 📋 **Standalone Contacts section** (own nav item under Tools)
- 📋 Auto-created when app moves to In Play
- 📋 Contact age display ("Added 47 days ago")
- 📋 Search by name, company, role
- 📋 Contact survives after app is archived
- 📋 Option to unlink contact from job

### Tasks — Phase 5
- 📋 **Own nav item** under Tools
- 📋 Two types: General task + App-linked task (next action)
- 📋 Task fields: title, due date, linked app, done/not done
- 📋 Next action on an app = creates a task automatically
- 📋 Dashboard Today's Focus: due today + overdue tasks + today's interviews + stalling apps
- 📋 App detail: shows app-linked tasks inline

### Resume Vault — Phase 12
- ✅ Placeholder screen exists
- 🚀 Upload PDF/DOCX (Supabase Storage)
- 🚀 Version tracking (which resume used per app)
- 🚀 Response rate by resume version
- 🚀 Feeds AI Interview Prep (Phase 15)

### Settings
- ✅ Full name, target salary, availability, email signature
- 📋 Industry default (for new apps)
- 📋 Role category default

---

## Application Detail Panel (tabs)

### Overview tab
- ✅ Stage history log (every change timestamped)
- ✅ Quick-edit: stage, priority, desire rank, follow-up date, work style
- ✅ Notes field
- ✅ Applied date, source

### Contact tab — Phase 3C
- ✅ Recruiter name + contact (current open fields)
- 📋 **Add Contact button** → modal (name, title, email, phone x2 + type, notes)
- 📋 Multiple contacts per app supported
- 📋 Syncs to standalone Contacts section (Phase 4)

### Job tab
- ✅ Listed pay range, target pay, job description, resume version, cover letter notes
- 📋 **Industry category** (Tech / Healthcare / Finance / Sales / Operations / Other)
- 📋 **Role category** (broad type)
- 📋 **Cover letter included** (boolean)

### Interview tab (was "Prep")
- ✅ Interview date + status first, then prep notes
- ✅ Prep status selector, company research, questions, talking points

### Offer tab
- ✅ Offer amount, decision notes, accept/decline

### Email tab
- ✅ 5 templates (follow-up, thank-you, availability, confirm, withdraw)
- ✅ Copy to clipboard, open in email client
- 🚀 Send directly once Gmail integrated (Phase 13)

---

## Quick Add Modal — Phase 3D
- ✅ Company, role, source, pay, date, note, stage selector
- 📋 **When Interviewing selected**: show interview date + interviewer name + interviewer email

---

## Stage System — Phase 3E
- ✅ 7 main stages: Applied, Screening, Assessment, Interviewing, Deciding, Offer, Closed
- ✅ Sub-stages per stage
- ✅ Two-line compact stage pill (stage + sub-stage)
- 🔧 **Stage selector bug**: closes too early — needs to stay open for sub-stage selection (Phase 3A)
- 📋 **New sub-stages**: Waiting on Response, Waiting on Decision, Negotiating Offer, Considering Offer, Declined Offer
- 📋 Declined Offer → triggers auto-close modal → archived

---

## Sidebar & Navigation
- ✅ Brand logo, hunt session banner, nav groups
- ✅ Big "X apps sent" counter + animated weekly goal progress bar
- ✅ Lock In button (jade green, renamed from Gorilla Mode)
- 📋 Lock In timer: active countdown shown in sidebar (Phase 6)
- 📋 Add Contacts nav item (Phase 4)
- 📋 Add Tasks nav item (Phase 5)
- 📋 Add Full Interview Prep nav item (Phase 9)
- 📋 Rename "In Play" → "Active" (Phase 3F)

---

## Lock In — Phase 6
- ✅ Button wired (jade green, state-aware)
- 📋 Timer modal: set target (# apps) + duration (30/45/60/90 min)
- 📋 Sidebar shows countdown when active
- 📋 End screen: animated summary (apps sent vs goal)
- 📋 Unlocks badges

---

## Badge System — Phase 7
- 📋 Volume badges (25/100/250/500/1000 apps)
- 📋 Rejection badges — badge of honor (25/100/250/500)
- 📋 Progress badges (first interview, first offer, first accepted)
- 📋 Consistency badges (3-week streak, 10 Lock In sessions)
- 📋 Endurance badges (30/60/90 day hunt)
- 📋 Toast notification when earned
- 📋 Badge display panel

---

## Onboarding — Phase 11
- 📋 First-time experience (triggers when onboardingComplete === false)
- 📋 Profile setup → start hunt session → quick tour → ready

---

## Backend & Integrations (future)
- 🚀 Supabase backend (Phase 12+)
- 🚀 Gmail + n8n email automation (Phase 13)
- 🚀 Google Calendar write (Phase 14)
- 🚀 Claude API: AI Interview Prep (Phase 15)
- 🚀 Claude API: Analytics Generate Report (Phase 16)
- 🚀 Claude API: Job Buddy AI Companion (Phase 17)

---

## Analytics Data Points — Capture Now for Phase 16
These fields should be added to apps now so data exists when analytics is built:
- `industry` — Tech / Healthcare / Finance / Sales / Operations / Other
- `roleCategory` — broad role type
- `coverLetterIncluded` — boolean
- `resumeVersionId` — text for now, links to Resume Vault later
- `history[]` — already capturing all stage transitions with timestamps ✅
