# Decisions

Sensible defaults taken while building, so they can be revisited. Newest phase at the bottom.

## Phase 0 — Foundation (2026-11-26)

### Brand: fonts (spec said “looks like Inter” — it isn't)

Extracted from upthestakes.net's `theme-tokens` block and CSS bundle:
`--font-display: 'Fraunces'`, `--font-body: 'Plus Jakarta Sans'`. Headlines use Fraunces 600,
`letter-spacing: -0.02em` (hero `-0.03em`), `font-optical-sizing: auto`. Both are **free (OFL)**, so
no substitute is needed. They're self-hosted via `next/font/local` from `@fontsource-variable`
files (Fraunces: wght + opsz axes; Jakarta: wght). Reason for local over `next/font/google`: no
build-time network dependency, identical output on Vercel and locally. Latin subset only for now
(covers á/é; Hungarian ő/ű fall back to Georgia) — add latin-ext if needed.

### Brand: colours (exact values from the site, not the sampled ones)

| Token                   | Value                             | Site variable                          |
| ----------------------- | --------------------------------- | -------------------------------------- |
| canvas                  | `#06060d`                         | `--color-dark` (hero background)       |
| elevated                | `#0b0b14`                         | `--color-bg`, `theme-color`            |
| surface / surface-2     | `#10101b` / `#15151f`             | `--color-bg-alt` / `--color-bg-card`   |
| field                   | `#1a1a26`                         | used in site CSS                       |
| primary / strong / deep | `#7c5cff` / `#6847f0` / `#5d3fe6` | `--color-accent(-strong/-dark)`        |
| lavender / pale         | `#a892ff` / `#c5b6ff`             | `--color-accent-light/-pale`           |
| ink / soft / muted      | `#f6f6fa` / `#c8c8d2` / `#8a8a9a` | `--color-text(-soft)`, `--color-muted` |
| success / danger / gold | `#34d399` / `#f4544e` / `#fbbf24` | `--color-success/-danger/-gold`        |
| line                    | `rgba(255,255,255,.08)`           | `--color-border`                       |

Primary button = the site's `linear-gradient(110deg, accent, accent-strong, accent-dark)` with
`--shadow-accent`. `ink-muted` already passes WCAG AA on every surface, so it was kept as-is;
`ink-subtle` (`#75758a`) is ours, for captions (AA-large). `src/config/tokens.test.ts` enforces
contrast and keeps the TS copy of the tokens in sync with `globals.css`. Radii: 8 / 12 (inputs) /
18 (cards) / 22 (sheets, = site `--radius-lg`). Gold is reserved for milestones.

### Components: shadcn approach without the CLI

shadcn's registry isn't reachable from the build environment, so components are written in the
same pattern (Radix primitives via the `radix-ui` package + `cva` + `tailwind-merge`, copied into
`src/components/ui`) and styled from scratch to the tokens. Bottom sheets use `vaul`, toasts `sonner`.

### Next.js 16 with Cache Components

Kept the new defaults (`cacheComponents`, `partialPrefetching`, Turbopack). All app screens are
static shells that hydrate from on-device state, which is exactly what a local-first PWA wants:
instant loads and offline-capable pages. Server-side session reads (later phases) go behind
`<Suspense>` per the Next 16 auth guide. No `proxy.ts` (formerly middleware): the browser Supabase
client refreshes its own session, so we avoid adding latency to every request.

### Guest mode & local-first data

Device state (mode, prefs) lives in a persisted zustand store (`localStorage`). Phase 1 adds the
real data layer: **IndexedDB (Dexie) as the source of truth on the device + an outbox queue** that
syncs to Supabase when online. Every syncable table has a `client_id uuid unique` idempotency key
so replays after reconnect never duplicate rows. On sign-up, guest data is uploaded through the same
outbox. Device-level choices: currency is guessed from the locale on first launch.

### Auth on iOS PWA

A magic link tapped in Mail opens **Safari**, whose storage is separate from the Home Screen app,
so the user would end up signed in in the wrong place. The login screen therefore asks for the
**6-digit code** from the same email (Supabase OTP); the link still works in a browser. Google
OAuth works but is less smooth inside an installed iOS app. Apple sign-in deferred to the native
wrapper (it needs a paid Apple developer account).

### PWA

Hand-written `public/sw.js` (Serwist/next-pwa need webpack; Next 16 builds with Turbopack):
network-first for pages with cached fallback + `/offline`, cache-first for hashed static assets,
nothing cached for `/auth/*`, `/api/*` or other origins. Update flow: new SW waits → toast
“Reload” → `SKIP_WAITING`. iOS splash screens generated for 17 current iPhone/iPad sizes
(portrait). Push handlers are in place; subscription + sending arrives in Phase 1.

