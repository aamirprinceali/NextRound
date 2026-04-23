# NextRound — Job Hunt HQ

## What this is
A complete job hunting OS/CRM. You live here during your entire job search. The only thing you do outside this app is actually submit applications — everything else happens here.

## Project location
`~/Desktop/dev/NextRound`

## How to start it
```bash
cd ~/Desktop/dev/NextRound
npm run dev
```
Then open: http://localhost:5174

## Stack
- React + TypeScript + Vite (frontend only, no backend yet)
- Raw CSS (no Tailwind)
- localStorage for all data persistence
- Supabase planned for file uploads
- n8n + Gmail OAuth planned for email automation

## Git branches
- `main` → clean base
- `branch-1` → UI redesign
- `branch-2` → Calendar, desire ranking, contacts, pay, offer tracking
- `branch-3` → Full Job Hunt HQ — inbox queue, prep tab, weekly goal, sortable columns
- `branch-4` → Smart email routing + deduplication + simulator
- `branch-5` → Stats/reporting page + email composer
- `branch-6` → Rejection Center + improved inbox flow ← **current**

---

## Complete Feature List

### Dashboard (Command Center)
- Weekly application goal with progress bar (set your own target, e.g. 5/week)
- "Needs attention" panel — applications that are stalled or overdue for follow-up
- Upcoming interviews list (next 3)
- Top picks — your highest desire-ranked active applications
- Live sidebar metrics: Active count, Interviewing count, Needs attention count, Archived count

### Application Tracker
- Full sortable table of all active applications
- Click any stage pill to instantly change the stage (no modal needed)
- Sort by: Company, Stage, Priority, Follow-up date, Desire rank, Applied date
- Filter by stage or free-text search (company, role, recruiter, notes)
- Priority badges: High / Medium / Low
- Desire rank: 1–5 stars (how much you want this job)
- Flagged indicator (hard "I really want this one" marker)
- Auto-generated follow-up date (7 days after applied)
- Visual "overdue" and "stalled" indicators

### Application Detail Panel (6 tabs per application)
**Overview tab**
- Stage history log — every status change timestamped
- Quick-edit: stage, priority, desire rank, follow-up date, work style
- Notes field
- Applied date, source platform

**Contact tab**
- Recruiter name + contact (email/phone/LinkedIn)
- Interviewing manager name + contact
- Company website / job posting URL

**Job tab**
- Listed pay range (from job posting)
- Your target pay
- Job description (full text)
- Resume version used
- Cover letter notes

**Prep tab**
- Company research notes
- Questions to ask / prepare answers for
- Key talking points (STAR stories)
- Interview date + time
- Prep status: Not started / Light prep / Ready

**Offer tab**
- Offer amount
- Decision notes (pros/cons)
- Accept or decline

**Email tab** (see Email Composer below)

### Pipeline View
- Kanban-style 3-column board: Applied → Interviewing → Decision
- Click any card to open it in the tracker

### Interview Schedule
- Table of all applications with scheduled interview dates
- Shows: company, role, interview date/time, prep status, current stage
- Click any row to open its prep tab

### Calendar View
- Monthly calendar showing all interviews, follow-up dates, and offers
- Color coded: teal = interview, amber = follow-up, green = offer
- Legend at bottom

### Inbox (Application Queue)
- "How it works" banner showing the 4-step flow: Apply → Email arrives → You track it → Interview invite auto-promotes
- Pending queue: applications waiting for your decision to track or dismiss
- "Track this →" primary button to move to tracker instantly
- "Not interested" to dismiss
- Each card shows: source badge, email type, received date, overdue warning (5+ days)
- Auto-promote hint: explains that interview invites for queued companies auto-promote
- Already tracking section: shows queue items that became tracker entries
- Dismissed section: shows dismissed items with option to restore
- Manual add form: add queue items yourself (before n8n is connected)
- Email routing simulator: test the routing logic without real emails

### Smart Email Routing (handleIncomingEmail)
When an email comes in (via n8n when connected):
- Rule 1: "Thanks for applying" → queue only (you decide whether to track)
- Rule 2a: Company already in tracker → update stage only, never duplicate, never go backwards
- Rule 2b: Company in queue (pending) → auto-convert to tracker at correct stage
- Rule 2c: Not found anywhere → auto-add to tracker at correct stage
- Supported email types: acknowledgment, next steps, assessment, interview invite, offer, rejection

### Stats & Reporting
- Overview chips: total applied, still active, got next steps, rejections, offers, response rate
- Application funnel (CSS bar chart): Applied → Recruiter Screen → Round 1 → Round 2 → Round 3+ → Offer
- Rejection breakdown by stage (bar chart)
- Applications by source (bar chart)
- Round-by-round interview stats: how many reached each round

### Rejection Center
- Summary chips: total closed, near misses (got interviews), ghosted/no response, early rejections
- Filter tabs: All / Near misses / Ghosted / Early stage
- Grouped by stage reached: Final round, Round 2, Round 1, Recruiter screen, Email rejection, No response
- Near-miss cards highlighted with amber left border
- Each card shows: company, role, applied date, source, salary, your desire stars, rejection detail
- Click "View →" to open full application
- Red count badge on sidebar nav

### Email Composer (inside each application)
5 pre-filled templates using your settings + that application's data:
- Follow-up after applying (check in after no response)
- Thank-you after interview (send within 24 hours)
- Send your availability (when asked to schedule)
- Confirm interview time (confirm a scheduled interview)
- Withdraw from process (exit politely)
- Editable textarea before sending
- Copy to clipboard button
- "Open in email client" button (pre-fills mailto with subject + body)

### Archive View
- Table of all closed/archived applications
- Shows: company, role, archive reason, detail notes
- Click any row to open full application

### Export
- Export all applications to CSV (one click from header)

### Settings (per-application email tab)
- Your full name
- Availability block (used in scheduling template)
- Email signature (used in all templates)

---

## localStorage keys
- `nextround-applications` — all job applications
- `nextround-queue` — inbox/email queue
- `nextround-weekly-goal` — weekly application target
- `nextround-settings` — user settings (name, availability, email signature)

---

## What's planned next
- File upload UI (resumes, cover letters per job) — Supabase backend
- Scheduling conflict detection (warn when two interviews overlap)
- n8n + Gmail OAuth for real email automation

## Key files
- `src/App.tsx` — entire app (~2300 lines as of branch-6)
- `src/App.css` — all styles
