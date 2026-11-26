# Stakers

**Build the system. Up the stakes.** — the poker habit, bankroll and hand-review tracker built on
the Up The Stakes™ system. Mobile-first PWA (iPhone/iPad), works offline and without an account.

- Product spec & phases: [`docs/BUILD-PROMPT.md`](docs/BUILD-PROMPT.md)
- Decisions log: [`DECISIONS.md`](DECISIONS.md) · Editable copy: [`CONTENT.md`](CONTENT.md)

## Stack

Next.js 16 (App Router, Turbopack, Cache Components) · TypeScript strict · Tailwind CSS v4 ·
shadcn-style components on Radix · Supabase (Postgres + Auth + RLS) · Zod · Recharts ·
Framer Motion · Vitest · Playwright · hand-written service worker · Vercel.

## Getting started

```bash
pnpm install
cp .env.example .env.local   # optional — the app runs in guest mode with no env at all
pnpm dev                      # http://localhost:3000
```

| Command                    | What it does                                                                |
| -------------------------- | --------------------------------------------------------------------------- |
| `pnpm dev`                 | Dev server (service worker off unless `NEXT_PUBLIC_ENABLE_SW_IN_DEV=true`)  |
| `pnpm build && pnpm start` | Production build + server                                                   |
| `pnpm check`               | Typecheck + lint + unit tests                                               |
| `pnpm test`                | Vitest unit tests (money maths, tokens/contrast, env, …)                    |
| `pnpm e2e`                 | Playwright smoke tests on iPhone + iPad profiles (needs `pnpm build` first) |
| `pnpm icons`               | Regenerate PWA icons + iOS splash screens from the mark                     |
| `scripts/verify-schema.sh` | Apply migrations to a throwaway Postgres and run the RLS checks             |

## Routes (Phase 0)

| Route                                             |                                                                                 |
| ------------------------------------------------- | ------------------------------------------------------------------------------- |
| `/`                                               | Welcome — start as guest or sign in                                             |
| `/today` `/bankroll` `/hands` `/progress` `/more` | App shell with bottom tabs + floating “+” quick-add                             |
| `/more/up-the-stakes`                             | Up The Stakes hub preview (cohort phases)                                       |
| `/login`                                          | Email code / magic link + Google                                                |
| `/design`                                         | Design-system showcase — development & Vercel previews only (404 in production) |
| `/auth/callback`                                  | Supabase auth landing (magic link + OAuth)                                      |
| `/legal/*`, `/offline`                            | Legal templates, offline fallback                                               |

## Deploying to Vercel (one-time setup)

1. **vercel.com → Add New → Project → Import** `magmotionbusiness-lang/Poker-habit-tracker`.
   Framework: Next.js (auto). Install: `pnpm install`. No env vars needed for the first deploy.
2. Every push to a branch then gets its own **Preview URL** (shown on the PR and in the Vercel dashboard).
   `/design` is visible on previews and hidden on production automatically (`NEXT_PUBLIC_VERCEL_ENV`).
3. Under **Settings → Environment Variables → System**, make sure “Automatically expose System
   Environment Variables” is on (it is by default) so `NEXT_PUBLIC_VERCEL_ENV` is set.
4. Optional: **Settings → Deployment Protection** — turn off Vercel Authentication for previews if
   you want to open them on your phone without logging in to Vercel.

### Install on iPhone / iPad

Open the preview URL in **Safari** → Share → **Add to Home Screen** → open Stakers from the Home
Screen. (Push reminders on iOS 16.4+ only work from the Home Screen app.)

## Connecting Supabase (accounts & sync)

1. Create a project at supabase.com (pick an **EU region**).
2. Apply the schema: `supabase link --project-ref <ref>` then `supabase db push`
   (or paste `supabase/migrations/*.sql` into the SQL editor, in order).
3. **Auth → Providers**: Email on. Google: add a Google OAuth client ID/secret.
4. **Auth → URL configuration**: Site URL = your production URL; add redirect URLs
   `http://localhost:3000/**` and `https://*-<your-team>.vercel.app/**` for previews.
5. **Auth → Email templates → Magic Link**: include the code so iPhone users can sign in inside the
   Home Screen app (links from Mail open in Safari, which has separate storage):
   ```html
   <h2>Your Stakers sign-in code: {{ .Token }}</h2>
   <p>
     Or
     <a href="{{ .SiteURL }}/auth/callback?token_hash={{ .TokenHash }}&type=email&next=/today"
       >tap to sign in</a
     >.
   </p>
   ```
6. Add `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` in Vercel and redeploy.

## Environment variables

See [`.env.example`](.env.example) — every variable is documented there and validated by Zod in
`src/lib/env.ts`. Nothing is required for Phase 0.

## Project layout

```
src/
  app/                 routes (App Router); (app)/ = tabbed app shell
  components/ui/       design-system primitives (Button, Card, Sheet, …)
  components/shell/    tab bar, quick-add, install prompt, SW registration, auth sync
  components/brand/    mark, two-tone headline, streak flame
  components/charts/   bankroll chart, sparkline, heatmap
  components/poker/    playing card
  config/              brand.ts (names/links), tokens.ts (colours for JS), splash.ts
  content/             Nelson-editable copy (program phases, UI copy)
  lib/money/           integer money maths (pure + tested)
  lib/store/           device/guest state (zustand, persisted)
  lib/supabase/        browser + server clients
supabase/migrations/   SQL schema + RLS        supabase/tests/  RLS checks
public/sw.js           service worker           public/icons, public/splash  generated
```