### Money

Integer minor units + ISO currency everywhere (`src/lib/money`). Minor-unit exponents come from a
**fixed ISO 4217 table, not `Intl`**: browsers disagree (e.g. Chromium reports HUF with 0 decimals,
ISO says 2) and a storage format must never change under stored integers. Parsing never touches
floats; FX conversion uses BigInt with rates scaled to 1e-10, rounding half away from zero.
Negative results are shown with a real minus sign and always with a sign, so win/loss never relies
on colour.

### Database

Matches spec §6 with these additions/adjustments:

- `user_id` on every user-owned table (also children like `transactions`, `stack_updates`,
  `habit_logs`) + **composite foreign keys** `(parent_id, user_id)` so a row can never reference
  another user's parent, even with a forged id. Simple, fast RLS: `user_id = auth.uid()`.
- Stakes stored as `stakes_sb_minor/stakes_bb_minor/straddle_minor`; added `tips_minor`,
  `stop_loss_minor`, `max_length_min`, `followed_focus` (needed by §4.3/§4.6).
- One running session per user (partial unique index). Hands de-dup on `(user_id, site, external_hand_id)`.
- `profiles.pro_until` for time-boxed Pro from cohort codes; privileged columns (`plan`, `role`,
  `uts_status`, `cohort_id`) are **not** updatable by users (column-level grants).
- `fx_rates` daily cache table, `access_code_redemptions`, `goals.is_main`/`title`, `streak_state.total_active_days`/`repair_deadline`.
- Public hand shares are only reachable through `get_public_hand(slug)` (SECURITY DEFINER) — they
  can't be listed. `redeem_access_code()` and `delete_my_account()` (real GDPR deletion via cascade)
  are the only privileged entry points. Leads are written by the server only.
- Verified on Postgres 16 with `scripts/verify-schema.sh` (also runs in CI). It caught a real bug:
  inside `SECURITY DEFINER … search_path = ''` functions, `citext =` silently falls back to
  case-sensitive text comparison — fixed with explicit `lower()`.

### /design visibility

Spec says “dev-only” but also “show me /design on a preview URL”. Resolution: visible in
development and Vercel **preview** deployments, 404 on **production**.

### Navigation

Five equal tabs (Today · Bankroll · Hands · Progress · More) and the “+” floating at bottom-right
above the tab bar (thumb zone), rather than a centre tab, so the five tabs stay evenly spaced.

### App mark

Placeholder “Stakers” mark = three rising steps (the stake ladder). Not the UTS logo — official
Up The Stakes assets are TODO(nelson) in `public/brand/`.

## Phase 1 — Core tracker MVP (2026-11-26)

### Local-first data layer

IndexedDB (Dexie) is the source of truth on the device; records mirror the Postgres columns
(snake_case) so there's no mapping layer. Every write and its outbox entry share one IndexedDB
transaction. Sync (`src/lib/db/sync.ts`): push collapses the outbox to the last op per row and
upserts parents before children (deletes in reverse); pull merges remote rows unless the row has a
pending local change; conflicts are last-write-wins by `updated_at`. Runs on sign-in, after writes
(debounced 1.5s), on reconnect, on returning to the foreground and every minute.
**Known limitation:** deletes don't propagate to _other_ devices yet (no tombstones). Phase 2 adds
`deleted_at` soft deletes. Single-device use (the common case) is unaffected.

### Screens render after hydration

With Cache Components, client code can't read the clock during prerender. App screens depend on
IndexedDB, the clock and the user's timezone anyway, so they're wrapped in `<ClientOnly>`: the
static shell (tab bar, skeleton) prerenders and is cached by the service worker; the screen
renders immediately after hydration. Every route stays static (no server rendering per visit).

### Session maths

