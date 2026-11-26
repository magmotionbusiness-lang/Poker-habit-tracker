# BUILD PROMPT — "Stakers" (working name): the Up The Stakes poker habit & bankroll tracker

> Original product spec, design system and build plan from Máté (2026-11-26), kept verbatim
> as the source of truth (Markdown formatting normalised by Prettier). Decisions that refine or deviate from it are logged in `/DECISIONS.md`.

---

## 0. Who you're building for and why

I'm Máté, a freelance video editor and content strategist. My main client is **Nelson Dong**, a poker coach who runs **Up The Stakes™** (upthestakes.net): a live, intensive **6-week cohort program** (capped at 20 spots per cohort, waitlist between cohorts), an alumni program called **Stakers Club**, free video workshops (e.g. "The Blueprint"), and a big Instagram audience. His promise is _"I help you make your first $50k from poker."_ His three pillars are **action, structure and accountability**. His core message is that most players don't need bigger stakes, longer hours or another course — they need **a system**, and they need to _learn how to learn poker_: review their own hands, find their leaks and fix them.

This app is that system in your pocket. It has two jobs, and both matter equally:

1. **Be a genuinely great standalone product** — a poker habit tracker + bankroll tracker + hand journal/replayer that a player would use daily even if they'd never heard of Nelson, and that can grow into a paying business (free + Pro).
2. **Be the best top-of-funnel and retention asset Nelson's business has** — every screen should quietly reinforce his teaching, and the app should move users toward his email list, his free workshops and the cohort waitlist, and keep alumni engaged after the cohort ends.

Working name: **Stakers** (ties to "Stakers Club" and "Up The Stakes"). Keep the app name, tagline and all Nelson-specific copy in a single config file so it can be renamed without touching components.

**Target user:** a recreational-to-semi-pro player (live cash, live MTTs, online cash/MTT), roughly $1/2–$5/10 live or NL10–NL200 online, who is motivated but unstructured — the exact person in Nelson's testimonials ("struggling at 25NL", "$2/3 grinder", "pub poker grinder", "almost quit").

---

## 1. Before you write code

1. **Pull the exact brand tokens from the live site.** Fetch `https://upthestakes.net/` and its CSS bundles and extract the real `font-family` declarations, font files/sources, and colour values. My visual read is below (section 5) — treat it as the fallback and correct it with whatever you find. Note in particular: the big headlines are a **bold, tight, high-contrast serif**, and the body/UI text is a **clean grotesk sans (looks like Inter)**. Find the actual names. If the serif is a licensed font we can't use, pick the closest free Google Font (candidates: Instrument Serif, Fraunces, Playfair Display, Newsreader) and tell me which one and why.
2. **Brand assets:** the logo lives at `https://upthestakes.net/brand/logo.webp` (circular "UTS" mark + "Up The Stakes" wordmark). Don't hotlink it in production — put a placeholder in `/public/brand/` and leave a TODO; I'll drop in the official files from Nelson.
3. **Ask me** before building if anything in this doc contradicts itself. Otherwise make sensible defaults, write them down in `DECISIONS.md`, and keep going.
4. **I build and test from an iPhone and iPad**, so every phase must end with a working **Vercel preview URL** I can open on my phone and "Add to Home Screen".

---

## 2. Tech stack (keep it cheap — free tiers everywhere at launch)

- **Next.js (App Router) + TypeScript (strict) + Tailwind CSS**, components built on **shadcn/ui** (restyled to our tokens — it must not look like default shadcn).
- **Supabase** (free tier): Postgres, Auth (email magic link + Google + Apple sign-in), Storage (hand history files, avatars), Row Level Security on every table.
- **Vercel** for hosting (preview deployment per branch/PR), **GitHub** repo with a clean commit history (one feature per commit, conventional commit messages, PR per phase).
- **PWA**: installable, offline-capable for logging (queue writes when offline, sync when back), proper icons/splash screens, `display: standalone`, iOS safe-area handling. **Web Push** notifications (works on iOS 16.4+ when the app is installed to the home screen) — show the user a friendly "install to get reminders" explainer on iOS.
- **Charts:** Recharts or visx, restyled to the design system.
- **Animation:** Framer Motion (subtle; respect `prefers-reduced-motion`).
- **Validation:** Zod for every form and every API boundary.
- **Poker logic:** use `@poker-apprentice/hand-history-parser` (TypeScript, MIT) for importing online hand histories — verify the licence and supported sites when you install it; wrap it behind our own interface so it can be swapped. Store hands internally in a normalised JSON shape modelled on the **Open Hand History (OHH)** standard so imports, manual entry and the replayer all share one format. Use a well-maintained hand evaluator / equity library for showdown hand names and all-in equity (pick one, justify it in `DECISIONS.md`).
- **AI (Phase 4, optional and swappable):** provider-agnostic wrapper. Default to a free/cheap model (Gemini free tier) for development; must be switchable to Claude via env var. Never block core features on AI.
- **Email list:** provider-agnostic. Build an `EmailProvider` interface with adapters for **Kit (ConvertKit)**, **Mailchimp** and a generic **webhook** (Zapier/Make). Nelson's actual provider is TBD — the active adapter is chosen by env var.
- **Payments (Phase 5):** Stripe Checkout + Customer Portal for Pro. Build the entitlement logic early (a `plan` field + feature flags) so Pro gating is trivial later.
- **Analytics:** privacy-friendly (Vercel Analytics or PostHog free tier) with UTM capture on signup so we can prove how many waitlist/email leads the app sends Nelson.
- **Testing:** Vitest for all stats maths, bankroll maths, streak logic and parsers (these must be correct — money is involved); Playwright smoke tests for the main flows.

