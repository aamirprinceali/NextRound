# NextRound

NextRound is a local-first job search command center for the applications worth caring about. It helps you track follow-ups, interviews, prep status, and archived outcomes without forcing you to live in a spreadsheet.

## Current V1 Features
- Premium command center with stats, quick-view focus cards, and premium hero copy.
- Quick-add capture plus a table-style application log with filtering, search, and CSV export.
- Interactive log rows so you can change stages, jump to details, and advance the next step immediately.
- Pipeline board + journey map for visualizing where every tracked job sits in the flow.
- Detail workspace for prep status, interview scheduling, notes, and archive reasons tied to rejection context.
- Archive, idea backlog, and project roadmap all captured in `docs/master-roadmap.md`.
- Local storage persistence in the browser.

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
