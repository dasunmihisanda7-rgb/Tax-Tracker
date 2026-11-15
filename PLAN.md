# Vidhana & Co. Tax Tracker — Build Plan for Claude Code

Nov 14, 2026 · @DASUN

## 1. Purpose

Build a small internal web app for Vidhana & Co., an audit firm in Sri Lanka, that replaces three Excel workbooks (CIT/IIT/PIT, WHT and APIT payment details). For every client and every tax period it must answer three questions:

1. **Advised?** Has the firm sent the client the tax advice for that period (the email saying how much to pay and by when)?
2. **Money received?** Has the client given the firm the money, by which method, on what date, under which reference number?
3. **Paid to IRD?** Has the payment been made to the Inland Revenue Department, on what date, for how much?

The app records these facts and shows what is still missing. It does not compute tax, store the advice text, or send emails.

## 2. Decisions already confirmed

These were confirmed by the firm and are not open for reinterpretation.

| Topic | Decision |
| --- | --- |
| Users | Several staff members, all with the same permissions. No roles. |
| Advice tracking level | Per period code. CIT/IIT/PIT: four instalments plus the final payment. WHT/APIT: every month. |
| Advice detail | Only whether the client was advised, plus the date and who marked it. No amounts, no email text. |
| Money received, IRD payment not yet made | A real, common state. In the old Excel it appeared as an amount with no date. The app must show it clearly. |
| Old Excel data | Not imported. The app starts empty; only the client list is entered. |
| Client receipts table | Must show client, method, date, reference number, tax type, period code and amount, with filters. |
| IRD payment records | Must continue the Excel layout: clients down the side, period codes across, date and amount per period. |

## 3. Tax types and period codes

The app generates every period code from the rules below; users never type a code. The rules were read from the firm's existing workbooks.

### Tax types

| Code | Name | Typical client | Period family |
| --- | --- | --- | --- |
| CIT | Corporate Income Tax | Company | Income tax |
| IIT | Individual Income Tax | Individual | Income tax |
| PIT | Partnership Income Tax | Partnership | Income tax |
| WHT | Withholding Tax | Any | Monthly |
| APIT | Advance Personal Income Tax | Any employer | Monthly |

One client can hold several tax types at once, for example a company paying CIT, APIT and WHT.

### Income tax family (CIT, IIT, PIT)

A year of assessment runs 1 April to 31 March. The code prefix is the last two digits of both years: 2026/27 becomes `2627`. Instalments add 1 to 4; the final payment adds 0.

| Code | Label | Default due date |
| --- | --- | --- |
| 26271 | 1st Instalment | 15 August 2026 |
| 26272 | 2nd Instalment | 15 November 2026 |
| 26273 | 3rd Instalment | 15 February 2027 |
| 26274 | 4th Instalment | 15 May 2027 |
| 26270 | Final Tax Payment | 30 September 2027 |

Display order is 1, 2, 3, 4, then 0, as in the workbook.

### Monthly family (WHT, APIT)

The code is two-digit year, two-digit month, then 0. `26010` is January 2026, `26110` is November 2026, `26120` is December 2026. Screens group the twelve months by calendar year, as the workbooks do. The default due date is the 15th of the following month.

### Rules that follow from the workbooks

- A code is unique only inside its family, so always store the family with the code.
- One period can have several payments. The workbooks show up to eight part-payments against one final code.
- A payment can be made long after the period, even years later. Do not restrict payment dates to the period.
- Due dates are defaults and must be editable in Settings.
- The workbooks contain mistyped header codes and dates with day and month swapped. This is why codes are generated and dates are picked from a date picker.

## 4. Core concept: the obligation

Everything in the app hangs off one unit: **client + tax type + period**. Call it an obligation. It is not stored as a row; it exists whenever a client is registered for a tax type and the period exists.

Three kinds of record attach to an obligation, and they are independent of each other:

- **Advice mark**: none or one. Its presence means the client was advised.
- **Client receipts**: none, one or many. Money the client gave the firm.
- **IRD payments**: none, one or many. Money paid to the IRD for that period.

### The two ways money moves

- **Client pays first.** The client gives the firm the money by cheque, online transfer or cash. The firm then pays the IRD through the bank.
- **Firm pays first.** The firm pays the IRD from its own funds. The client reimburses the firm afterwards.

Every client receipt records which of these two it belongs to.

### Status of an obligation

Balance = total received from the client minus total paid to the IRD through the firm. Advice status and money status are shown as two separate badges.

| Condition | Badge | Meaning |
| --- | --- | --- |
| No advice mark | Not advised | The client still needs the tax advice |
| Advice mark exists | Advised | Shows the date on hover |
| Balance above zero | Payment pending, Rs X held | Client money is in hand; the IRD payment is not yet made |
| Balance below zero | To recover, Rs X | The firm paid; the client still owes the firm |
| Balance zero, something paid | Settled | Received and paid amounts match |
| No receipts and no payments | No activity | Nothing recorded yet |

Build this as one database view so every screen reads the same numbers.

## 5. Tech stack and security

Use Next.js on Vercel with Supabase for the database and login. The app holds confidential client tax data, so the security rules below are requirements, not suggestions.

### Stack

- Next.js (App Router) with TypeScript.
- Tailwind CSS with shadcn/ui components.
- Supabase: Postgres database, Auth with email and password, Row Level Security.
- Zod for form validation; server actions for writes.
- An Excel export library such as exceljs.
- Hosting on Vercel; code in a private GitHub repository.

### Security rules

- Disable public sign-up. Staff accounts are created by invitation from the Supabase dashboard.
- Every page except the login page requires a signed-in user.
- Enable Row Level Security on every table. Policy: any authenticated user can read and write; anonymous users can do nothing.
- The Supabase service-role key is used only on the server and never reaches the browser.
- All keys live in environment variables, never in the repository.
- No hard deletes. Rows get a `deleted_at` timestamp and disappear from screens.
- Every row records who created it and who last changed it.
- An audit log table records every insert, update and delete on receipts, IRD payments and advice marks, written by database triggers.

### Data conventions

- Money: `numeric(14,2)`, Sri Lankan rupees, shown with thousand separators and two decimals.
- Dates: Postgres `date`, entered with a date picker, shown as DD/MM/YYYY.
- Time zone for timestamps: Asia/Colombo.

## 6. Data model

Seven tables and one view carry the whole app. Every table also has `id` (uuid), `created_at`, `created_by`, `updated_at`, `updated_by` and `deleted_at`.

| Table | Key fields | Rules |
| --- | --- | --- |
| `profiles` | `id` (same as the auth user), `full_name` | One row per staff login |
| `clients` | `name`, `client_type` (company, individual, partnership), `contact_person`, `email`, `phone`, `tin` (optional), `is_active`, `notes` | `name` unique among non-deleted rows |
| `client_tax_types` | `client_id`, `tax_type` (CIT, IIT, PIT, WHT, APIT), `is_active` | Unique on client and tax type |
| `tax_periods` | `family` (income, monthly), `code`, `label`, `year_key` (for example `2026/27` or `2026`), `sort_order`, `due_date` | Unique on family and code |
| `advice_marks` | `client_id`, `tax_type`, `period_id`, `advised_on`, `advised_by` | Unique on client, tax type and period. Row present means advised |
| `client_receipts` | `client_id`, `tax_type`, `period_id`, `received_on`, `funding_method` (client paid first, reimbursement), `payment_mode` (cheque, online transfer, cash), `ref_no`, `amount`, `note` | Amount above zero. `ref_no` required for cheque and online transfer |
| `ird_payments` | `client_id`, `tax_type`, `period_id`, `paid_on`, `amount`, `paid_by` (firm, client directly), `ref_no` (optional), `note` | Amount above zero. Many rows per obligation allowed |
| `audit_log` | `table_name`, `row_id`, `action`, `old_data`, `new_data`, `changed_by`, `changed_at` | Written only by triggers |

