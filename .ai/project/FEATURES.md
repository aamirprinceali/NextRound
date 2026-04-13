# NextRound — Features

## Status Key
- ✅ Built & working
- 🔧 Built but needs polish/improvement
- 📋 Planned / prioritized
- 💡 Ideas backlog
- 🚀 Future / post-launch

---

## Core App

### Dashboard
- ✅ Weekly application goal with progress bar
- ✅ "Needs attention" panel — stalled/overdue applications
- ✅ Upcoming interviews list
- ✅ Top picks (highest desire-ranked active apps)
- ✅ Live sidebar metrics (active, interviewing, needs attention, archived)
- 📋 **REDESIGN — make it a true command center, premium and dynamic**
- 📋 Interview prep countdown cards (days until next interview)
- 📋 "Drafts waiting for review" count badge (email approval queue)
- 💡 "Why I want this job" reminder surface on dashboard for upcoming interviews

### Application Tracker
- ✅ Full sortable table — company, stage, priority, follow-up, desire rank, applied date
- ✅ Click stage pill to instantly change stage
- ✅ Filter by stage or free-text search
- ✅ Priority badges (High/Medium/Low)
- ✅ Desire rank 1–5 stars
- ✅ Flagged indicator ("I really want this one")
- ✅ Auto-generated follow-up date (7 days after applied)
- ✅ Visual overdue/stalled indicators
- 📋 **Quick Capture bar** — paste a job URL or type company + role, hit Enter, done in 10 seconds
- 💡 Browser bookmarklet / extension — one click on a job posting pre-fills the add form

### Application Detail (6 tabs per app)
- ✅ Overview tab — stage history, quick-edit fields, notes
- ✅ Contact tab — recruiter + manager info
- ✅ Job tab — pay range, job description, resume version, cover letter notes
- ✅ Prep tab — company research, questions, STAR talking points, interview date, prep status
- ✅ Offer tab — offer amount, decision notes, accept/decline
- ✅ Email tab — composer with 5 templates
- 📋 **"Why I want this job" field** — personal note written at time of add, surfaces in Prep tab before interview
- 💡 AI-generated prep questions from job description (Claude API integration)

### Pipeline View
- ✅ Kanban-style 3-column board: Applied → Interviewing → Decision

### Interview Schedule
- ✅ Table of all apps with scheduled interview dates
- ✅ Shows company, role, date/time, prep status, stage

### Calendar View
- ✅ Monthly calendar — interviews, follow-ups, offers
- ✅ Color coded by type

### Inbox / Application Queue
- ✅ "Thanks for applying" emails route to queue only (user decides to track or dismiss)
- ✅ "Track this →" button to move to tracker
- ✅ "Not interested" to dismiss
- ✅ Auto-promote: interview invites for queued companies auto-promote to tracker
- ✅ Already tracking / dismissed sections
- ✅ Manual add form (before n8n is connected)
- ✅ Email routing simulator
- 📋 **Rename/clarify UI language to "Applications Submitted Queue" more clearly**
- 📋 **Email Approval Queue** — separate section showing auto-drafted replies waiting for user review before sending
- 📋 Availability-aware auto-draft: when interview invite comes in, auto-draft a "send your availability" reply using Settings availability block

### Smart Email Routing (handleIncomingEmail)
- ✅ Acknowledgment → queue only
- ✅ Next steps / assessment → Recruiter Screen stage
- ✅ Interview invite → Scheduled 1st Interview stage
- ✅ Offer → Offer made stage
- ✅ Rejection → No response stage
- ✅ Deduplication — never creates two tracker entries for same company
- ✅ Never moves stage backwards
- 📋 **Auto-draft reply on interview invite** (uses availability from Settings, user approves before send)
- 🚀 Real email parsing via n8n + Gmail OAuth (post-launch)

### Stats & Reporting
- ✅ Overview chips: total applied, active, next steps, rejections, offers, response rate
- ✅ Application funnel bar chart
- ✅ Rejection breakdown by stage
- ✅ Applications by source
- ✅ Round-by-round interview stats
- 📋 **Visual polish pass — cleaner layout, better charts**
- 💡 Response-rate trends over time
- 💡 Metrics by role family / industry
- 💡 Source performance (which platform converts best for you)

### Rejection Center
- ✅ Summary chips: total closed, near misses, ghosted, early rejections
- ✅ Filter tabs: All / Near misses / Ghosted / Early stage
- ✅ Grouped by stage reached
- ✅ Near-miss cards with amber highlight
- ✅ Red badge count on sidebar nav
- 💡 "Apply again?" recommendation — flag companies worth re-approaching later

### Email Composer
- ✅ 5 pre-filled templates per application
- ✅ Editable before copying
- ✅ "Open in email client" button (mailto)
- 📋 **Email Approval Queue** — drafts auto-generated on trigger, collected in one place for review/send
- 📋 Auto-send toggle in Settings (default: require approval / optional: auto-send)

### Contacts / Recruiters Section
- ✅ Contacts stored per-application (recruiter + hiring manager tabs)
- 📋 **Standalone Contacts page** — dedicated section for all contacts across all applications
- 📋 Assign contacts to specific applications
- 📋 Recruiter profile card: name, company, email, phone, LinkedIn, notes
- 📋 "Linked applications" on each contact record — see every job they've touched
- 💡 Contact history log — what you said and when
- 💡 Future: come back after 6 months and still have recruiter info intact

### Archive View
- ✅ Table of all closed/archived applications
- ✅ Archive reason + detail notes
- ✅ Click row to open full application
- 💡 Never truly delete archived apps — long-term memory/history use case

### Export
- ✅ CSV export of all applications

### Settings
- ✅ Full name
- ✅ Availability block (used in scheduling templates)
- ✅ Email signature
- 📋 Auto-send toggle for email drafts (approve first vs auto-send)
- 💡 Custom stage labels
- 💡 Notification preferences (future)

---

## Future / Post-Launch Features
- 🚀 Browser bookmarklet / extension — one click on job posting pre-fills NextRound quick-add
- 🚀 File uploads (resume, cover letter per job) — requires Supabase backend
- 🚀 Scheduling conflict detection — warn when two interviews overlap
- 🚀 n8n + Gmail OAuth — real email parsing and automation
- 🚀 Supabase backend — data persistence beyond localStorage
- 🚀 AI prep questions from job description (Claude API)
- 🚀 Mobile-optimized layout
- 🚀 Desktop app packaging (Electron or Tauri)
- 🚀 Multi-user / cloud sync
- 🚀 Import from spreadsheet
- 🚀 Visual career map / relationship view — node-style map connecting companies, roles, sources, outcomes
- 🚀 Journey Map view — timeline showing how far each role advanced
- 🚀 "Where should I re-apply?" recommendations based on history
- 🚀 Custom stage labels per user
- 🚀 Drag-and-drop stage updates
- 🚀 Reusable interview question bank
