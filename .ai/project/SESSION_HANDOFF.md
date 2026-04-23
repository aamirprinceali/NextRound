# Prospect — Session Handoff
**Last updated: 2026-04-23**

---

## How to Start

```bash
cd ~/Desktop/dev/NextRound
npm run dev
```
Open: **http://localhost:5174**
Branch: `prospect/redesign`

---

## What This App Is

**Prospect** — a premium job hunting OS, CRM, and analytics platform. Not a tracker. A command center that helps people get hired faster by showing them exactly where they're losing in the funnel and what to fix.

**Three-layer vision:**
1. **Organization** — every active app tracked, nothing falls through
2. **Analytics** — funnel drop-off analysis, Generate Report (Phase 16)
3. **Intelligence** — Job Buddy AI coaching based on real patterns (Phase 17)

---

## Current State of the App

Everything below is **built and working** as of this session:

| Screen | Status |
|---|---|
| Dashboard (Command Center) | ✅ Full rebuild — count-up animations, Today's Calendar Snapshot, pipeline glance |
| Inbox (3-bucket triage) | ✅ Submitted / Next Steps / Pre-Interview Declines with funnel bar |
| Active (tracker) | ✅ Renamed from "In Play", sortable table, stage selector, priority badges |
| Pipeline (Kanban) | ✅ Stage columns with count chips + scroll gradient |
| Interview Schedule | ✅ Upcoming/past, prep status, countdown |
| Calendar View | ✅ Monthly grid, interview + follow-up events |
| Prep Room | ✅ Full-screen two-column workspace, 4 tabs, response library, auto-save |
| Stats | ✅ Funnel, rejection breakdown, source breakdown |
| Rejection Center | ✅ Filter tabs, near-miss highlighting, red badge |
| Archive | ✅ Searchable table of closed apps |
| Settings | ✅ Name, salary, availability, email signature |
| Lock In button | ✅ Jade green, wired (timer modal TBD) |
| Sidebar | ✅ Hunt session banner, "X apps sent" counter, weekly goal progress bar |

**Session 2026-04-21:** Inbox rebuilt as 3-bucket triage, funnel bar, "In Play" → "Active" everywhere, Move to Active flow.

**Session 2026-04-23:** Close-out button on every Active row (red "✕ Close"). CloseOutModal with stage reached, Rejected/Ghosted/Withdrew reasons, optional note. InterviewSetupModal fires when any app is moved to Interviewing (pick round + date). Quick Add shows interview date + round when Interviewing selected. Inbox sections converted to horizontal tabs (Submitted | Next Steps | Declined). Rejection count badge removed from sidebar. AI Buddy, Contacts section enhancements, and Interview tab simplification added to IDEAS_BACKLOG.

---

## What To Build Next

### Phase 3 — Core Refinements (START HERE)

**Work through these in order. Build → test → user approves → move to next.**

### Phase 3A — Stage Selector Bug Fix (START HERE, ~15 min)
**Bug:** When you pick a main stage in the stage selector, dropdown closes immediately. User has to reopen to pick sub-stage.
**Fix:** If selected main stage has sub-stages, keep dropdown open and show sub-stage options. Close only after sub-stage is picked or user clicks outside. If no sub-stages on selected stage, close immediately.
**File:** `src/App.tsx` — `StageSelector` component (around line 143)

### Phase 3B — Close-Out System
Every In Play app needs a Close Out button (not just moving to Closed stage manually).

**Close Out modal — two paths:**

**Rejection path:**
- Auto-populates current stage in the "rejection round" field
- Dropdown to change if needed: Pre-interview rejection, Recruiter Screen, Assessment, First Round, Second Round, Final Round, Ghosted (no response 30+ days)

**Withdrew path:**
- Compensation too low
- Accepted another offer
- Declined an offer (got offer, said no)
- No longer interested — role fit
- No longer interested — company fit
- Personal reasons
- Other (free text)

**Archive entry saves:** company, role, stage reached, date applied, date closed, reason, desire rank, salary range, contact info snapshot

**Auto-archive rule:** Any app with zero stage movement for 90 days → auto-archives with reason "Inactive — Auto Archived." Clock resets on any stage change.

**File:** `src/App.tsx` — add `CloseOutModal` component, add auto-archive logic in App useEffect

### Phase 3C — Contact Tab Redesign
Replace the open contact form fields with an **Add Contact** button.

**Add Contact modal:**
- Name, Title/Position, Email
- Phone 1 + type selector (Cell / Work / Home)
- Phone 2 + type selector (Cell / Work / Home)
- Notes
- Multiple contacts per app, no limit

Contact data on this tab will sync to the standalone Contacts section built in Phase 4.

**Files:** `src/App.tsx` (Contact tab in DetailPanel) + `src/types/index.ts` (add AppContact type)

### Phase 3D — Quick Add Upgrade
When user selects "Interviewing" as stage in Quick Add modal, reveal additional fields:
- Interview date + time
- Interviewer name
- Interviewer email

These pre-fill the Interview tab and Contact tab on the newly created app.

**File:** `src/App.tsx` — `QuickAddModal` component

### Phase 3E — Stage System Additions
Add new sub-stages to `src/utils/stages.ts`:
- **Waiting on Response** — universal between-phases state (available on all stages)
- **Waiting on Decision** — company deciding
- **Negotiating Offer** — offer in hand, negotiating terms
- **Considering Offer** — user thinking about offer
- **Declined Offer** — user turned down offer → triggers Close Out modal automatically, archives as withdrew/declined

**Files:** `src/utils/stages.ts` + `src/types/index.ts` (update SubStage union type)