`result = (cash_out + prize + bounties) − (buy_in + rebuys + fees)`; tips and expenses are
tracked separately and subtracted for "net after costs" (used for the bankroll balance, hourly in
Bankroll, and profit goals). bb/hr uses live cash sessions only; bb/100 uses sessions with a hand
count. Std dev is the sample SD per session. Small samples are labelled (< 10 "tells you very
little", < 30 "a hint, not a verdict"). Verified against a hand-calculated sheet in
`stats.test.ts`.

### Multiple currencies

A session in another currency than its bankroll stores `fx_rate` (session → bankroll), pre-filled
from the day's ECB rate (Frankfurter API, free, cached on device). Cross-bankroll totals in the
display currency use the cached daily rate and are hidden when a rate is missing. Transfers are
only allowed between bankrolls in the same currency.

### Streak rules (as implemented)

- A day counts when the user's commitment is met: at least 1 habit (default), all habits, or at least 2.
- **Session-linked habits** (warm-up, cool-down, log every session, no alcohol) only apply on days you play.
- Rest weekdays and days with nothing scheduled never break a streak; playing anyway still counts.
- Freeze: earned per 7 counted days in the current streak, held up to 2 (Pro 5), auto-spent on a miss.
- Repair: one per streak run. Miss a day with no freeze → double it the next day (every required
  habit at ≥ 2× target; yes/no habits count as doubled when done). Until that day ends the streak
  is shown "at risk", not broken.
- The streak is _derived_ by replaying the logs (`computeStreak`), so it can't drift; `streak_state`
  in the DB is only a cache for later server features (leaderboards).
- Milestones are celebrated on the day they're reached (not days later).

### Goals

Profit goal = profit before tracking (`start_value`) + net results since the goal started.
Bankroll goal = current total balance (progress = balance ÷ target, so the demo's $6,400 of $10k
reads 64%). Projections need ≥ 7 days of history and a positive pace. Weekly/monthly targets from
onboarding are one-off goals with a deadline (recurring goals later). Stake/custom goals are
updated by hand.

### Reminders

Vercel Hobby crons run once a day, so `/api/cron/reminders` is built for an imprecise 15-minute
scheduler (GitHub Actions, free): a reminder is due once the local reminder time has passed, it
hasn't been sent today (`profiles.last_reminded_on`) and it isn't quiet hours. The server uses the
same `dayInput` habit logic as the app to decide what's left. Push needs an account (the server
must know the subscription); guests see a "create account" prompt. iOS needs the Home Screen app.

### Onboarding details

Default goal "Make my first $50k from poker" uses the user's currency with an editable amount
(50,000 HUF isn't the same promise). The Up The Stakes code is stored and redeemed automatically
on the first signed-in sync (`redeem_access_code`). The email opt-in (separate, unticked, consent
text + timestamp stored) is kept on the device and sent to the email provider in Phase 3.

### Demo player

Deterministic generator (`src/lib/demo/demo.ts`, tested): ~3 months of live 1/2 & 1/3 sessions,
whole-dollar results, A-games win and C-games lose (so insights look meaningful), a 23-day streak
and a $10k bankroll goal at exactly 64%. Removable from More → Data & sync. Hands arrive in Phase 2.

## Phase 2 — Hands (2026-11-26)

### Own poker engine (no external evaluator)

`src/lib/poker/*` is dependency-free and pure: exact 5-of-7 Hold'em and 2+3 Omaha evaluation
(≤ 100 combos per hand — fast enough for replays, tagging and demo data), a betting engine that
replays a hand action by action (blinds, antes, straddles, bomb pots, min-raises, pot-limit caps,
uncalled bets, side pots, chops with the odd chip left of the button, rake, run it twice) and
auto-tagging. Writing it ourselves kept the bundle small and lets every rule be tested (61 tests).
All-in equity and online hand-history import are **not in this phase** (see below).

### Hand format

`HandHistory` (`src/lib/poker/hand-types.ts`) is a compact OHH-style shape: integer minor units,
bet/raise/call amounts stored as the player's street total (`to`), antes as dead money. Validated
with Zod on save. Manual entry always seats the hero in seat 1 and moves the button to give the
chosen position; the table rotates so the hero sits at the bottom.

### When the winner can't be computed

If villain cards are unknown at showdown, the user picks the winner(s) — we never guess. The
result is stored as `winners` on the hand.

### Custom sections

Users' own folders for hands (`hand_collections`). Membership is stored on the hand
(`hands.collection_ids`) so one row syncs; deleting a section never deletes hands.

### Reviews feed the habit loop

A first review increments today's "Review hands" habit (and therefore the streak). A rule written
in the review lands in the Leak Book; writing the same rule again counts it ("Seen 3×"). The
Today screen resurfaces one open rule per day, weighted toward frequent leaks.

### Cross-device deletes

A `tombstones` table filled by delete triggers lets other devices apply deletes on their next pull
(closes the Phase 1 limitation). Tombstones of a deleted account are removed with it.

### Not yet (planned)

Online hand-history import (PokerStars/GG via `@poker-apprentice/hand-history-parser`, Web Worker),
all-in equity, opponent notes, public share links and the image share card.

## Open questions for Máté / Nelson

- Final app name (Stakers?) and whether the app mark should carry the UTS logo.
- Which email provider Nelson uses (Kit / Mailchimp / other) — adapter is picked by env var.
- Approval of the program copy pulled from the site (`src/content/program.ts`) and of the Up The Stakes hub wording.
- Reminder wording and default time (19:00) — `src/content/notifications.ts`.