---

## 3. What I learned from the competition (build on these, beat these)

| App                                                      | What it does best — steal this                                                                                                                                                                                              | Where it falls short — our opening                                                               |
| -------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ |
| **Poker Bankroll Tracker**                               | All-in-one: session tracking, live chip graph, hand replayer that supports bomb pots/straddles/run-it-twice, friends watching sessions live, 40+ currencies, CSV import from other trackers, offline use without an account | Utilitarian UI, no habit/study layer, no coaching philosophy behind it                           |
| **Pokerbase**                                            | Live tournament focus, real-time updates for stakers/backers, receipts, tax-ready reports, imports from other apps                                                                                                          | Features moved behind paywall → user resentment. Lesson: be generous and clear about what's free |
| **Nash Bankroll**                                        | One-tap session start from saved shortcuts, widgets, multiple bankrolls, receipts, CSV export                                                                                                                               | No study/review loop                                                                             |
| **Poker Analytics 6**                                    | Deep filtering, variance simulator & risk of ruin, _"stop playing, you're getting tired"_ notifications based on your own history                                                                                           | Some users report weak analysis and painful data migration                                       |
| **StackTracker**                                         | Speed ("track a session in seconds"), dark UI built for poker rooms, AI coach on your own stats, **Daily Hand quiz with streaks and leaderboard**, web + iOS + Android sync                                                 | Shallow on hand review                                                                           |
| **HandRecorder / Poker Hand History Notes / GrindStack** | Ultra-fast live hand entry (seconds), timeline replay, opponent notes, AI hand analysis                                                                                                                                     | Hand logging is isolated from bankroll and habits                                                |
| **GTO Wizard Analyzer**                                  | Upload online HHs → filters by preflop action, position, street; saved reports; EV/mistake surfacing                                                                                                                        | Expensive and overwhelming for our target user; desktop-first                                    |
| **Left Pocket / Poker Note+**                            | Clean, modern, mobile-first design; calendar views; expenses (tips, travel)                                                                                                                                                 | Basic analytics                                                                                  |
| **Duolingo (streaks)**                                   | Streak is built into the core loop, low-effort daily action, milestone celebrations, **streak freeze** (reduced churn for at-risk users), copy like "commit to my goal"                                                     | Streak pressure can become a chore; a lost long streak is a churn point → we design for "grace"  |
| **Streaks / Habitify / GitHub contributions**            | Ring/heatmap visuals that make consistency visible at a glance                                                                                                                                                              | Generic — no domain meaning                                                                      |

**Our edge in one sentence:** _the only poker tracker built around a coach's system — it doesn't just record results, it runs the habit loop (play → tag → review → write the rule → apply next session) that Nelson teaches, and makes progress toward a real money goal visible every day._

---

## 4. Product: features in detail

Bottom tab navigation (mobile-first), 5 tabs: **Today · Bankroll · Hands · Progress · More**. A floating "+" action (center or bottom-right) opens a quick-add sheet: _Start session · Log finished session · Log a hand · Log study · Add transaction_.

### 4.1 Onboarding (≤ 60 seconds, skippable steps)

