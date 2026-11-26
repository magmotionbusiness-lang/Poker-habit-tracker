# Content guide (for Nelson & Máté)

All words Nelson may want to change live in a handful of files — no component code to touch.
Edit on GitHub (pencil icon) → commit → Vercel redeploys in ~1 minute.

| What                                                                                  | File                               |
| ------------------------------------------------------------------------------------- | ---------------------------------- |
| App name, tagline, coach name, site link, pillars, cohort size                        | `src/config/brand.ts`              |
| Welcome screen, tab names, quick-add labels, empty states, install steps, 18+ notice  | `src/content/copy.ts`              |
| Cohort phases (Engine → Scaling): taglines, lessons, practicals, ™ tools              | `src/content/program.ts`           |
| Onboarding: step titles, formats, stake suggestions, goal options, email consent text | `src/content/onboarding.ts`        |
| Preset habits: names, hints, default targets, which are recommended                   | `src/content/habits.ts`            |
| Stats wording: small-sample warnings, the “C-game vs A-game” insight sentence         | `src/content/copy.ts` → `stats`    |
| Hand review steps (Preflop → … → The rule) and rule categories                        | `src/content/review.ts`            |
| Hand tags (Mistake, Cooler…), smart list names, section icons                         | `src/content/hands.ts`             |
| Reminder notification text                                                            | `src/content/notifications.ts`     |
| Legal templates (privacy, terms, responsible gaming)                                  | `src/app/legal/[slug]/page.tsx`    |
| Brand assets (logo files)                                                             | `public/brand/` (see README there) |

Coming in later phases (same principle — one file or an admin screen):

- Nudge texts, announcement defaults, prices (Free vs Pro) — Phase 3/5, editable from the admin panel
- `coach-principles.md` — the AI coach's grounding document — Phase 4

## Voice

Direct, confident, coach-like. Short sentences. _“Not more content. A system.”_
Never gambling hype (“win big”, “guaranteed profit”). Profit claims always framed as goals, not promises.

## Sign-off checklist — TODO(nelson)

- [ ] Program copy in `program.ts` (copied from upthestakes.net on 2026-11-26)
- [ ] Use of “Up The Stakes™”, the ™ framework names and the logo inside the app
- [ ] The default goal wording “Make my first $50k from poker”
- [ ] Official logo files in `public/brand/`
- [ ] Email opt-in consent text (`onboarding.ts → emailConsent`) — legal wording for the EU
- [ ] Preset habit names and the reminder notification wording