### Phase 3F — Active Section Upgrade (Big one)
Rename "In Play" / "Tracker" → **"Active"**. Rebuild to feel CRM-grade.

**Summary bar (top of page):**
```
22 active  ·  Screening 8  ·  Assessment 3  ·  Interviewing 6  ·  Offer 2  ·  Deciding 3
```
Each count clickable → filters table. "X active" clears all filters.

**Health indicator dots (leftmost column):**
- 🟢 Green — moved in last 7 days
- 🟡 Yellow — follow-up overdue or due today
- 🔴 Red — no movement in 14+ days (stalling)
- 🔵 Blue — interview coming within 7 days
- 🟣 Purple — in offer/negotiation stage

**New table columns:**
- Health dot (far left)
- Company + Role (two-line combined)
- Stage + sub-stage pill
- Days in stage (e.g., "12 days") — shows stalling apps
- Last activity (e.g., "Stage changed 3 days ago")
- Next action (linked task date — "Follow up Apr 20" or "Overdue 2 days" in amber)
- Priority badge
- Desire rank (stars)
- Hover quick actions (right edge — see below)

**Hover quick actions (appear on row hover):**
- Change stage (inline stage selector)
- Add/set next action (quick task creator)
- Open Prep Room (only for Interviewing-stage apps)
- Close Out (X icon → close-out modal)

**Filter system (flat list — NO grouping):**
- By stage (multi-select)
- By priority
- By health status (Active / Needs Attention / Stalling / Interview Soon)
- By source
- By next action date (overdue / today / this week)
- "Clear filters" button when active

**Sort options:**
- Days in stage (default — surfaces stalling apps first)
- Next action date
- Priority
- Desire rank
- Company A–Z
- Date applied

**Bulk actions (checkbox per row):**
- Change stage for all selected
- Set priority for all selected
- Close out all selected

**Next action = task connection:**
Setting a next action from this view creates a Task (Phase 5 storage, but wire the UI now and it'll be ready when Tasks is built).

**Files:** `src/App.tsx` (rebuild TrackerView → ActiveView), `src/components/layout/Sidebar.tsx` (rename nav item), `src/utils/dates.ts` (add daysInStage helper)

### Phase 3G — Pipeline Drag-and-Drop
Upgrade the Pipeline Kanban to support drag-and-drop with Framer Motion.

**Behavior:**
- Each app card is draggable between stage columns
- Dropping on a column = stage change
- Animated spring drop (Framer Motion drag API)

**Auto-label on drop:**
- Drag to Interviewing → auto-sets sub-stage "Round 1" (still editable)
- Drag to Offer → small prompt "Add offer amount?" (optional, dismissable)

**Visual improvements:**
- Drop zone highlights when card is dragged over it
- Column headers show app count
- Cards show: company, role, health dot, days in stage, next action date

**Note:** Editing still happens in detail panel. Drag changes stage only.

**File:** `src/App.tsx` — rebuild PipelineView

---

## After Phase 3

| Phase | What |
|---|---|
| 4 | Contacts Section (own nav, auto-created on In Play move, search, contact age) |
| 5 | Tasks System (general + app-linked = next action, Today's Focus on Dashboard) |
| 6 | Lock In Focus Timer modal |
| 7 | Badge System |
| 8 | Stats Upgrade (next-step rate, source effectiveness, rejection by stage) |
| 9 | Full Interview Prep Page (full-screen, all Interviewing apps listed) |
| 10 | Inbox Triage Redesign (3 buckets: Applied / Next Steps / Rejections) |
| 11 | Onboarding Flow |
| 12+ | Backend: Supabase, Gmail, Google Calendar, Claude API, Job Buddy |

---

## Key Files

| File | What it does |
|---|---|
| `src/App.tsx` | Root component + all views (~2150 lines) |
| `src/types/index.ts` | All TypeScript types |
| `src/utils/stages.ts` | Stage config, colors, sub-stages |
| `src/utils/dates.ts` | Date helpers |
| `src/utils/storage.ts` | localStorage read/write + migration |
| `src/index.css` | Design system tokens, fonts, global styles |
| `src/components/layout/Sidebar.tsx` | Navigation, hunt banner, Lock In button |
| `src/components/dashboard/Dashboard.tsx` | Command center (rebuilt this session) |
| `src/components/prep/PrepRoom.tsx` | Full-screen interview prep workspace |
| `src/components/calendar/CalendarView.tsx` | Monthly calendar view |
| `docs/plans/2026-04-13-prospect-master-plan.md` | **MASTER PLAN — all 17 phases** |
| `.ai/project/FEATURES.md` | Full feature status list |

---

## Design System (locked — do not change)

| Token | Value |
|---|---|
| Background | `#08090D` |
| Surface | `#10111A` |
| Surface 2 | `#171825` |
| Brand (jade) | `#7EE8A2` |
| Gold | `#FBBF24` |
| Danger | `#F87171` |
| Display font | Bricolage Grotesque |
| Body font | DM Sans |

---

## How Aamir Likes to Work

- Explain what we're doing and why in plain language before touching code
- Build one chunk at a time, he tests it before moving to the next
- No over-engineering — build exactly what's needed
- After each section: verify it works completely before moving on
- At end of session: update all .ai/project/ files + commit + push to GitHub
- Full session summary when wrapping up

---

## Rules

- All data in localStorage — no backend yet
- Never delete user data — closed apps go to Archive
- Build order: Phase 3A first (bug fix), then 3B → 3C → 3D → 3E → 3F → 3G
- Each sub-phase fully tested before next one starts
