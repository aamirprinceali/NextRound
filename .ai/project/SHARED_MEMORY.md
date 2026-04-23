# Prospect — Shared Memory
> Shared source of truth between Claude and Codex. Update at end of every session.

## App Identity
- **Name:** Prospect (was NextRound)
- **Tagline:** Job Hunt HQ
- **Branch:** `prospect/redesign`
- **Run:** `cd ~/Desktop/dev/NextRound && npm run dev` → http://localhost:5174
- **GitHub:** https://github.com/aamirprinceali/NextRound.git

## Vision (3 layers)
1. **Organization** — stay on top of every active application
2. **Analytics** — funnel drop-off analysis, know where you're losing
3. **Intelligence** — Job Buddy AI coaching based on real patterns (Phase 17)

## Stack
- React 19 + TypeScript + Vite
- Raw CSS with CSS custom property design tokens (NOT Tailwind on this project)
- Framer Motion (animations)
- Lucide React (icons)
- Recharts (charts)
- localStorage only (no backend yet)

## Design Tokens (locked)
- Background: `#08090D`, Surface: `#10111A`, Surface 2: `#171825`
- Brand jade: `#7EE8A2`, Gold: `#FBBF24`, Danger: `#F87171`, Warning: `#FB923C`
- Display: Bricolage Grotesque, Body: DM Sans

## Completed Phases
- Phase 1: Foundation (design system, types, utils)
- Phase 2: All core screens
- Phase 3 (partial): Lock In rename done, bug fix + full upgrade pending
- Phase 9: Calendar View complete
- Prep Room: complete

## Next Build: Phase 3
3A: Stage selector bug fix → 3B: Close-Out System → 3C: Contact Tab → 3D: Quick Add → 3E: Stage Additions → 3F: Active Upgrade → 3G: Pipeline Drag

## localStorage Keys
- `nextround-applications` — all apps (legacy key, still in use)
- `nextround-queue` — inbox queue
- `nextround-hunt-session` — current hunt session
- `nextround-settings` — user settings
- `prospect-common-responses` — response library (PrepRoom)
- `prospect-lock-in-sessions` — Lock In logs
- `prospect-contacts` — contacts (Phase 4, not built yet)
- `prospect-tasks` — tasks (Phase 5, not built yet)

## Key Architecture Notes
- DropdownPortal: uses createPortal to render stage selector at document.body (escapes overflow:hidden)
- All views in App.tsx via useState<View> — view routing is conditional rendering
- `history[]` on each app tracks all stage changes with timestamps — powers analytics later
- selectedAppId + DetailPanel: slide-over panel on right side
- PrepRoom: `view === 'prep-room'` + selectedApp required

## Important Future Data Fields (add to apps soon)
- `industry` — Tech / Healthcare / Finance / Sales / Operations / Other
- `roleCategory` — broad role type
- `coverLetterIncluded` — boolean
- These power the Phase 16 analytics engine