### View: `obligation_status`

One row per active client tax type and period. Columns: client, tax type, period, `is_advised`, `advised_on`, `received_total`, `paid_total`, `balance`, `money_status`. Payments marked as paid by the client directly are excluded from `paid_total` when computing `balance`, but still shown as paid.

### Further rules

- The tax type must match the period family: CIT, IIT and PIT take income periods; WHT and APIT take monthly periods. Enforce this in the database, not only in forms.
- A database function `generate_periods(year)` creates the five income codes for a year of assessment and the twelve monthly codes for a calendar year, using the rules in section 3. It is safe to run twice.
- One cheque or transfer that covers several periods is saved as several receipt rows sharing the same `ref_no`. The entry form has an "add another line" button for this.
- All schema changes go in Supabase migration files in the repository.

## 7. Screens

Seven screens behind a login, with a left sidebar. Every table screen has filters, a total row for amounts, and an export to Excel.

### Dashboard

- Card: clients not yet advised for the next due period, per tax type, linking to the filtered Tax Advice screen.
- Card: money held and awaiting IRD payment, with count and rupee total.
- Card: amounts to recover from clients, with count and rupee total.
- List: periods falling due in the next 14 days.

### Clients

- List with search and a filter by tax type and active status.
- Add and edit form: name, client type, contact person, email, phone, TIN, notes, and tick boxes for the tax types the client pays.
- Bulk add: paste or upload a CSV of client name, client type and tax types, to enter the starting client list quickly.
- Client page: one client's obligations for a chosen year, with advice, received and paid shown side by side.

### Tax Advice

This is the screen for finding who still needs advice.

- Choose a tab (Income tax, WHT, APIT) and a year.
- Grid: one row per registered client, grouped CIT, then IIT, then PIT on the income tab. One column per period code with its label, for example `26271 1st Instalment`.
- Each cell is a tick box. Ticking saves the advice mark with today's date and the current user; the date can be changed. Unticking removes the mark after a confirmation.
- Filter: show only clients not advised for a chosen period.
- Bulk actions: mark every period of the year for one client (one email often covers all four instalments), and mark one period for all selected clients.
- A counter above each column, for example "Advised 31 of 68".

### Client Receipts

- Table columns: date received, client, funding method, payment mode, reference number, tax type, period code, amount, entered by.
- Filters: client, tax type, year, period code, funding method, payment mode, date range, and a search on reference number.
- Add form with the "add another line" button for one reference covering several periods.
- Total of the filtered rows shown under the table.

### IRD Payments

This continues the Excel workbooks.

- Choose a tab (Income tax, WHT, APIT) and a year.
- Grid: clients down the side with their tax type, period codes across, and a date and amount under each code. Several payments for one period stack inside the cell.
- Clicking a cell opens a side panel listing that obligation's payments and receipts, with a form to add a payment.
- A cell with money received and nothing paid is highlighted and shows the amount held. This replaces the old habit of typing an amount with no date.
- A second view lists payments as flat rows with the same filters as Client Receipts.
- Export produces an Excel sheet in the same layout as the old workbooks.

### Outstanding

- Tab one: payment pending. Obligations where client money is held and the IRD payment is not made, oldest first.
- Tab two: to recover. Obligations where the firm paid and the client has not reimbursed, with a total per client.

### Settings

- Generate periods for a new year.
- Edit due dates.
- List of staff accounts (read only; accounts are managed in Supabase).

## 8. Build phases

Build in eight phases, in order, stopping after each one for the firm to test. A phase is finished only when every item in its "Done when" column works in the running app.

