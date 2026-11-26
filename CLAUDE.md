@AGENTS.md

# Stakers — working notes for coding agents

- Product spec and phase plan: `docs/BUILD-PROMPT.md`. Decisions log: `DECISIONS.md`. Editable copy: `CONTENT.md`.
- Money is **integer minor units + ISO currency** (`src/lib/money`). Never floats, never `Intl` for exponents.
- Business maths lives in pure, unit-tested modules under `src/lib/*` — never inside components.
- Copy that Nelson may edit goes in `src/content/*` or `src/config/brand.ts`, not in components.
- Colours/radii come from tokens in `src/app/globals.css` (+ `src/config/tokens.ts` for JS). `tokens.test.ts` keeps them in sync and checks AA contrast.
- Every table has RLS. Change the schema with a new file in `supabase/migrations/` and extend `supabase/tests/10_rls_checks.sql`; run `scripts/verify-schema.sh`.
- Before committing: `pnpm check` (typecheck + lint + unit tests). `pnpm build && pnpm e2e` for flows.
