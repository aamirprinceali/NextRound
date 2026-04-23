# Prospect — Dev Commands
> Single source of truth. Always update this file when anything changes about how to run the project.

---

## Start the app

```bash
cd ~/Desktop/dev/NextRound
npm run dev
```

Then open: **http://localhost:5174**

Port 5174 is fixed in `vite.config.ts` — it will always be this URL.  
If it fails to start, something else is using 5174. Run `lsof -i :5174` to see what's on it.

---

## Branch

```bash
git branch --show-current   # should say: prospect/redesign
git checkout prospect/redesign  # if you're on the wrong branch
```

---

## GitHub

```bash
# Push after every build
git add -p
git commit -m "feat: description"
git push origin prospect/redesign
```

Repo: https://github.com/aamirprinceali/NextRound.git

---

## Install dependencies (first time or after pulling)

```bash
npm install
```

---

## Other commands

| Command | What it does |
|---|---|
| `npm run dev` | Start local dev server → http://localhost:5174 |
| `npm run build` | Build for production (outputs to `/dist`) |
| `npm run preview` | Preview the production build locally |
| `npx tsc --noEmit` | Type-check without building (run before committing) |

---

## Stack (quick reference)

| Layer | Tool |
|---|---|
| Framework | React 19 + TypeScript + Vite |
| Styling | Raw CSS with design tokens (NOT Tailwind on this project) |
| Animation | Framer Motion |
| Icons | Lucide React |
| Charts | Recharts |
| Data | localStorage (no backend yet) |
| AI (planned) | Claude API (claude-sonnet-4-6) |
| Backend (planned) | Supabase |

---

*Update this file any time the port, branch, or setup steps change.*