| Phase | Build | Done when |
| --- | --- | --- |
| 0. Setup | Next.js project, Tailwind, shadcn/ui, Supabase connection, login page, protected layout with sidebar, `CLAUDE.md` | A staff account can sign in and out. Every other page redirects to login when signed out. Sign-up is not possible from the app |
| 1. Database | Migrations for all tables, Row Level Security, audit triggers, `generate_periods`, the `obligation_status` view | Running the generator for 2026/27 and 2026 gives exactly the codes in section 3. Running it twice creates no duplicates. An anonymous request reads nothing |
| 2. Clients | Client list, add and edit form, tax type tick boxes, CSV bulk add, client page | A client with CIT, APIT and WHT can be created. A CSV of ten clients loads with their tax types. Duplicate names are rejected |
| 3. Tax Advice | Advice grid, tick to mark, not-advised filter, bulk actions, counters | Marking all 2026/27 instalments for one client takes one action. The not-advised filter for `26272` lists exactly the unmarked clients. The mark shows who ticked it and when |
| 4. Client Receipts | Receipts table, add and edit form, multi-line entry, filters, totals | One cheque split over two periods saves as two rows with the same reference. Each filter narrows the table and the total follows. A cheque without a reference number is rejected |
| 5. IRD Payments | Payment grid, side panel, flat list view, held-money highlight | Two payments against one final code both show in the cell. A receipt with no payment highlights the cell with the amount held. A payment dated a year after the period is accepted |
| 6. Status and dashboard | Outstanding screen, dashboard cards | Receive 25,000 and pay nothing: the obligation appears under payment pending. Pay 25,000 with no receipt: it appears under to recover. Receive and pay the same amount: it shows as settled |
| 7. Export and release | Excel export on every table and grid, empty states, loading states, deployment to Vercel | The IRD payment export opens in Excel in the workbook layout. The live site works for two staff accounts at the same time. Deleted rows vanish from screens but remain in the audit log |

## 9. Out of scope for version 1

Do not build any of the following unless the firm asks later.

- Sending advice emails or storing the advice text.
- Calculating tax or storing the amount a client was advised to pay.
- Importing history from the old Excel workbooks.
- Roles or different permission levels.
- Links to the IRD system or to banks.
- Email or SMS reminders.
- A mobile app. The web app only needs to work well on a desktop browser.

## 10. Assumptions to confirm

Seven points in this plan were assumed, not confirmed. Tick each one that is right, or correct it, before Claude Code reaches the phase that depends on it.

- [x] The final payment code (ending in 0) is due on 30 September after the year of assessment ends. This was inferred from payment dates in the workbook.
- [x] WHT and APIT are due on the 15th of the following month. This was inferred from payment dates in the workbooks.
- [x] Some clients pay the IRD themselves and the firm only records it. If every payment goes through the firm, remove the `paid_by` field.
- [x] One cheque or transfer covering several periods is entered as several lines with the same reference number.
- [x] WHT and APIT months are grouped by calendar year, January to December, as in the workbooks.
- [x] The screens are in English only.
- [x] The stack is Next.js, Supabase and Vercel.

## 11. Handing this to Claude Code

Save this plan as `PLAN.md` in the project folder and let Claude Code build one phase at a time.

1. Create an empty private GitHub repository and a new Supabase project.
2. Export this document as Markdown and save it as `PLAN.md` in the repository root.
3. Open Claude Code in that folder and paste the prompt below.
4. After each phase, test the "Done when" items yourself, then reply "next phase".

```text
Read PLAN.md fully before writing any code. It is the specification for this project.

Rules:
- Build one phase at a time, in the order given in section 8. Start with Phase 0 only.
- Before each phase, tell me in a few lines what you will build and ask any questions you have.
- Do not guess on anything listed in section 10 (Assumptions to confirm). Ask me.
- Do not build anything listed in section 9 (Out of scope).
- After each phase, run the app, check every "Done when" item for that phase, report the result, and stop. Wait for me to say "next phase".
- Put every database change in a Supabase migration file. Enable Row Level Security on every table.
- Never hard-code or hand-type period codes. Generate them with the rules in section 3.
- Create a CLAUDE.md that records the stack, the commands, and the conventions from sections 5 and 6.
- Commit to git at the end of each phase with a clear message.
```
