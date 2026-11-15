@AGENTS.md

# Vidhana & Co. Tax Tracker

An internal web app that tracks, for every client and tax period, whether the client was **advised**, whether the **money was received**, and whether it was **paid to the IRD**. `PLAN.md` is the specification: read it before changing anything.

## Working rules
- Build one phase at a time, in the order of PLAN.md section 8. Stop after each phase, check every "Done when" item in the running app, report, and wait for "next phase".
- Don't guess on PLAN.md section 10 items. Ask.
- Don't build anything in PLAN.md section 9 (out of scope): advice emails or advice text, tax calculation or advised amounts, Excel history import, roles or permission levels, IRD or bank links, email or SMS reminders, a mobile app.
- Commit at the end of each phase with a clear message, and push to `origin`.

## Stack
- Next.js 16 (App Router, TypeScript, `src/` dir). **Next 16 differs from older versions.** Middleware is now `src/proxy.ts`, and `cacheComponents` is on, so any read of `cookies()` or the session must sit inside `<Suspense>`. Check `node_modules/next/dist/docs/` before using an API.
- Tailwind CSS v4 + shadcn/ui (base-nova style, Base UI primitives). Add components with `npx shadcn@latest add <name>`.
- Supabase: Postgres, Auth (email + password, invitation only), Row Level Security. `@supabase/ssr` clients live in `src/lib/supabase/` (`server.ts`, `client.ts`, `proxy.ts`).
- Zod for validation, server actions for writes, exceljs for Excel export (added in Phase 7).
- Hosting on Vercel; code in a private GitHub repo. Supabase project ref: `zcclgwqswlvcvrqvszjk` (ap-south-1).

## Commands
- `npm run dev`: dev server on http://localhost:3000
- `npm run build`: production build (also type-checks)
- `npm run lint`: ESLint
- `npx supabase migration new <name>`: create a migration file in `supabase/migrations/`
- Apply migrations to the hosted project with `npx supabase link --project-ref zcclgwqswlvcvrqvszjk`, then `npx supabase db push`. Claude can instead apply the same file through the Supabase MCP `apply_migration`. Either way, the migration file in the repo is the source of truth.

## Security (requirements, not suggestions)
- Public sign-up is disabled (dashboard setting, plus `enable_signup = false` in `supabase/config.toml`). There is no sign-up page or route. Staff are invited from the Supabase dashboard. The free plan can't edit email templates, so the **default** invite link is supported: Supabase verifies it, redirects to the Site URL with the session in the URL fragment, the proxy sends the browser to `/login` (the fragment survives), and `src/app/login/invite-link-handler.tsx` stores the session and goes to `/auth/set-password`. `/auth/confirm` (token_hash) also works if a custom template is ever used. Site URL in Supabase → Authentication → URL Configuration must be the app's URL (`http://localhost:3000` locally, the Vercel URL once deployed).
- Every page except `/login` and `/auth/confirm` requires a signed-in user. `src/proxy.ts` redirects; the `(app)` layout re-checks with `getUser()`. Server actions must re-check the user themselves.
- RLS is enabled on **every** table. Policy: `authenticated` can read and write; `anon` can do nothing.
- The service-role key is server-only (`SUPABASE_SERVICE_ROLE_KEY`, never `NEXT_PUBLIC_`), and never imported into client code.
- All keys live in env vars (`.env.local`, gitignored; names in `.env.example`). Never commit secrets.
- No hard deletes: set `deleted_at`, and filter it out on every screen.
- Every table has `id uuid`, `created_at`, `created_by`, `updated_at`, `updated_by`, `deleted_at`.
- `audit_log` records every insert, update and delete on `client_receipts`, `ird_payments` and `advice_marks`. It is written only by database triggers.
- Every schema change goes in a migration file under `supabase/migrations/`. Never change the schema by hand in the dashboard.

## Data conventions
- Money: `numeric(14,2)`, Sri Lankan rupees, shown with thousand separators and two decimals (e.g. `Rs 25,000.00`). Amounts must be above zero.
- Dates: Postgres `date`, entered with a date picker, shown as DD/MM/YYYY. Never accept typed dates in ambiguous formats.
- Timestamps: shown in Asia/Colombo.
- English only.

## Domain model (PLAN.md sections 3, 4 and 6)
- Tax types: CIT, IIT, PIT (income family); WHT, APIT (monthly family). One client can hold several.
- **Period codes are generated, never typed or hard-coded.** `generate_periods(year)` creates them and is idempotent.
  - Income (year of assessment 1 Apr–31 Mar): prefix = last two digits of both years (2026/27 → `2627`). Instalments `26271`–`26274` are due 15 Aug, 15 Nov, 15 Feb and 15 May; the final payment `26270` is due 30 Sep after the year ends. Display order is 1, 2, 3, 4, 0.
  - Monthly: `YYMM0` (e.g. `26110` = Nov 2026), due the 15th of the following month, grouped by calendar year.
  - Codes are unique only within a family, so always store the family with the code. Due dates are editable in Settings.
- The tax type must match the period family, and this is enforced in the database.
- An obligation (client + tax type + period) is not a stored row. Attached to it: at most one advice mark, any number of client receipts, any number of IRD payments.
- Payment dates are not restricted to the period.
- Balance = received − paid via the firm (`paid_by = client directly` is excluded from the balance but still shown as paid). All screens read status from the `obligation_status` view.
- One cheque or transfer covering several periods is saved as several receipt rows with the same `ref_no`. `ref_no` is required for cheque and online transfer.

## Layout
- `src/app/login`, `src/app/auth/*`: public auth pages
- `src/app/(app)/*`: signed-in screens, sharing the sidebar layout
- `src/components/ui`: shadcn components; `src/components/app-shell`: sidebar and nav
- `src/lib/nav.ts`: sidebar items; `src/lib/auth/actions.ts`: sign-in, sign-out and set-password actions
- `supabase/`: CLI config and migrations