1. Welcome screen in brand style: big serif headline ("Build the system. Up the stakes."), short sub line.
2. Formats you play (multi-select): Live cash · Live MTT · Online cash · Online MTT · Home games. Games: NLHE (default), PLO, other.
3. Your current stakes + default currency (detect from locale; any currency; per-session currency allowed).
4. Starting bankroll (or skip).
5. **Pick your main goal** — default suggestion: **"Make my first $50k from poker"** (Nelson's flagship promise); alternatives: reach a bankroll of X, move up to stake Y, profit X per month, study X hours per week, custom.
6. **Pick your daily habits** from presets (section 4.5) — 3 recommended pre-selected.
7. Reminder time(s) + notification permission (with iOS install explainer).
8. Optional: "Are you an Up The Stakes student or alumni?" → enter code → unlocks Pro + alumni badge (see 4.9).
9. Optional: "Get Nelson's free training" email opt-in with **separate, unticked** consent checkbox (GDPR — I'm in the EU).

Guest mode: allow using the app without an account (local storage), then prompt to create an account to sync/back up after the first session is logged. Migrate local data on signup.

### 4.2 Today (the home screen — the habit loop lives here)

- Greeting + **streak flame** with current streak count; tap → streak details.
- **Today's habits** as tappable check items / progress rings (e.g. "Review 3 hands 1/3", "Study 30 min 12/30", "Pre-session warm-up ✓").
- **Main goal card**: progress bar toward the goal (e.g. $50k profit: $12,480 / $50,000 — 25%), projected date at current pace, small sparkline.
- **Review queue card**: "5 hands waiting for review" → opens the queue (Nelson's "Forgetting the hand → reviewing it").
- **Rule of the day**: one of the user's own written rules/lessons (from hand reviews) resurfaced spaced-repetition style.
- **Active session** banner if a session is running (timer, current stack, quick "update stack" / "log hand").
- **Up The Stakes announcement slot** (section 4.8) — countdown card when a cohort/workshop is approaching.
- Optional **Daily Hand**: one spot per day (multiple choice), with explanation; separate small streak + optional leaderboard. Content authored by Nelson/me via the admin panel (seed with 30 example spots marked as placeholders for Nelson to approve).

### 4.3 Sessions & bankroll

**Session fields:** format (cash/MTT/SNG/spin), live/online, game, stakes or buy-in, venue/site (saved list with optional photo), start/end time (or duration), buy-in, rebuys/add-ons, cash-out / prize, finishing position & field size (MTT), bounties, rake/fees, tips & expenses (food, travel, hotel), hands played (online), currency, bankroll it belongs to, tags, notes, **mental-game ratings** (focus 1–5, tilt 1–5, A/B/C-game self-rating, energy, sleep the night before), and links to hands logged in that session.

**Live session mode:** one-tap start from **saved shortcuts** ("Crown $2/3", "GG NL50 Rush"), running timer that survives app close/reload, **add-ons and stack updates in two taps** → live chip graph, quick hand logging, end session → post-session cool-down flow (4.6).

**Bankroll:**

- Multiple bankrolls (e.g. Live, Online, Shared); deposits/withdrawals/transfers; **all amounts stored as integer minor units + currency code**; historical FX rates for conversion into the display currency (cache rates daily; store the rate used on each session).
- Bankroll graph (cumulative, with deposits/withdrawals visually distinguished from results), calendar heatmap of win/loss days, monthly bar chart.
- **Stats** (with filters by date range, format, game, stakes, venue, day of week, time of day, session length, tags, mental-game rating): net profit, hourly, # sessions, win rate %, biggest win/loss, BB/hr (live cash), BB/100 (online with hand counts), ROI, ITM %, average finish, average buy-in (MTT), standard deviation. Clearly label small-sample results ("only 6 sessions — this tells you very little yet").
- **"What's working" insights**: best/worst stakes, venues, formats, session lengths, days; correlation between mental-game ratings and results (e.g. "Your C-game sessions lose $41/hr; A-game sessions win $28/hr" — this is gold for Nelson's mindset content).
- **Stake ladder** (signature feature — the name of the brand is literally "Up The Stakes"): user sets a bankroll-management rule (presets: conservative/standard/aggressive, e.g. X buy-ins for cash, Y for MTTs; fully editable). Visual ladder shows current stake, buy-ins available, and exactly how much more is needed to **move up** — plus a **move-down / shot-taking** rule. Celebrate moving up a rung.
- **Variance simulator & risk of ruin** (Pro): given win rate, std dev and bankroll — show possible outcome bands, helps users stop "blaming variance" and understand it.
- **Stop-loss & tilt guardrails**: optional per-session stop-loss and max session length; gentle notification when hit, and a nudge when the user's own data shows results drop after N hours.
- Import: CSV from other trackers (Poker Bankroll Tracker, Pokerbase, Poker Income, Poker Analytics, generic spreadsheet) with a column-mapping step. Export: CSV + a printable yearly summary (useful for taxes — label as not tax advice).

### 4.4 Hands: journal, auto-sorting, replayer

This is the heart of "learn how to learn poker."

**Three ways in:**

1. **Import online hand histories** — paste text or upload `.txt`/`.zip` files (PokerStars, GGPoker, 888, Ignition, etc. — whatever the parser supports; show a clear "supported sites" list and a friendly error for unsupported formats). De-duplicate by hand ID. Handle big files in a Web Worker so the UI never freezes; show progress.
2. **Fast manual entry for live hands** — a purpose-built poker keyboard: pick positions & stacks (remembered from last hand), tap hole cards from a compact card picker, then each street's actions as big buttons (fold/check/call/bet/raise/all-in) with smart bet-size chips (⅓, ½, ⅔, pot, 2.5x, custom). Target: a typical hand logged in **under 20 seconds**. Support straddles, bomb pots, run-it-twice, antes, multiway.
3. **Quick note** — when there's no time: "AKo, 3-bet pot, lost big on river, check later" + optional voice note (transcribed later, Phase 4) → goes to the review queue as an "incomplete hand" the user can flesh out after the session.

**Auto-sorting (computed on save, re-computable):** every hand gets automatic tags when data allows: won / lost / chopped, net result in BB and money, pot size bucket, **biggest pots**, position (UTG…BB), hero's hole-card category (pairs, suited broadways, suited connectors…), preflop pot type (limped, single-raised, 3-bet, 4-bet+), heads-up vs **multiway**, street reached, went to showdown / won at showdown / won without showdown, all-in (with all-in EV vs actual result where equity is computable), hero was aggressor/caller, flop texture (monotone, paired, connected, high/low).

**Lists & filters:** smart lists out of the box — _Biggest wins · Biggest losses · Unreviewed · Coolers · Multiway pots · 3-bet pots · All-ins · Marked as mistakes · Starred_ — plus a full filter builder on any auto/user tag, and saved custom lists.

**User tags:** Mistake · Good fold · Hero call · Bluff caught · Bluff worked · Cooler · Tilt hand · Ask a coach · Study later — editable list.

**Replayer:**

- A beautiful, minimal poker table (top-down oval, felt in the brand's deep navy/violet, not casino green) with seats, stacks, bets in front of players, pot in the middle, board cards dealt street by street, hero's cards always visible, villains' cards revealed at showdown if known.
- Controls: play/pause, step forward/back action by action, jump to street, speed control, scrub bar with street markers.
- Side panel / bottom sheet: action log, pot odds and SPR at each decision, stack-to-pot ratio, effective stacks, hand strength label (e.g. "Top pair, good kicker"), all-in equity where possible.
- Displays in BB or money (toggle). Works landscape and portrait.
- **Share**: generate a clean share link (public read-only, user-controlled, revocable) and a **vertical image/video-friendly card** of the hand — great for sending to a study group or to Nelson's Q&A sessions.

**Review flow (the habit that matters most):** each hand has a review status: _Unreviewed → Reviewed → Lesson written._ The review screen is a guided template, street by street, built on Nelson's teaching sequence (keep the labels in the config file so Nelson can rename them):

- _Preflop_ — was the open/3-bet/call in line with my ranges?
- _Flop_ — what's my plan and why? (range/nut advantage, value vs bluff)
- _Turn & river_ — did the line connect street by street? (bridging the streets)
- _Opponent_ — what profile was villain, and did I exploit it?
- _Multiway_ — if multiway, did I adjust?
- _Mental state_ — was I tilted, tired, distracted?
- **The rule** — "Next time in this spot I will…" (required to reach _Lesson written_).

Rules/lessons are collected into a **Leak Book**: grouped by category (preflop, postflop streets, exploitative play, multiway, mental game, bankroll), each with linked example hands and a counter of how often the leak shows up. Leaks can be marked _Working on it → Fixed_. Rules resurface on the Today screen and in the pre-session warm-up.

**Opponent notes (live players):** quick player profiles (nickname, venue, seat description, tags like "station", "nit", "maniac", "reg", free notes), linkable to hands.

### 4.5 Habits & streaks

**Preset habits** (each with a measurable target; users can add custom ones, rename, reorder, set which days of the week they apply):

- Review hands (count, default 3/day)
- Study (minutes; with a built-in study timer and a "what I studied" note: solver work, course video, range drilling, hand review, group study, coaching call)
- Pre-session warm-up completed
- Post-session cool-down completed
- Log every session (auto-completed by logging)
- Daily Hand answered
- Optional lifestyle habits poker coaches talk about: sleep, gym, no alcohol at the table, meditation — off by default

**Streak rules (humane, Duolingo-informed):**

- A day counts if the user hits their **minimum daily commitment** (they define it — e.g. "at least 1 habit" or "all habits").
- **Planned rest days** (chosen weekdays) never break a streak.
- **Streak freezes**: earn 1 freeze per 7-day streak, hold max 2 (Pro: max 5). Auto-used on a missed day, with a notification the next morning.
- **Repair**: if a streak breaks, offer a one-time "repair within 48h by doing double tomorrow" challenge instead of a blank reset.
- Track **longest streak** forever, plus total active days — so a broken streak never feels like "everything's gone."
- Multiple streak types: overall, study streak, review streak, Daily Hand streak.
- Milestones at 3, 7, 14, 30, 50, 100, 200, 365 days with a tasteful celebration (violet glow, confetti-lite, haptic on supported devices).

**Visuals:** GitHub-style yearly heatmap (violet intensity scale), weekly rings, month calendar.

### 4.6 Session routines (structure + accountability)

- **Pre-session warm-up** (≈2 min): today's focus point (pick from Leak Book or type), mental check-in (energy/mood/sleep), stop-loss and max length for today, 1–3 rules resurfaced from the Leak Book.
- **Post-session cool-down** (≈2 min): result, A/B/C self-rating, tilt rating, "did I follow my focus point?", tag the hands I want to review (sends them to the queue), one-line takeaway.
- Both are optional but tied to habits/streaks.

### 4.7 Goals & progress

- Goal types: profit target (lifetime or period), bankroll target (e.g. **reach $10k bankroll**), stake target (e.g. "play $2/5 by June"), volume (hours/sessions/hands), study hours, hands reviewed, custom. Deadline optional.
- Each goal: progress bar, pace line vs. required pace, projected completion date, history.
- **Progress tab:** goals, streak heatmap, stake ladder, bankroll graph, weekly/monthly report card (sessions, hours, profit, hourly, study time, hands reviewed, rules written, best decision of the week).
- **Weekly Review** (every Sunday, notification): an auto-generated summary + three prompts ("What went well? Biggest leak this week? Focus for next week?"). In Phase 4 the AI writes the first draft.
- **Shareable milestone cards** (big growth lever for Nelson): when a user hits a milestone (first $1k/$5k/$10k/$50k profit, moved up a stake, 30-day streak, 100 hands reviewed), offer a beautiful **1080×1920 story card** and a **1080×1350 post card** in the brand style with a subtle "Tracked with Stakers · by Up The Stakes" mark and the user's handle. Users can hide exact amounts (show % or "milestone reached" only). This turns users into organic Instagram promotion — the same "student wins" social proof Nelson already uses.

### 4.8 Up The Stakes hub (the business layer — tasteful, never spammy)

Place this in **More → Up The Stakes**, plus contextual slots on Today.

- **About Nelson & the program**: short bio, the 6-week cohort structure as five swipeable phase cards (Engine · Foundation · Bridging · Execution · Scaling — mirror the flip-card design on his site), what's included, student results ticker. All copy loaded from a CMS-like content file/table so Nelson can update it.
- **Join the waitlist**: name, email, Instagram handle (same fields as his site) with explicit consent text; posts to the email provider adapter and tags the lead with `source=app` + UTM.
- **Email list signup** in onboarding and settings ("Get Nelson's free training"), separate consent.
- **Announcements & countdowns**: admin-created events with types _Cohort opening · Cohort closing · Free workshop/webinar · Live Q&A · New content · Promo_. Each has title, description, image, start time (stored UTC, shown in user's time zone), end time, CTA label + URL, audience (everyone / non-students / students / alumni / specific cohort), and priority.
  - Shows as a **countdown card** on Today ("Cohort 7 opens in 2d 14h 03m"), an optional one-time **full-screen modal** for high-priority events (dismissible, never shown twice), and **push notifications** at configurable offsets (e.g. 24h, 1h, "live now").
  - Users can control these in Settings → Notifications (separate toggles for reminders vs. Up The Stakes news). Respect quiet hours.
- **Contextual nudges** (rate-limited, max ~1/week, dismissible forever): e.g. after a user writes their 10th rule → "You're doing what Nelson's students do. See how the cohort works →"; after a big losing week → mindset resource, not a sales pitch.
- **Free resources**: links to Nelson's YouTube/IG/workshops, embedded where allowed.

### 4.9 Students & alumni mode

- Redeemable **access codes** (per cohort) → Pro unlocked for the cohort duration + N months, a "UTS Cohort 7" badge, access to a **cohort leaderboard/accountability board** (opt-in: streaks, hands reviewed, study hours — **never** money amounts unless the user explicitly chooses).
- **Coach view (later phase):** a student can share a read-only dashboard or specific hands/Leak Book with Nelson or a coach via a link, so homework and Q&A prep happen inside the app. This makes the app part of the cohort's workflow, which is the strongest possible retention.
- Stakers Club alumni get their own announcement audience.

### 4.10 AI coach (Phase 4 — optional, cheap, clearly labelled)

- **Hand review assistant**: given a hand (OHH JSON) + the user's notes, ask guiding questions in Nelson's review sequence and suggest a draft "rule" — Socratic first, not answer-dumping (Nelson's whole thing is understanding the _why_).
- **Weekly review draft** from the user's stats, ratings and notes.
- **Leak pattern detection** across reviewed hands and tags ("8 of your 12 biggest losses this month were multiway pots out of position").
- Label it **"AI coach"** — it must **never** present itself as Nelson or speak in his voice unless Nelson has approved a style guide. System prompt grounded in a `coach-principles.md` file Nelson can edit. Add a disclaimer: educational only, not financial or gambling advice. Rate-limit by plan; cache results.

### 4.11 Settings & the rest

Profile, currency & BB/money display, bankroll rules, habits, reminders & quiet hours, notification categories, connected email list status, import/export, **delete account & all data** (real deletion), data export (JSON + CSV), theme (dark default; a light "paper" theme later), responsible-gaming section (session limits, self-exclusion reminder toggle, links to support organisations, 18+ notice), privacy policy, terms, app version.

### 4.12 Admin panel (for Nelson and me)

Protected route (`role = admin`): manage announcements/events, Daily Hand content, program content/copy, access codes, view anonymised aggregate stats (DAU/WAU, streak distribution, retention by cohort), **lead export** (waitlist + email opt-ins, with source/UTM), and broadcast push notifications to an audience.

---

## 5. Design system (match Up The Stakes — premium, dark, calm, violet)

Mood: **a private members' club at night.** Deep near-black navy, soft violet glow, crisp white serif headlines, quiet grey sans body. Clean, lots of breathing room, never "casino" (no green felt, no neon, no chip clip-art clutter). Think Linear/Revolut-level polish with Nelson's brand.

**Colours sampled from upthestakes.net (verify against the CSS, section 1):**

| Token           | Hex (sampled)                                                  | Use                                                 |
| --------------- | -------------------------------------------------------------- | --------------------------------------------------- |
| `bg`            | `#06060D`                                                      | app background                                      |
| `bg-elevated`   | `#0B0B14`                                                      | header/nav bars (also the site's `theme-color`)     |
| `surface`       | `#0F0F18` (approx.)                                            | cards                                               |
| `surface-input` | `#16161F`                                                      | inputs, list rows                                   |
| `border`        | violet at ~20–30% opacity on surfaces                          | 1px card borders                                    |
| `primary`       | `#7A5AFE` → `#5E40E7`                                          | primary buttons as a left→right gradient            |
| `primary-mid`   | `#6847F0`                                                      | solid primary, active states, focus rings           |
| `accent-light`  | `#BBA9FF` → `#A48DFF`                                          | gradient headline words, eyebrow labels, highlights |
| `pill-bg`       | `#1E1941`                                                      | badges/pills behind lavender text                   |
| `ink`           | `#FFFFFF`                                                      | headlines                                           |
| `ink-muted`     | neutral grey ~`#A1A1AA`                                        | body copy                                           |
| `ink-subtle`    | ~`#71717A`                                                     | captions                                            |
| `danger`        | soft red (site uses red ✕ icons in dark red circles)           | losses, errors                                      |
| `success`       | define a restrained emerald/mint that sits well next to violet | profits, completed habits                           |

Rules: profit/loss colours are used **only** for money and results, never decoratively. Background has a very subtle radial violet glow behind hero areas (as on the site). Primary buttons and key cards get a soft violet outer glow (`box-shadow` with primary at low opacity). Check WCAG AA contrast for all text tokens and adjust `ink-muted` if needed.

**Typography:**

- **Display / headlines:** the site's bold high-contrast serif (verify name), tight letter-spacing (-1% to -2%), used for screen titles, big numbers on goal cards, celebration screens. Two-tone headlines like the site: first part white, key phrase in the lavender→violet gradient (e.g. "Make your first **$50k from poker**").
- **UI / body:** Inter (or whatever the site actually uses) — 15–16px base on mobile.
- **Eyebrow labels:** 11–12px, uppercase, letter-spacing ~0.12em, lavender (like "SECURE YOUR SPOT" / "THE REAL PROBLEM" on the site).
- **Numbers:** `font-variant-numeric: tabular-nums` everywhere money, stats, timers and counters appear.
- Load fonts with `next/font` (self-hosted, no layout shift).

**Components & layout:**

- Radius: 16–20px cards, 12px inputs, full-pill badges and segmented controls. Inputs with a leading icon (as in the site's waitlist form).
- Pill badge with a small dot for status ("● COHORT 7 WAITLIST OPEN").
- Bottom tab bar with blurred translucent background; large touch targets (≥44px); one-handed use; haptics where supported.
- Cards: title row (eyebrow + action), big number, supporting line, optional sparkline.
- Empty states that teach (e.g. Hands empty state: "Your edge is hiding in your own hands. Log your first one →").
- Skeleton loaders, optimistic updates, toasts in the "Notifications" region style of the site.
- Icons: one consistent line icon set (Lucide), 1.5px stroke.
- Playing cards: custom minimal card faces (rank + suit, four-colour deck option for clarity), designed in the system — not stock casino art.
- Motion: 150–250ms ease-out; number count-ups on stats; gentle spring on streak flame; no gratuitous animation.
- Copy voice: direct, confident, coach-like, short sentences ("Not more content. A system."). Avoid gambling hype ("win big!") entirely.

Deliver a `/design` route (dev-only) that renders every token and component, so I can review the look on my phone before features are built.

---

## 6. Data model (Supabase / Postgres — adjust as needed, document changes)

- `profiles` (id → auth.users, display_name, handle, avatar_url, country, default_currency, display_mode bb|money, timezone, plan free|pro, role user|admin, uts_status none|student|alumni, cohort_id, onboarding_done, created_at)
- `bankrolls` (id, user_id, name, currency, archived)
- `transactions` (id, bankroll_id, type deposit|withdrawal|transfer|adjustment, amount_minor, currency, fx_rate_to_display, note, occurred_at)
- `venues` (id, user_id, name, type live|online, location, photo_url)
- `session_shortcuts` (id, user_id, label, preset json)
- `sessions` (id, user_id, bankroll_id, venue_id, format, is_live, game, stakes_sb, stakes_bb, straddle, buy_in_minor, rebuys_minor, cash_out_minor, prize_minor, bounties_minor, fees_minor, expenses json, currency, fx_rate, started_at, ended_at, paused_ms, hands_played, finish_position, field_size, focus/tilt/energy/sleep ratings, game_rating A|B|C, focus_point, takeaway, notes, tags[], status running|finished)
- `stack_updates` (id, session_id, stack_minor, at)
- `hands` (id, user_id, session_id, source import|manual|quick_note, site, external_hand_id (unique per user+site), played_at, game, stakes, hero_position, hero_cards, ohh json, net_minor, net_bb, pot_bb, auto_tags[], user_tags[], starred, review_status unreviewed|reviewed|lesson, review json, share_slug, is_public)
- `rules` / Leak Book (id, user_id, category, text, status working|fixed, times_seen, last_surfaced_at)
- `rule_hands` (rule_id, hand_id)
- `opponents` (id, user_id, nickname, venue_id, description, tags[], notes) + `hand_opponents`
- `habits` (id, user_id, kind preset|custom, key, name, target_value, unit, days_of_week, sort_order, active)
- `habit_logs` (id, habit_id, date (user-local), value, source manual|auto)
- `study_sessions` (id, user_id, started_at, minutes, category, note)
- `streak_state` (user_id, streak_type, current, longest, freezes_available, last_counted_date, rest_days)
- `goals` (id, user_id, type, target_value, currency, unit, start_value, deadline, status, created_at)
- `daily_hands` (id, date, spot json, options json, answer, explanation, author, approved) + `daily_hand_answers`
- `announcements` (id, type, title, body, image_url, starts_at, ends_at, cta_label, cta_url, audience, priority, push_offsets[], published)
- `announcement_views` (user_id, announcement_id, seen_at, dismissed, clicked)
- `access_codes` (code, cohort_id, grants_plan, expires_at, max_uses, uses) + `cohorts` (id, name, starts_at, ends_at)
- `leads` (id, user_id null, name, email, instagram, list waitlist|newsletter, consent_text, consented_at, utm json, synced_to_provider_at)
- `push_subscriptions` (id, user_id, endpoint, keys, user_agent, categories[])
- `notification_prefs`, `feature_flags`, `audit_log` (admin actions)

RLS: users read/write only their own rows; public hand shares readable only via `share_slug` when `is_public`; admin role for admin tables. All money as integers. All timestamps UTC; habit "days" computed in the user's timezone (handle travel/DST correctly — test it).

---

## 7. Build phases (each ends with a deployed Vercel preview + a short changelog in the PR)

**Phase 0 — Foundation (1st session)**
Repo, Next.js + TS strict + Tailwind + shadcn, ESLint/Prettier, Vitest, Playwright, Supabase project wiring + migrations folder, env var schema (Zod), PWA manifest + service worker, `next/font` brand fonts, design tokens, `/design` showcase route, app shell with bottom tabs and the "+" sheet, auth (magic link + Google; Apple later), guest mode with local storage. `README.md` (setup, env vars, deploy), `DECISIONS.md`, `CONTENT.md` (all Nelson-editable copy lives in one place).

**Phase 1 — Core tracker MVP**
Onboarding, bankrolls & transactions, session logging (finished + live mode with timer and shortcuts), bankroll graph and core stats with filters, preset habits with daily check-off, streak engine (rest days, freezes, longest streak) with full unit tests, goals with progress & projection, Today screen, reminders via web push, CSV export. **Unit tests for every money and streak calculation.**

**Phase 2 — Hands**
Manual hand entry keyboard, quick notes, online HH import (paste/upload, Web Worker, de-dup), OHH normalisation, auto-tagging, smart lists & filter builder, replayer, review template, Leak Book, opponent notes, hand sharing (link + image card). Parser tests using sample hand history fixtures for each supported site.

**Phase 3 — Up The Stakes layer & growth**
Up The Stakes hub, waitlist + newsletter forms with the email provider adapters, announcements with countdown cards/modals/push, admin panel, access codes + student/alumni mode, contextual nudges (rate-limited), milestone share cards (story + post sizes), stake ladder, pre/post-session routines, weekly review, Daily Hand, insights ("what's working"), CSV import with mapping.

**Phase 4 — AI coach**
Provider-agnostic AI wrapper, hand review assistant, weekly review draft, leak pattern detection, usage limits per plan, caching, disclaimers.

**Phase 5 — Monetisation & polish**
Stripe (Pro monthly/yearly, free trial), paywall screens that are honest about what's free, variance simulator & risk of ruin, cohort accountability board, coach share view, light theme, performance pass (Lighthouse ≥ 90 on mobile), accessibility pass, landing page at `/` for logged-out visitors (same brand style as upthestakes.net) with app screenshots and "Add to Home Screen" instructions. Later: wrap as native apps (Capacitor or Expo) for the App Store / Play Store if traction justifies it.

**Free vs Pro (starting point — keep generous):**

- Free: unlimited sessions & bankroll basics, all habits & streaks (2 freezes), goals, 50 hands/month in the journal, basic stats, replayer, Leak Book, Up The Stakes hub.
- Pro (~€5–8/month or ~€50/year — make prices config): unlimited hands & imports, advanced filters & insights, variance simulator, 5 freezes, AI coach, share cards without watermark option, priority import formats, multi-currency reports. **UTS students/alumni get Pro via code.**

---

## 8. Quality bar & non-negotiables

- **Correct money maths.** Integer minor units, explicit currency on every amount, tested conversions, no floating-point drift. Stats must match a hand-calculated spreadsheet in tests.
- **Fast.** Logging a session or habit must feel instant (optimistic UI). App shell loads in < 2s on 4G. Large HH imports never block the UI.
- **Works offline** for logging; syncs cleanly; no duplicate records after reconnect.
- **Mobile-first, iPhone-first.** Test at 375px and 430px widths, iPad split view, landscape replayer. Respect safe areas.
- **Accessible.** Keyboard + screen reader labels, AA contrast, reduced-motion support, never colour alone for win/loss (use +/− signs and icons).
- **Privacy & compliance (EU/GDPR):** explicit separate consent for marketing emails, consent text and timestamp stored with each lead, data export & real deletion, privacy policy & terms pages (templates with TODOs for legal review), cookie-less analytics or consent banner. 18+ notice. Responsible-gaming links and session-limit tools. The app is a tracker and study tool — **no real-money gambling, no betting features, no "guaranteed profit" language anywhere.**
- **Brand & legal:** "Up The Stakes", the UTS logo and the ™ framework names belong to Nelson — keep them in config/content files and leave clear TODOs where his final sign-off and official assets are needed.
- **Security:** RLS on every table, server-side validation, rate limiting on public endpoints (lead forms, share links), honeypot field on forms (the site uses one too), admin actions audited.
- **Code hygiene:** small typed modules, `lib/poker/*` (parsing, normalising, evaluating, tagging), `lib/stats/*`, `lib/streaks/*`, `lib/money/*` all pure and unit-tested; UI never contains business maths.

---

## 9. How to work with me

- Start with **Phase 0**, then show me the `/design` page on a preview URL before going deep into Phase 1.
- At the end of each phase: summary of what was built, the preview URL, what's mocked/placeholder, open questions, and the plan for the next phase.
- When you need a decision from me, give me 2–3 options with your recommendation first.
- Seed realistic demo data (a fake player with ~3 months of sessions, 60 hands, a 23-day streak, a $10k bankroll goal at 64%) behind a "Load demo data" button so the app looks alive in screenshots and demos for Nelson.
- Keep everything Nelson might want to change (copy, program phases, review template labels, nudge texts, prices, announcement defaults) in content/config, not hard-coded.
