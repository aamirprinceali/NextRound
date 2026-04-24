# Prospect — Ideas Backlog
> All ideas confirmed in conversation with Aamir. Add here after any brainstorm session so nothing gets lost.
> **Rule:** Every idea discussed with Aamir gets logged here before any session ends.

---

## Product Vision (confirmed)
**Core selling point:** Prospect doesn't just help you stay organized — it tells you exactly why you're not getting hired and what to fix. That's the reason people pay.

**Three questions Prospect answers:**
1. Where am I losing? (funnel drop-off)
2. What's actually working? (source, resume version, referral vs cold)
3. What should I do differently? (Job Buddy AI, Phase 17)

---

## Data Points to Capture — Future (don't add to UI yet, too much friction)
These will be added once core flow is solid. Each one feeds the analytics engine.

| Field | Why | When to add |
|---|---|---|
| Company size (startup / mid / enterprise) | Some people crush startups, bomb enterprise | Phase 8 data prep |
| Resume version used | Which version gets callbacks — A/B test your resume | Phase 12 (Resume Vault) |
| Cover letter included | Does it actually help your response rate | Phase 8 data prep |
| Referral vs cold apply | Referrals convert 5-10x better — track it | Phase 8 data prep |
| How early in posting (day 1-3 / week 1 / week 2+) | Early apps get seen more | Phase 8 data prep |
| Interview prep status at time of interview | Did prepping correlate with passing | Phase 8 data prep |
| Time to first response | Fast = hot role, slow = competitive | Auto-calculated from history |
| Rejection reason (when known) | Pattern detection across all rejections | Phase 3B (close-out system) |
| Follow-up sent (yes/no) | Does following up improve conversion for you specifically | Phase 5 (tasks) |

**Note:** Industry and role category were already confirmed for addition soon (not in current build, but on the roadmap).

---

## Email Triage Flow (confirmed — built in current session)
Full 3-bucket inbox with funnel tracking. Details:
- **Submitted** — "Thank you for applying" confirmations. Running total = total apps sent.
- **Next Steps** — Companies showing interest. User decides to Move to Active or Not Interested.
  - Contact info (name, email) stored on queue item
  - When moved to Active, contact auto-populates recruiter field on app
  - Phase 4 (Contacts section): contact will also save to standalone Contacts page
- **Pre-Interview Declines** — Rejection before any screening. Separate from Rejection Center (which tracks post-screening rejections).
- **Funnel bar** shows: Submitted → Next Steps → Active → Closed (all-time totals)

---

## Analytics Engine Vision (confirmed)
Key metrics to surface:
- Response rate (any reply at all)
- Next-steps rate (they're interested)
- Interview conversion rate
- Offer rate
- Ghost rate (no response 30+ days)
- Source effectiveness (LinkedIn vs Indeed vs Referral vs Company Site)
- Time-in-stage averages (where are you stalling)
- Rejection breakdown: pre-interview vs post-interview (completely different problems)
- Resume version performance (Phase 12+)

**Generate Report feature (Phase 16):**
Claude analyzes all data → produces written, personalized report with:
1. Where You Stand
2. Where You're Dropping Off (biggest funnel gap, explained plainly)
3. What's Working
4. Recommendations (based on your actual numbers, not generic tips)
5. This Week's Priority (one thing, not five)

---

## Job Buddy AI Vision (Phase 17)
Proactive coaching based on real data patterns. Not a chatbot — a coach that knows your numbers.
- Pattern alerts ("Your healthcare response rate is half your tech rate")
- Source coaching ("Referrals are converting 4x better — network more")
- Pre-interview coaching ("Your interview at TechCorp is tomorrow — here's what to emphasize")
- Post-rejection analysis ("4 second-round rejections in a row — want to talk about your approach?")
- Weekly digest: where you stand, what's working, one thing to fix

---

## Features Discussed (not yet on roadmap)
- **Follow-up nudges** — "You applied to X 8 days ago and haven't followed up. Apps with a follow-up get 40% more responses." — add to Phase 5 (tasks/next-action)
- **Prep score** — Before each interview, completeness score: research filled in? Questions written? Talking points ready? Track whether prepped interviews convert better over time.
- **Interview velocity** — "Your last 3 companies moved from Applied → Screening in 4 days. This one is 12 days — likely ghosted."
- **Source ROI** — "You've sent 40 apps through LinkedIn. 2 callbacks (5%). 6 referrals got 4 callbacks (67%). Go network."
- **Resume A/B testing** — Tag apps with resume version. See callback rate per version. Real A/B test for your resume.
- **Stale app detection** — Already in Phase 3F plan (health dots). Surface on dashboard too.

---

## AI Buddy Vision (confirmed — 2026-04-23)
AI assistant woven throughout the app, powered by Claude API. Not a chatbot — a coach that knows your full job hunt data.

**Where it lives:**
- **Resume Vault** — helps tailor your resume to a specific job from the Active section. Upload resume → select job → AI generates a tailored version.
- **Interviews page** — generates interview prep questions + answers based on your resume AND the specific job description. "What would they ask me for this role, and how should I answer given my background?"
- **Rejections page** — analyzes your drop-off patterns. "You're losing 80% of apps at the recruiter screen — here's what that usually means and what to try."
- **Dashboard (weekly digest)** — proactive pattern alerts and weekly summary

**Build order note:** Wire the UI stubs first (Phase 9, 15, 17). The AI calls come after Resume Vault is built (needs resume text to be useful). Don't block UI progress waiting for AI.

## Interview Tab Simplification (confirmed — 2026-04-23)
Simplify the Interview tab on each job app detail panel:
- Remove the Q&A / prep questions section from the job tab entirely
- The Interview tab should only have: interview date, round, prep status toggle ("Needs Prep")
- "Needs Prep" toggled on → app appears in Interviews section prep list
- AI generates the actual questions from the Interviews section when user clicks "Prep" on that app
- This keeps the job app detail clean and pushes all prep work to the dedicated Interview Prep page

## Contacts Section (confirmed — build Phase 4)
Full standalone Contacts page. Key behaviors:
- Auto-populated when an app moves from Next Steps to Active (pulls contact info from the queue item)
- Contact tab on each job app: shows added contacts with name/title/email. Clean list with + button to add more. Clicking + opens a contact form modal.
- When closing out an app: "Keep this contact?" prompt → if yes, contact saved to main Contacts page
- Contacts page: search by name, company, role. Contact age shown ("Added 47 days ago").
- Contact survives after the job app is archived

## Scheduling / Availability Email Automation (save for later — confirmed 2026-04-24)
When a recruiter asks "what's your availability?", Prospect should let the user send their availability directly from the app — potentially auto-sending via Gmail once email integration is live. Pairs with the email templates already built. Full vision:
- One-click "Send Availability" from the app's Email tab (template already exists)
- Eventually: when Gmail is connected, send directly without copy/paste
- Future: auto-detect "please share your availability" type emails → surface in Next Steps queue with a pre-filled availability reply ready to send
- Build after Phase 13 (email integration)

## Pipeline Page Note (confirmed — 2026-04-23)
Pipeline feels thin and hard to read right now. Will become more useful once email integration (Phase 13) fills it automatically with many apps. Redesign planned at that point. No changes before then.

---

*Last updated: 2026-04-23*
*Rule: Update this file at end of every session when new ideas are confirmed.*
