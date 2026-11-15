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

## Database (Phase 1, `supabase/migrations/`)
- Migrations are applied via the Supabase MCP `apply_migration`. The local file must then be renamed to the version the server recorded (`list_migrations`), so the repo and `supabase_migrations.schema_migrations` match.
- Enums: `client_type`, `tax_type`, `period_family`, `funding_method` (`client_paid_first`, `reimbursement`), `payment_mode` (`cheque`, `online_transfer`, `cash`), `paid_by` (`firm`, `client_direct`), `audit_action`.
- Triggers set `created_*` and `updated_*` from `auth.uid()`; never send them from the app.
- Tax type ↔ period family is enforced by a generated `period_family` column plus a composite FK `(period_id, period_family)` → `tax_periods (id, family)`. Records also have an FK `(client_id, tax_type)` → `client_tax_types`, so the client must be registered for that tax type.
- Client names are unique case-insensitively among non-deleted rows. `client_tax_types` is unique on (client, tax type): untick = `is_active = false`, never a second row.
- Advice marks: one live mark per obligation (partial unique index). Untick = set `deleted_at`; re-tick = insert a new row. `advised_on` defaults to today in Colombo.
- DELETE is revoked for `authenticated`. Soft-delete with `update … set deleted_at = now()`; the audit log records that as action `delete`.
- `audit_log` is select-only for staff. Only the `write_audit_log` trigger (security definer) writes it.
- `profiles` rows are created by a trigger on `auth.users` (`full_name` from user metadata, else the email's local part).
- `obligation_status` (security_invoker): one row per active client tax type × non-deleted period. `money_status` ∈ `no_activity`, `payment_pending`, `to_recover`, `settled`. It also has `paid_by_firm_total` and `paid_by_client_direct_total`.
- `generate_periods(year)` returns the number of rows added (0 when re-run). Starting periods: 2025/26, 2026/27, calendar 2025 and 2026.
- TS types live in `src/lib/supabase/database.types.ts`, generated with the Supabase MCP `generate_typescript_types` and trimmed of the fake view relationships. Regenerate after every migration.
- Client writes go through database functions (security invoker): `save_client` (client and tax types in one transaction), `import_clients(jsonb)` (each row saved separately, returns a per-row result), `soft_delete_client` (refused if the client has live marks, receipts or payments).

## App patterns (Phase 2 onward)
- `src/lib/supabase/server.ts` `createClient()` calls `connection()` first. Supabase reads `Date.now()`, and Cache Components rejects that during prerender unless rendering waits for the request. Don't remove it.
- Pages that read data: the page component is sync and passes `params` / `searchParams` promises into an async component wrapped in `<Suspense>`.
- Server actions: `requireUser()` from `src/lib/auth/require-user.ts` first, zod validation, then `refresh()` from `next/cache` after a write. Map Postgres errors with `friendlyDbError`.
- Shared helpers: `src/lib/format.ts` (`formatRs`, `formatAmount`, `formatDate` DD/MM/YYYY, `colomboYear`), `src/lib/constants.ts` (`TAX_TYPES`, `yearKeys(year)`, labels), `src/components/status-badges.tsx` (`AdviceBadge`, `MoneyBadge`), `src/components/simple-select.tsx`, `src/components/page-header.tsx`.
- shadcn here uses **Base UI**: use `render={<Button />}` instead of `asChild`. A Select needs `items` to show labels.
- Filters keep their state in the URL (`router.replace`), and server components read `searchParams`.
- "Year" means income year of assessment Y/Y+1 together with WHT/APIT calendar year Y (`yearKeys`).

## Testing in the browser pane
- A dedicated test staff account is stored in `.env.local` as `TEST_USER_EMAIL` / `TEST_USER_PASSWORD` (git-ignored). Use it only on localhost.
- Test data is named `TEST Phase<n> …` so it can be spotted and soft-deleted later.
- When the pane is hidden it doesn't paint, so streamed `<Suspense>` content can look stuck on its fallback. Take a screenshot (which forces a paint) before treating that as a bug.
- `form_input` doesn't trigger React's onChange on controlled inputs. Click and type instead.

## Layout
- `src/app/login`, `src/app/auth/*`: public auth pages
- `src/app/(app)/*`: signed-in screens, sharing the sidebar layout. Clients: `clients/` (list), `clients/new`, `clients/[id]` (client page), `clients/[id]/edit`, `clients/import`
- `src/lib/clients/`: `schema.ts` (zod and CSV parsing, shared with the client side), `actions.ts` (server actions)
- `src/components/ui`: shadcn components; `src/components/app-shell`: sidebar and nav
- `src/lib/nav.ts`: sidebar items; `src/lib/auth/actions.ts`: sign-in, sign-out and set-password actions
- `supabase/`: CLI config and migrations
