# NextRound Master Roadmap

## Product Vision
NextRound is a local-first job search command center for the small set of opportunities that are worth real attention. It is not meant to track every mass application. It is meant to help the user follow up, prep, stay organized across interviews, and understand what is happening in the pipeline at a glance.

## Confirmed Product Decisions
- Project name: `NextRound`
- First release: local-only
- Design direction: bold / premium visuals with a command-center layout
- Focus: track the jobs that matter most, especially the ones worth following up on or already moving into interviews
- Keep all product ideas and future automations in this single file unless expansion is needed later
- Calendar and email integration are out of scope for v1 and should be revisited later

## V1 Scope
- Dashboard with overview stats
- Tracked jobs view
- Interviews view
- Archive view
- Quick-add workflow for roles worth tracking
- Source tracking for where the application was submitted
- Follow-up date tracking
- Interview prep status
- Notes per job
- Archive reasons and closeout detail
- Local persistence so the app keeps data between sessions on the same machine

## Core Data To Track
- Company
- Role title
- Source submitted from
- Date applied
- Follow-up date
- Salary or pay range
- Remote / hybrid / onsite
- Priority
- Fit score
- Current stage
- Interview round
- Recruiter or interviewer name
- Interview date / time
- Prep status
- Notes
- Archive reason
- Archive detail

## Archive / Rejection Tracking
Structured reasons to support pattern analysis:
- Email rejection
- Rejected after recruiter screen
- Rejected after 1st round
- Rejected after final round
- Role filled
- Salary mismatch
- Withdrew
- No longer interested
- Unable to contact
- Offer declined
- Other

## Future Features
- Rich detail page per application
- Search and filters
- Company page with all interactions and notes
- Duplicate detection for role + company combos
- Contact history log
- Reminders center
- Resume version attached to each application
- Research panel for job description, company info, and interviewer notes
- Kanban board view
- Calendar view
- Drag-and-drop stage updates
- Saved templates for follow-up messages
- Prep checklists
- Reusable interview question bank
- Metrics by source platform
- Metrics by role family
- Response-rate trends over time
- Offer tracking and decision support
- Desktop app packaging
- Multi-user / cloud sync later

## Future Automations
- Automatically suggest a follow-up window after an application is added
- Flag stale applications with no response after a configurable number of days
- Generate an interview prep checklist when an interview is scheduled
- Auto-group archived outcomes by reason and stage
- Browser quick-save flow from job boards
- Calendar sync for interview events
- Email parsing for interview invites and rejection emails
- Smart reminders for follow-up timing
- Suggested outreach prompts based on stage and elapsed time

## Design Notes
- Should feel premium, memorable, and motivating
- Must not look like a spreadsheet replacement
- Strong visual hierarchy
- Dashboard should surface urgency
- Should feel simple enough to use while actively job searching
- Mobile-friendly layout is important even if desktop is the main use case

## Open Questions
- Should tracked jobs support multiple interview events per company in v2
- Should we add dedicated recruiter / contact records later
- Should we support import from spreadsheets once the data model settles
- Should we let the user set custom stage labels later
