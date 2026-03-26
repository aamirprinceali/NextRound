# NextRound

NextRound is a local-first job search command center for the applications worth caring about. It helps you track follow-ups, interviews, prep status, and archived outcomes without forcing you to live in a spreadsheet.

## Current V1 Features
- Premium dashboard with at-a-glance stats
- Quick-add flow for high-signal jobs
- Tracked jobs view with stage, prep status, and notes
- Interviews view for round, time, recruiter, and prep tracking
- Archive view with rejection / closeout reasons
- Local storage persistence in the browser
- Single project memory file at `docs/master-roadmap.md`

## Run Locally
```bash
npm install
npm run dev
```

Then open the local Vite URL shown in the terminal, usually `http://127.0.0.1:5173/`.

## Build
```bash
npm run build
```

## Project Notes
- This app is intentionally focused on jobs worth tracking closely, not every mass application.
- Calendar and email integration are planned for a later phase.
- Future ideas, automations, and scope decisions live in `docs/master-roadmap.md`.
