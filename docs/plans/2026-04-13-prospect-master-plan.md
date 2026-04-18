# Prospect — Master Feature Plan

> **Status as of 2026-04-17 (Session 4 — planning complete)**
> App is live on branch `prospect/redesign` at `http://localhost:5173/`
> Run with: `cd ~/Desktop/dev/NextRound && npm run dev`
> **Next build: Phase 3A (stage selector bug fix) → 3B → 3C → 3D → 3E → 3F (Active upgrade) → 3G (drag-and-drop Pipeline)**

---

## Vision

**"Your successful best friend helping you get hired faster."**

Prospect is a premium job hunting operating system and analytics platform. Not a spreadsheet. Not a boring tracker. A command center that makes the job hunt feel satisfying, surfaces exactly where you're losing, and tells you what to fix.

**The three layers:**
1. **Organization** — Stay on top of every active application. Nothing falls through the cracks.
2. **Analytics** — See where you're dropping off in the funnel. Know if it's a resume problem, an interview problem, or a targeting problem. The data tells you — you don't have to guess.
3. **Intelligence** — (future) The Job Buddy AI analyzes your data and gives you specific, personalized recommendations. Not generic tips. Your numbers, your patterns, your fix.

**What makes this different:** Most job trackers are just databases. Prospect captures the right data at every stage so it can tell you something useful about your job hunt. A CRM without analytics is just storage. Prospect shows you the funnel, the drop-offs, the patterns — and eventually tells you exactly what to do about them.

**Design:** Premium fintech aesthetic — dark, focused, warm, human. Feels like a tool built for serious people, not a school project.

---

## Design System (locked)

| Token | Value | Usage |
|---|---|---|
| Background | `#08090D` | App background |
| Surface | `#10111A` | Cards, panels |
| Surface 2 | `#171825` | Inputs, nested cards |
| Brand (jade) | `#7EE8A2` | Primary actions, goals, progress |
| Gold | `#FBBF24` | Achievements, weekly goal |
| Blue | `#60A5FA` | Info, links |
| Danger | `#F87171` | Rejections, alerts |
| Warning | `#FB923C` | Overdue, caution |
| Display font | Bricolage Grotesque | All headings |
| Body font | DM Sans | All body text |

---

## Stage System (updated)

**7 main stages:**
1. **Applied** — staging tier. All submissions land here.
2. **Screening** — recruiter or phone screen
3. **Assessment** — take-home, coding challenge, work sample
4. **Interviewing** — any live interview round
5. **Deciding** — offer/decision phase (see sub-stages below)
6. **Offer** — offer received
7. **Closed** — rejected, ghosted, withdrew

**Sub-stages for Deciding/Offer phase:**
- Waiting on Response — universal "I'm waiting to hear back" (works between any phases)
- Waiting on Decision — company is making their call
- Negotiating Offer — offer received, actively negotiating terms
- Considering Offer — user has offer and is thinking about it
- Declined Offer — user turned down offer → triggers auto-archive with tracking

**Two-tier pipeline:**
- Applied = staging area (everything you've sent out)
- In Play = Screening → Offer (active pipeline)

---

## Hunt Session Model (locked)

Every job search is a "Hunt Session." Sessions track:
- Mode: Active (serious) vs Casual (passive)
- Target role + target salary + industry category
- Weekly application goal
- Day counter (how long you've been at it)
- All stats belong to the session

One session at a time. When you land a job, close the session and celebrate.

---

## ✅ Phase 1 — Foundation (COMPLETE)

- [x] Project renamed to Prospect
- [x] Full design system (CSS tokens, fonts, noise texture, glow effects)
- [x] New 7-stage model + sub-states
- [x] Full TypeScript type system (`src/types/index.ts`)
- [x] Stage utilities + colors (`src/utils/stages.ts`)
- [x] Date utilities (`src/utils/dates.ts`)
- [x] localStorage utils with legacy data migration (`src/utils/storage.ts`)

---

## ✅ Phase 2 — Core Screens (COMPLETE)

- [x] Sidebar: brand logo, hunt session banner, nav groups, Lock In button, Settings link
- [x] Sidebar: big "X apps sent" counter + animated weekly goal progress bar
- [x] Dashboard: full premium rebuild with count-up animations (video game feel)
  - [x] Hero stat row: Total Applied, In Play, Response Rate, Interviews (all animated, all clickable)
  - [x] Today's Calendar Snapshot (today's interviews + follow-ups as clickable pills)
  - [x] Upcoming interviews with Prep Room shortcut button
  - [x] Pipeline glance with per-stage animated counters
- [x] Hunt Activation Modal (3-step: mode, goals, launch)
- [x] Applied View (staging tier): pending queue + all submitted + quick add
- [x] In Play Tracker (sortable table, inline stage selector, priority badges, pay visible)
- [x] Quick Add Modal (company, role, source, pay, date, note, stage selector)
- [x] Quick Add from In Play tab (defaults to Screening stage)
- [x] Pipeline View (Kanban by stage, stage count chips, scroll gradient)
- [x] Stats View (metrics, funnel, conversion rates, rejection breakdown)
- [x] Rejection Center (filter tabs, near-miss highlighting)
- [x] Interview Schedule (upcoming/past, prep status, countdown)
- [x] Archive View (searchable table of all closed apps)
- [x] Settings View (name, target salary, availability, email signature)
- [x] Application Detail Panel (6 tabs: overview, contact, job, interview, offer, email)
- [x] "Prep" tab renamed to "Interview" — date + status first, then prep notes
- [x] Email Composer with 5 templates
- [x] Stage selector portal fix (DropdownPortal — escapes overflow:hidden)
- [x] Sub-stage compact two-line pill display
- [x] Calendar View: monthly grid, interview + follow-up events, click to open app
- [x] Prep Room: full-screen two-column interview workspace, 4 tabs, response library, auto-save
- [x] Lock In: renamed from Gorilla Mode, brand jade green, ready for timer modal

---

## 🔲 Phase 3 — Core Refinements (BUILD NEXT — no backend required)

These are all frontend-only changes to existing screens. Build and fully test each sub-phase before moving to the next. User plays with each addition before proceeding.

### 3A — Stage Selector Bug Fix (DO FIRST)

**What it is:** When you pick a main stage in the stage selector, the dropdown closes immediately — you can't select a sub-stage without reopening it. Fix: selecting a main stage should keep the dropdown open if that stage has sub-stages, showing sub-stage options inline. Two deliberate clicks (stage → sub-stage) then it closes. If no sub-stages, closes immediately on main stage pick.

**Files to modify:**
- `src/App.tsx` — update StageSelector component close behavior

### 3B — Close-Out System

**What it is:** Every app gets a Close Out button. When clicked, user picks Rejection or Withdrew, selects reason, then the app moves to Archive.

**Rejection reasons:**
- Pre-interview rejection (email rejection before any contact)
- Recruiter Screen
- Assessment
- First Round
- Second Round
- Final Round
- Ghosted (no response 30+ days)
- Auto-populates current stage — user can override with dropdown

**Withdrew reasons:**
- Compensation too low
- Accepted another offer
- Declined an offer (got offer, said no) — tracked separately
- No longer interested — role fit
- No longer interested — company fit
- Personal reasons
- Other (free text)

**Archive entry keeps:** company, role, stage reached, date applied, date closed, reason, desire rank, salary range, contact snapshot

**Auto-archive rule:** Any app with zero stage movement for 90 days auto-archives with reason "Inactive — Auto Archived." Clock resets on any stage change.

**Files to modify:**
- `src/App.tsx` — add CloseOutModal component, add auto-archive logic
- `src/types/index.ts` — add CloseOutReason type
- `src/utils/storage.ts` — update archive key

### 3C — Contact Tab Redesign

**What it is:** Replace the open form fields on the Contact tab with an Add Contact button. Cleaner, supports multiple contacts per app.

**Add Contact modal fields:**
- Name
- Title / Position
- Email
- Phone 1 + type (Cell / Work / Home)
- Phone 2 + type (Cell / Work / Home)
- Notes

Multiple contacts can be added per app. No limit.
Contact info in the app tab syncs with the Contacts section (Phase 4).

**Files to modify:**
- `src/App.tsx` — redesign Contact tab in DetailPanel
- `src/types/index.ts` — add AppContact type

### 3D — Quick Add Upgrade

**What it is:** When user selects "Interviewing" in Quick Add, show interview date and interviewer info fields.

**Added fields when Interviewing selected:**
- Interview date + time
- Interviewer name
- Interviewer email

These pre-fill the Interview tab and Contact tab on the new app.

**Files to modify:**
- `src/App.tsx` — update QuickAddModal with conditional fields

### 3E — Stage System Additions

**What it is:** Add the new decision-phase sub-stages.

**New sub-stages to add:**
- Waiting on Response (universal — works at any stage)
- Waiting on Decision (their side)
- Negotiating Offer
- Considering Offer (user thinking about it)
- Declined Offer → triggers auto-close modal (auto-archived as withdrew/declined)

**Files to modify:**
- `src/utils/stages.ts` — add new sub-stages
- `src/types/index.ts` — update SubStage type

### 3F — Active Section Upgrade (In Play → Active)

**What it is:** The "In Play" / "Tracker" section renamed to "Active" and rebuilt to feel like a proper CRM command center.

**Rename:**
- Nav label: "Active"
- Page heading: "Active Applications"

**Summary bar (top of page, always visible):**
```
22 active  ·  Screening 8  ·  Assessment 3  ·  Interviewing 6  ·  Offer 2  ·  Deciding 3
```
Each count is clickable — filters the table to that stage. "X active" clears all filters.

**Health indicator dots (leftmost column, color-coded):**
- Green — active, moved within last 7 days
- Yellow — needs attention, follow-up overdue or due today
- Red — stalling, no movement in 14+ days
- Blue — interview coming within 7 days
- Purple — in offer/negotiation stage

**New columns:**
- Health dot (far left)
- Company + Role (combined, two lines)
- Stage pill + sub-stage
- Days in stage ("12 days") — shows stalling apps at a glance
- Last activity ("Stage changed 3 days ago")
- Next action (the linked task date — "Follow up Apr 20" or "Overdue 2 days" in amber)
- Priority badge
- Desire rank (stars, 1–5)
- Quick actions (appear on row hover — see below)

**Hover quick actions (right edge of row on hover):**
- Change stage (opens stage selector inline)
- Add/set next action (opens quick task creator)
- Open Prep Room (only shows for Interviewing-stage apps)
- Close Out (X icon — opens close-out modal)

**Filter system (replaces grouping — flat list always):**
- Filter by stage (multi-select)
- Filter by priority (High / Medium / Low)
- Filter by health status (Stalling / Needs Attention / Active / Interview Soon)
- Filter by source (LinkedIn / Indeed / Referral / etc.)
- Filter by next action date (overdue / today / this week)
- "Clear all filters" button when any filter is active

**Sort options:**
- Days in stage (default — surfaces stalling apps first)
- Next action date (soonest first)
- Priority
- Desire rank
- Company (A–Z)
- Date applied

**Bulk actions (checkbox per row, select all):**
- Change stage for all selected
- Set priority for all selected
- Close out all selected (one reason applied to all)

**Next action = task integration:**
- When user sets a next action from the Active table (via hover action or app detail), it creates a Task
- Tasks feed into the Tasks section (Phase 5) and Dashboard Today's Focus
- Next action column in the table is a live link to that task

**Files to modify:**
- `src/App.tsx` — rebuild TrackerView into ActiveView with all new features
- `src/components/layout/Sidebar.tsx` — rename "In Play" → "Active"
- `src/types/index.ts` — update View type if needed, add health status helper type
- `src/utils/dates.ts` — add daysInStage helper

### 3G — Pipeline Drag-and-Drop Upgrade

**What it is:** The Pipeline (Kanban) view becomes a visual drag-and-drop board. Apps can be dragged between stage columns. Moving triggers an auto-label for the Interviewing and Offer stages.

**Drag behavior:**
- Each app card is draggable between columns
- Drop on a stage column = stage change (same as clicking the stage selector)
- Animated card drop with spring physics (Framer Motion drag API)

**Auto-label on drop:**
- Drag to Interviewing → auto-sets sub-stage to "Round 1" (still editable)
- Drag to Offer → prompts mini-modal: "Add offer amount?" (optional, dismissable)

**Visual improvements:**
- Drop zones highlight when card is being dragged over them
- Column headers show app count
- Columns scroll independently if there are many cards
- Cards show: company, role, health dot, days in stage, next action date

**Pipeline stays read-only for editing** — dragging changes the stage only. All other edits still happen in the app detail panel (open by clicking the card).

**Files to modify:**
- `src/App.tsx` — rebuild PipelineView with Framer Motion drag
- `src/types/index.ts` — no changes needed (stage system unchanged)

---

## 🔲 Phase 4 — Contacts Section (BUILD AFTER PHASE 3)

**What it is:** A dedicated Contacts section in the sidebar. Every contact added to an In Play app is accessible here. Survives after an app is archived.

**Contact card fields:**
- Name, title, company
- Email
- Phone 1 + type, Phone 2 + type
- Notes
- Linked app(s)
- Date added (contact age: "Added 47 days ago")

**Rules:**
- Contacts auto-created when app moves to In Play (from the contact info already on the app)
- Same company = no duplicate contacts — new contact links to existing company record
- User can manually add contacts (not linked to an app)
- Option to unlink a contact from a job (in case person changes companies)
- Contact stays in Contacts after app is archived — unless user manually deletes
- Contact age shows how long they've been in the system

**Sidebar nav:** Add "Contacts" under Tools section

**Files to create/modify:**
- Create: `src/components/contacts/ContactsView.tsx`
- Modify: `src/App.tsx` — wire up view routing, auto-add contact logic on In Play move
- Modify: `src/components/layout/Sidebar.tsx` — add Contacts nav item
- Modify: `src/types/index.ts` — add Contact type, update storage keys
- Modify: `src/utils/storage.ts` — add `prospect-contacts` key

---

## 🔲 Phase 5 — Tasks System (BUILD AFTER PHASE 4)

**What it is:** A lightweight task layer. Users create to-dos tied to specific apps or as general tasks. Tasks populate Today's Focus on the dashboard.

**Two task types:**
- **General task** — standalone (e.g., "Update resume", "Research Salesforce culture")
- **App-linked task** — tied to a specific application (e.g., "Send follow-up to Salesforce", "Prep for Round 2 at TechCorp")

**Task fields:**
- Title
- Due date (optional)
- Linked app (optional)
- Done / not done

**Where tasks show up:**
- Tasks section (own nav item)
- Today's Focus on Dashboard — due today + overdue tasks (both types)
- Inside the job app detail — app-linked tasks shown in a Tasks mini-section

**Dashboard integration:** Today's Focus shows: overdue tasks, tasks due today, upcoming interviews, follow-ups due

**Files to create/modify:**
- Create: `src/components/tasks/TasksView.tsx`
- Modify: `src/App.tsx` — wire routing, add task state + storage
- Modify: `src/components/dashboard/Dashboard.tsx` — pull tasks into Today's Focus
- Modify: `src/components/layout/Sidebar.tsx` — add Tasks nav item
- Modify: `src/types/index.ts` — add Task type
- Modify: `src/utils/storage.ts` — add `prospect-tasks` key

---

## 🔲 Phase 6 — Lock In Focus Timer

**What it is:** The Lock In button now opens a focus sprint timer for sending applications.

**How it works:**
1. User clicks Lock In in sidebar
2. Modal opens: set a target (how many apps this session) + timer (30/45/60/90 min or custom)
3. Session starts — sidebar button pulses jade green, shows countdown
4. When session ends or user hits Done: animated summary (apps sent vs goal)
5. Lock In sessions unlock badges

**Files to create/modify:**
- Create: `src/components/lockin/LockInModal.tsx`
- Modify: `src/App.tsx` — wire modal, pass lockIn state to Sidebar
- Modify: `src/components/layout/Sidebar.tsx` — show active countdown
- Modify: `src/types/index.ts` — LOCK_IN_SESSIONS key already defined

---

## 🔲 Phase 7 — Badge System

**What it is:** Achievement badges earned through milestones. Rejections get badges too — reframes rejection as proof of effort.

**Badge categories:**
1. **Volume** — 25, 100, 250, 500, 1000 apps sent
2. **Rejection Badges** (badge of honor) — 25, 100, 250, 500 rejections
3. **Progress** — First next-step email, First interview, First offer, First accepted offer
4. **Consistency** — 3-week goal streak, 10 Lock In sessions
5. **Endurance** — 30, 60, 90 day hunt badges

**Implementation:**
- Badge check runs on every data update (lightweight, in-memory)
- Toast notification when earned
- Badge display panel accessible from sidebar
- Earned badges in localStorage

**Files to create/modify:**
- Create: `src/utils/badges.ts`
- Create: `src/components/badges/BadgePanel.tsx`
- Modify: `src/App.tsx` — trigger badge checks, show toast
- Modify: `src/types/index.ts` — BadgeId + EarnedBadge types already defined

---

## 🔲 Phase 8 — Stats & Reporting Upgrade

**Current state:** Stats view shows basic metrics, funnel, conversion rates, rejection breakdown.

**Upgrades:**
- Session-based filtering (current hunt vs all-time)
- Next-step rate as live widget on Dashboard (X% of apps got a response)
- Source effectiveness: LinkedIn vs Indeed vs Referral → which source gets responses
- Rejection breakdown: pre-interview vs post-interview (very different problems)
- Time-to-response distribution (how many days until you heard back by stage)
- Best day to apply (Mon–Tue vs Fri — show this when enough data exists)
- Hunt session comparison (if multiple sessions have been run)

**Files to modify:**
- `src/App.tsx` → StatsView function
- `src/components/dashboard/Dashboard.tsx` → next-step rate widget

---

## 🔲 Phase 9 — Full Interview Prep Page

**What it is:** A full-screen dedicated interview prep section — bigger and more powerful than the current Prep Room tab. Shows all apps in Interviewing stage.

**How it works:**
- Own nav item under Main
- Lists all apps currently in Interviewing stage
- Select an app → full-screen prep workspace opens
- Same tabs as Prep Room (Notes, Questions, Talking Points, Response Library) but full screen
- **Future: Create Prep button (AI-generated)**
  - Pulls resume from Resume Vault
  - Uses: job title, company, industry category (set when adding app)
  - Generates: 10 most likely interview questions + suggested answers, 10 questions to ask interviewer, company research summary
  - All editable after generation
  - Export / Print option

**Why this is separate from Prep Room:** The Prep Room is a workspace you navigate to. The Interview Prep Page is organized around your active interview stage apps — you see all of them at once and pick which one to prep for.

**AI piece note:** This is possible and not overly complex. One API call: resume text + job title + company + industry → structured prep. The hard part is the Resume Vault (file uploads), not the AI. Build the UI first, stub the Create Prep button, wire it when Resume Vault is built.

**Files to create/modify:**
- Create: `src/components/interviews/InterviewPrepPage.tsx`
- Modify: `src/App.tsx` — wire routing
- Modify: `src/components/layout/Sidebar.tsx` — add to Main nav section

---

## 🔲 Phase 10 — Inbox Triage Redesign

**What it is:** The inbox (Applied section) becomes a proper three-bucket triage system. Each bucket has its own counter and sub-section.

**Three buckets (on one page, visually separated):**

| Bucket | Triggered by | Counter | Action |
|---|---|---|---|
| Applied | "Thank you for applying" email | Total apps submitted | No action needed — stat only |
| Next Steps | Any email showing interest, assessment, interview invite | Next round rate | User decides to move to In Play |
| Rejections | Rejection email (before any In Play stage) | Pre-interview rejections | Goes to rejection tracking |

**Next Steps flow:**
1. Entry appears with: company, email content preview, contact info pulled from email
2. User clicks → sees full email + contact info
3. Options: "Move to In Play" → confirm contact modal → contact added to Contacts + app appears in tracker
4. Or "Not Interested" → dismissed, contact not saved

**Contact info pulled from email (when integration is live):**
- Name, title, email, company, phone

**Pre-integration:** User manually adds entries to each bucket with a form. Three "Add" buttons — one per bucket.

**Note:** Next Steps and Rejection counters don't add to the Total Apps count — those are already counted when the original "thank you" email came in. They have their own separate counters.

**Files to modify:**
- `src/App.tsx` — rebuild AppliedView into TriageView with 3 sub-sections
- `src/types/index.ts` — add emailType field to QueuedApp ('applied' | 'next-steps' | 'rejection')

---

## 🔲 Phase 11 — Onboarding Flow

**What it is:** First-time experience. Guides new users through setup without overwhelming.

**Flow:**
1. Welcome — "You're about to get serious about your job hunt"
2. Quick profile setup (name, email, target role, target salary, industry)
3. Start first Hunt Session
4. Quick tour of 3 key screens (dashboard, applied, tracker)
5. Ready — "Your command center is live"

**Trigger:** `settings.onboardingComplete === false` on first load

**Files to create:**
- `src/components/onboarding/OnboardingFlow.tsx`

---

## 🔲 Phase 12 — Resume Vault (requires Supabase)

**What it is:** Store and manage multiple resume versions. Tag each application with which resume was used. See which resume version gets the most responses.

**How it works:**
- Upload resume files (PDF/DOCX) — stored in Supabase Storage
- Each resume: name, version, date, tags, notes
- Link a resume to an application (from the Job tab)
- Stats: which resume version has the best response rate
- Resume Vault feeds into AI Interview Prep (Phase 9) — text is extracted and sent to Claude

**Placeholder screen exists already.**

**Files to create:**
- `src/components/resume/ResumeVault.tsx`
- Backend: Supabase Storage bucket + `resumes` table

---

## 🔲 Phase 13 — Email Integration (requires Gmail + n8n)

**What it is:** Connect Gmail via n8n automation. Emails auto-route to the right bucket in Prospect.

**Routing rules (logic layer already built):**
- "Thank you for applying" → Applied bucket (stat only)
- Next steps / interview invite / assessment → Next Steps bucket (contact pulled, user decides)
- Rejection → Rejection bucket (tracked by stage)

**Additional email features once connected:**
- Send emails directly from app (follow-up, thank-you, availability, etc.) without copy/paste
- Email preview in app detail — shows last email received from that company
- Email history timeline per application

**Implementation:**
- n8n webhook receives Gmail → calls Prospect API endpoint
- Supabase Edge Functions process routing logic
- Frontend polls for changes or uses Supabase realtime

---

## 🔲 Phase 14 — Calendar Sync (requires Google Calendar API)

**What it is:** Write interviews and follow-up reminders to the user's actual Google Calendar — not just display them in Prospect.

**Features:**
- When interview date is set → offer to add to Google Calendar
- Follow-up reminders → add as calendar reminders
- Calendar view in Prospect stays as the display layer (no change to UI)

---

## 🔲 Phase 15 — AI Interview Prep (requires Claude API + Resume Vault)

**What it is:** The "Create Prep" button in the Interview Prep Page generates a full prep package.

**How it works:**
1. User opens an app in the Interview Prep Page
2. Clicks "Create Prep"
3. System checks: is resume uploaded in Resume Vault? Is industry set on the app?
4. If yes: sends to Claude API — resume text + job title + company + industry
5. Claude returns:
   - 10 most likely interview questions for this role (based on industry + title)
   - Suggested answers for each (based on user's resume experience)
   - 10 questions the user should ask the interviewer
   - Brief company research summary (role context + what to emphasize)
6. Everything populates into the prep tabs — editable
7. Export / Print option

**This is one API call. Not complex once Resume Vault is built.**

---

## 🔲 Phase 16 — Analytics & Reporting Engine

**What it is:** The core intelligence layer of Prospect. Takes all the data captured across every stage and turns it into actionable insights about the user's job hunt.

**Why this matters:** Most people don't know why they're not getting hired. They assume it's their resume, or the market. Usually it's something specific and fixable — a drop-off at a particular stage, a source that's underperforming, or a targeting problem. Prospect's data shows them exactly what it is.

**Key metrics tracked:**
- Applied → Response rate (any reply at all)
- Applied → Next Steps rate (they're interested)
- Applied → Interview rate
- Interview → Offer rate
- Offer → Accepted rate
- Ghost rate (no response after 30+ days)
- Average days in each stage (are they stalling somewhere specific?)
- Source effectiveness (LinkedIn vs Indeed vs Referral vs Company Site)
- Role type performance (which role categories convert better)
- Industry performance (which industries respond better)
- Rejection reasons breakdown (early-stage vs late-stage — completely different problems)
- Resume version performance (linked to Resume Vault)
- Cover letter impact (do apps with cover letters convert better?)

**Generate Report feature:**
User hits "Generate Report" in the Stats section (or Dashboard). Claude analyzes all their data and produces a written, personalized report:

1. **Where You Stand** — total apps, response rate, interview rate, offer rate, days hunting, compared to benchmarks
2. **Where You're Dropping Off** — the biggest funnel gap explained in plain language ("Your screen-to-interview rate is 21%. Industry average is ~45%. The screen call may need work.")
3. **What's Working** — which source, role type, or approach is converting best
4. **Recommendations** — specific actions based on their actual numbers (not generic job search tips)
5. **This Week's Priority** — one thing to focus on, not five

**UI:**
- Stats section gets a proper analytics dashboard (charts, funnel visualization, drop-off heatmap)
- "Generate Report" button at top — runs the analysis via Claude API
- Report displays inline, can be exported as PDF

**Data captured now that feeds this (add these fields to apps immediately):**
- `industry` — which industry the company is in (user selects: Tech / Healthcare / Finance / Sales / Operations / Other)
- `roleCategory` — broad role type (user selects or auto-detected from role title)
- `coverLetterIncluded` — boolean
- `resumeVersionId` — links to Resume Vault when built, text field for now
- All stage transitions with timestamps are already in `history[]` — this powers time-in-stage analysis

**Requires:** Claude API (for Generate Report), enough data to be meaningful (at least 20–30 applications)

**Files to create/modify:**
- `src/components/stats/AnalyticsDashboard.tsx` — full rebuild of Stats view
- `src/utils/analytics.ts` — all calculation functions (funnel rates, averages, etc.)
- `src/App.tsx` — wire up Generate Report → Claude API call
- `src/types/index.ts` — add industry, roleCategory, coverLetterIncluded fields to Application type

---

## 🔲 Phase 17 — Job Buddy AI Companion (Future)

**What it is:** An AI that knows your entire job hunt — every application, every rejection, every interview, every pattern. It's the Generate Report feature (Phase 16) made conversational and proactive. Not a chatbot. A coach that uses your real data.

**Capabilities:**
- Proactive pattern alerts: "You've applied to 3 companies in healthcare this week — is that intentional? Your healthcare response rate is half your tech rate."
- Source coaching: "Your response rate on LinkedIn is 2x your Indeed rate. That's where your time should go."
- Interview coaching: "Your interview at TechCorp is tomorrow. Based on their culture page, here's what to emphasize."
- Streak analysis: "You've had 4 second-round rejections in a row. Want to talk through your interview approach?"
- Weekly digest: where you stand, what's working, one thing to fix this week
- Email drafting in your voice based on the specific company and stage
- Prioritization: suggests which active apps to focus on based on your conversion patterns
- Integrated with Generate Report — can explain any metric in plain language

**Feeds from:** Analytics Engine (Phase 16) + all application data + Resume Vault + Email history + stage transition timestamps

**Requires:** Claude API + full Supabase backend + all previous phases complete

---

## Quick Wins (Build Into Phase 3 or 8 as fits)

- **Bulk close-out** — select multiple apps, close with same reason at once
- **Stale app nudge** — "3 apps haven't moved in 14+ days. Close them out?" (on Dashboard)
- **Duplicate detection** — warn if same company already exists in tracker when adding new
- **Interview countdown widget** — if interview is within 48 hours, show countdown + prep nudge on Dashboard
- **Next-step rate widget on Dashboard** — live "X% of your apps got a response" number
- **Contact search** — search all contacts by name, company, or role from Contacts section
- **Quick note on contact** — add a note without opening full edit
- **Company research auto-fill** — type company name, pulls info (requires external API — long term)

---

## Current Build Order

| Phase | Feature | When |
|---|---|---|
| 3A | Stage selector bug fix (keep open for sub-stage selection) | First — do now |
| 3B | Close-Out System (modal, rejection + withdrew reasons, auto-archive 90 days) | Now |
| 3C | Contact Tab Redesign (Add Contact button, multiple contacts per app) | Now |
| 3D | Quick Add Upgrade (interview date + interviewer fields when Interviewing selected) | Now |
| 3E | Stage System Additions (new sub-stages, Declined Offer auto-archive) | Now |
| 3F | Active Section Upgrade (rename, health dots, days in stage, filters, hover actions, bulk) | Now |
| 3G | Pipeline Drag-and-Drop (Framer Motion drag, auto-label on drop) | Now |
| 4 | Contacts Section (own nav item, auto-created on In Play move, contact age, search) | After Phase 3 |
| 5 | Tasks System (app-linked + general, Today's Focus integration, next action = task) | After contacts |
| 6 | Lock In Focus Timer modal (timer + app count target + animated end screen) | After tasks |
| 7 | Badge System (volume, rejection, progress, consistency, endurance badges) | After Lock In |
| 8 | Stats Upgrade (next-step rate widget, source effectiveness, rejection by stage) | After badges |
| 9 | Full Interview Prep Page (full-screen, all interview-stage apps, AI stub) | After stats |
| 10 | Inbox Triage Redesign (3 buckets: Applied / Next Steps / Rejections) | After prep page |
| 11 | Onboarding Flow (first-time setup experience) | Before sharing with others |
| 12 | Resume Vault | Requires Supabase |
| 13 | Email Integration | Requires Gmail + n8n + Supabase |
| 14 | Calendar Sync | Requires Google Calendar API |
| 15 | AI Interview Prep | Requires Claude API + Resume Vault |
| 16 | Analytics & Reporting Engine (Generate Report, funnel analysis, drop-off insights) | Requires Claude API + enough data |
| 17 | Job Buddy AI Companion (proactive coaching, pattern alerts, weekly digest) | Requires all prior phases |

---

## Tech Stack (locked)

| Layer | Tool |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Raw CSS with design system tokens |
| Animation | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Data | localStorage (no backend yet) |
| Planned backend | Supabase (Storage, Edge Functions, Realtime) |
| Planned automation | n8n + Gmail OAuth |
| Planned AI | Claude API (claude-sonnet-4-6) |
| Planned calendar | Google Calendar API |

---

## localStorage Keys

| Key | Contents |
|---|---|
| `prospect-applications` | All job applications (Application[]) |
| `prospect-queue` | Inbox queue (QueuedApp[]) |
| `prospect-hunt-session` | Current hunt session (HuntSession \| null) |
| `prospect-settings` | User settings (UserSettings) |
| `prospect-career-stats` | All-time stats (CareerStats) |
| `prospect-contacts` | All contacts (Contact[]) — Phase 4 |
| `prospect-tasks` | All tasks (Task[]) — Phase 5 |
| `prospect-lock-in-sessions` | Lock In session logs |
| `prospect-common-responses` | Response library (PrepRoom, cross-app) |

---

## File Structure

```
src/
  types/index.ts
  utils/
    stages.ts
    dates.ts
    storage.ts
    badges.ts              ← Phase 7
  components/
    layout/
      Sidebar.tsx
    dashboard/
      Dashboard.tsx
    hunt/
      HuntActivationModal.tsx
    prep/
      PrepRoom.tsx
    calendar/
      CalendarView.tsx
    contacts/
      ContactsView.tsx     ← Phase 4
    tasks/
      TasksView.tsx        ← Phase 5
    lockin/
      LockInModal.tsx      ← Phase 6
    badges/
      BadgePanel.tsx       ← Phase 7
    interviews/
      InterviewPrepPage.tsx ← Phase 9
    resume/
      ResumeVault.tsx      ← Phase 12
    onboarding/
      OnboardingFlow.tsx   ← Phase 11
  App.tsx
  index.css
```

---

## Nudge Engine Voice (locked)

Warm, direct, real-talk — not corporate. Like a successful friend who cares.

**Right:**
- "Interview at TechCorp is today. You've got this — go get it."
- "30 days in. Most people quit before this. The fact you're still here? That matters."
- "Weekly goal hit. Seriously, well done. Now keep the momentum going."

**Wrong:**
- "Congratulations on your progress!" ❌
- "Keep up the great work!" ❌

---

*Updated: 2026-04-17 — full roadmap through Phase 16. Phase 3 is next build.*
