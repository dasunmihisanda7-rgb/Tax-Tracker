# Tax Tracker: guided walkthrough with demo data

This guide takes you through every screen of the Tax Tracker using demo clients that are already loaded in the live app. Each section explains what the screen is for, what the demo data shows there, and gives you a few things to try yourself.

- **Live app:** https://tax-tracker-peach.vercel.app
- **Today in the demo:** 15 November 2026. CIT/IIT/PIT 2nd instalment `26272` and WHT/APIT October `26100` are both due today.
- **Demo entries are credited to "Test Staff"** (the test account). Anything you do yourself is credited to your own name.
- **Every demo client's name starts with `DEMO`.** When you've finished studying, tell Claude and all demo data will be removed together.

> Work through the sections in order. Each one builds on the last, and the "Try it" steps are safe to do: they only change demo data.

---

## 1. What the system is for

PLAN.md says the app answers three questions for **every client, every tax type and every tax period** (an *obligation*):

| Question | Where it is recorded | Where you see it |
| --- | --- | --- |
| **1. Advised?** Has the client been sent the tax advice for that period? | Tax Advice (tick boxes) | Tax Advice grid, client page, dashboard |
| **2. Money received?** Has the client given the firm the money: how, when, under which reference? | Client Receipts | Receipts table, IRD panel, client page |
| **3. Paid to IRD?** Has the payment been made to the Inland Revenue Department: when, how much? | IRD Payments | IRD grid (workbook layout), client page |

From questions 2 and 3 the app works out a **money status** for each obligation:

| Status (badge) | Meaning | Rule |
| --- | --- | --- |
| **No activity** | Nothing recorded yet | No receipts and no payments |
| **Payment pending, Rs X held** | Client money is with the firm; the IRD payment isn't (fully) made | Received − paid by firm is above zero |
| **To recover, Rs X** | The firm paid the IRD; the client still owes the firm | Received − paid by firm is below zero |
| **Settled** | Received and paid match | Balance is zero and something was paid |

*Paid by the client directly* counts as **paid**, but not against money the firm holds (see Dr. Priya Ratnayake below).

### Tax types and period codes (never typed, always generated)

| Tax type | Period family | Codes for the year shown | Due dates |
| --- | --- | --- | --- |
| CIT, IIT, PIT | Income tax: year of assessment 1 April to 31 March | 2026/27 → `26271` `26272` `26273` `26274` then final `26270` | 15 Aug, 15 Nov, 15 Feb, 15 May; final 30 Sep after the year |
| WHT, APIT | Monthly: calendar year | 2026 → `26010` (Jan) … `26120` (Dec) | 15th of the following month |

---

## 2. The demo clients and their stories

| Client | Type | Tax types | What it demonstrates |
| --- | --- | --- | --- |
| **DEMO Ceylon Tea Exports (Pvt) Ltd** | Company | CIT, WHT, APIT | All four 2026/27 instalments advised **in one action**. **One cheque split over two periods** (CHQ-100451: CIT 26271 + WHT July). 2025/26 final paid in **two parts**. WHT and APIT advised, received and paid **every month Jan–Oct**. Money **held** for CIT 26272 and WHT October. An advice date that was **corrected**. |
| **DEMO Lakeside Hotels PLC** | Company | CIT, APIT | **Firm pays first.** CIT 26271 paid by the firm, then reimbursed → settled. CIT 26272 paid by the firm, not reimbursed → **to recover Rs 600,000**. APIT September partly reimbursed → **to recover Rs 110,000**. |
| **DEMO Kandy Motors (Pvt) Ltd** | Company | CIT, WHT | 2025/26 final `25260` paid in **four part-payments** (four cheques in, four payments out). 2025/26 1st instalment `25261` paid **15 months after its due date**. **Not advised** for CIT 26272. WHT September money **held** since 9 Oct (the oldest held money). |
| **DEMO Old Harbour Traders (Pvt) Ltd** | Company | CIT | An **inactive** client. Hidden from the grids, but its settled 2025/26 history is kept. |
| **DEMO Saman Wijesinghe** | Individual | IIT | A simple **cheque → payment → settled** for 26271. **Cash** received for 26272, not yet paid (held). A **duplicate receipt that was deleted** (kept in the audit log). |
| **DEMO Dr. Priya Ratnayake** | Individual | IIT, APIT | IIT 26271 **paid by the client directly**: shown as paid, status settled, but no money passed through the firm. APIT Aug–Sep settled; October advised but nothing received yet. |
| **DEMO Nirosha Bandara** | Individual | IIT | Advised for 26271 but no money yet. **Not advised** for 26272. |
| **DEMO Fernando & Silva Associates** | Partnership | PIT, WHT | **Cash** receipt, settled. **Not advised** for PIT 26272. WHT October received and paid. |
| **DEMO Matara Builders** | Partnership | PIT, WHT | The firm paid **more than the client sent** (received 30,000, paid 45,000) → **to recover Rs 15,000**. **Not advised** for WHT October. |
| **DEMO Galle Fort Partners** | Partnership | PIT | **No activity at all.** An advice mark was ticked by mistake and **unticked** (kept in the audit log). |

**Expected totals right now** (use these to check yourself):

- **Money held, IRD payment not made:** Rs 565,000.00 across 4 obligations
- **To recover from clients:** Rs 725,000.00 across 3 obligations (Lakeside 710,000; Matara 15,000)
- **Not advised for the next due period:** CIT 1 of 3, IIT 1 of 3, PIT 2 of 3, WHT 1 of 4, APIT 0 of 3

---

## 3. Signing in and finding your way

1. Open the live app. If you're signed out you always land on **Sign in**. There is no sign-up: staff are invited from Supabase (Authentication → Users → Invite user).
2. Sign in with your email and password.
3. The **left sidebar** has the seven screens: Dashboard, Clients, Tax Advice, Client Receipts, IRD Payments, Outstanding, Settings. Your email is shown at the bottom with **Sign out**. Signing out only signs out *this* browser.

Everything is filtered through the address bar. If you send a colleague the link of a filtered screen, they see the same view.

---

## 4. Dashboard: what needs doing today

**Purpose:** a one-glance summary of advice still to send and money still to sort out.

What the demo shows:

- **Not yet advised:** for the next period due in each tax type. CIT `26272`: *1 of 3 not advised* (Kandy Motors). PIT `26272`: *2 of 3* (Fernando & Silva, Galle Fort). WHT `26100`: *1 of 4* (Matara Builders). APIT `26100`: *0 of 3*.
- **Money held, IRD payment not made:** Rs 565,000.00, 4 obligations.
- **To recover from clients:** Rs 725,000.00, 3 obligations.
- **Falling due in the next 14 days:** `26272` and `26100` (both due today), with how many clients still need advice per tax type.

**Try it**

1. Click the **CIT 26272** line. You land on Tax Advice, already filtered to *Not advised for 26272*, showing only **DEMO Kandy Motors**.
2. Go back and click **View in Outstanding** on the money-held card.

---

## 5. Clients

**Purpose:** the list of clients and the tax types each one pays. Everything else hangs off this.

### 5.1 The list

- Search box (name, contact person or TIN), **tax type** filter, **status** filter (Active / Inactive / both).
- **Try it:** filter tax type **APIT** → 3 clients (Ceylon Tea, Lakeside, Dr. Ratnayake). Set status to **Inactive** → only **DEMO Old Harbour Traders**. Search `perera` → **DEMO Kandy Motors**, found through its contact person, Ruwan Perera.

### 5.2 The client page

Click **DEMO Ceylon Tea Exports**. You see the contact details, tax types, and **Obligations** for the chosen year: one table per tax type, every period code with **Advice**, **Received**, **Paid to IRD** and **Status**, plus totals.

- Hover a green **Advised** badge to see the date and who marked it.
- Use the year picker: **2025/26 · 2025** shows the 2025/26 final `25260` as Settled (1,250,000 in two parts).
- **Export to Excel** downloads this table.

### 5.3 Add a client

**Try it:** Clients → **Add client** →

- Name `DEMO Practice Client`, type **Company**, tick **CIT** and **WHT**, add a contact name → **Add client**.
- Try adding `demo practice client` again: you get *A client with this name already exists* (names are unique, ignoring capitals and spaces).

### 5.4 Bulk add (CSV)

**Try it:** Clients → **Bulk add** → paste:

```
name,client_type,tax_types
DEMO Bulk One (Pvt) Ltd,company,CIT;WHT
DEMO Bulk Two,individual,IIT
DEMO Bulk Three,partnership,PIT
DEMO Ceylon Tea Exports (Pvt) Ltd,company,CIT
DEMO Bulk Four,firm,VAT
```

Click **Check file**. The first three are *OK*; line 5 is flagged as a duplicate; line 6 has an unknown client type and tax type. Click **Import 3 clients**. Only the valid rows are added. (**Download template** gives you a starter file.)

### 5.5 Edit, deactivate, delete

- **Edit** lets you change details, tick/untick tax types, and switch a client **inactive**. Unticking a tax type hides it from the screens but keeps its records.
- **Delete** appears only for clients with **no** advice marks, receipts or payments (for example your new `DEMO Bulk Two`). Clients with history can only be made inactive. **Try it** on `DEMO Bulk Two`.

---

## 6. Tax Advice: who still needs the advice email

**Purpose:** answer question 1 for every client and period.

Open **Tax Advice**. Tabs: **Income tax** (CIT, then IIT, then PIT) · **WHT** · **APIT**. The year picker defaults to the current year of assessment (2026/27) or calendar year (2026).

- Each column is a period code with its label and due date, and a counter: **Advised X of Y**.
- A ticked box shows the advice date underneath. Hover it to see who ticked it and when.

What the demo shows (Income tax, 2026/27):

- **Ceylon Tea:** all four instalments ticked with the same date, 20/07/2026 (one email covered them).
- **Kandy Motors, Nirosha Bandara, Fernando & Silva, Galle Fort:** not advised for `26272`.
- The **WHT** and **APIT** tabs show Ceylon Tea advised every month Jan–Oct.

**Try it**

1. **Filter:** choose *Not advised for 26272 2nd Instalment* → exactly Kandy Motors, Nirosha Bandara, Fernando & Silva, Galle Fort. The `26272` counter still reads "Advised 5 of 9" because counters always cover every client, whatever the filter.
2. **Tick one box:** tick **Kandy Motors → 26272**. It's saved immediately with today's date and your name. The counter goes up and Kandy disappears from the filtered view.
3. **Change the date:** click the small date under the tick and pick an earlier day (future dates are blocked).
4. **Untick:** untick it again. You're asked to confirm; the mark disappears but stays in the audit log.
5. **Mark a whole year:** on **DEMO Nirosha Bandara**, click **Mark year**, keep the date, **Mark as advised**. All four instalments are ticked in one action (the final `26270` is left alone; it's usually advised separately).
6. **Mark selected clients:** tick the select boxes on the left for **Fernando & Silva** and **Galle Fort**, choose period `26272` in the bar that appears, then **Mark selected**.
7. **WHT tab:** tick **Matara Builders → 26100**. The dashboard's WHT line becomes *0 of 4*.

---

## 7. Client Receipts: money the client gave the firm

**Purpose:** answer question 2. Each row is one tax type and period; one cheque can cover several.

The table shows date received, client, funding method, payment mode, reference, tax type, period code, amount and who entered it, with the **total of the filtered rows** at the bottom.

- **Funding method:** *Client paid first* (the client sent the money before the IRD payment) or *Reimbursement* (the firm paid first and the client is paying it back).
- **Payment mode:** Cheque, Online transfer or Cash. **A reference number is required for cheques and transfers.**

What the demo shows:

- **CHQ-100451:** search the reference. Two rows, Ceylon Tea CIT `26271` (400,000) and WHT `26070` (50,000). **One cheque, two periods.**
- **Lakeside Hotels:** filter Funding method → *Reimbursement*. Two rows (600,000 and 200,000).
- **Kandy Motors:** CHQ-30011 … CHQ-30014, four cheques for the same final `25260`.
- **Saman Wijesinghe:** one cash receipt for `26272` (the duplicate was deleted, so it no longer shows).

**Try it**

1. **Filters:** combine **Tax type CIT** + **Year 2025/26 · 2025** + **Payment mode Cheque**. The total updates with every filter. Try the date range and the reference search too.
2. **Split cheque:** **Add receipt** → client **DEMO Matara Builders** → mode **Cheque**, reference `CHQ-DEMO-1` → line 1: **PIT**, period `26272`, `15,000` → **Add another line** → line 2: **WHT**, period `26100`, `20,000` → **Save receipt**. You're taken to the list filtered to `CHQ-DEMO-1`: two rows, same reference, total 35,000. *(This settles Matara's PIT 26272, which was 15,000 short, and leaves WHT 26100 with 20,000 held, so it now appears under Outstanding → Payment pending.)*
3. **Missing reference:** start another receipt with mode **Cheque** and leave the reference empty → *Enter the reference number for cheques and online transfers.*
4. **Edit / Delete:** use the pencil and bin icons on a row. Delete asks for confirmation; deleted rows disappear from screens and totals but stay in the audit log.

---

## 8. IRD Payments: the workbook view

**Purpose:** answer question 3 in the same layout as the old workbooks.

### 8.1 Grid

Tabs and year picker like Tax Advice. Clients run down the side and period codes across; each cell lists every payment as **date · amount**. The bottom row totals each column.

- **Amber cell, "Held X":** money received, IRD payment not made. This replaces the old habit of typing an amount with no date.
- **Red cell, "Recover X":** the firm paid more than it received.
- **"(client)"** after an amount: paid by the client directly.

What the demo shows:

- **Income tax · 2025/26:** **Kandy Motors `25260`** has **four payments stacked** in one cell. **Ceylon Tea `25260`** has two. **Kandy `25261`** shows a payment dated **25/10/2026**, more than a year after its due date (15/08/2025).
- **Income tax · 2026/27:** **Ceylon Tea `26272`** amber, *Held 400,000*. **Saman `26272`** amber, *Held 75,000*. **Lakeside `26272`** red, *Recover 600,000*. **Dr. Ratnayake `26271`** shows 90,000 *(client)*.
- **APIT · 2026:** **Lakeside `26090`** red, *Recover 110,000*. Ceylon Tea paid every month.

### 8.2 Side panel

Click any cell. The panel shows **Received / Paid to IRD / Balance held**, the receipts, the payments (each with **edit** and **delete**), and a form to **add a payment**.

**Try it**

1. Income tax · 2026/27 → click **Ceylon Tea → 26272** (amber, held 400,000).
2. Add a payment: date **15/11/2026**, amount `400000`, paid by **Firm**, reference `IRD-DEMO-1` → **Add payment**. The badge turns **Settled**, the cell loses its amber, and the held total on the dashboard drops by 400,000.
3. **Part-payments:** click **Saman → 26272**, add `25,000` today, then another `50,000`. Both stack in the cell; after the second it's Settled.
4. **Late payment:** switch the year to **2025/26**, click **Kandy Motors → 25262** (due 15/11/2025) and add a payment of `10,000` dated today. It's accepted a year after the due date. Because Kandy hasn't sent money for it, the cell turns red, *Recover 10,000*, and appears under Outstanding → To recover.
5. **Paid by the client:** on **Dr. Ratnayake → IIT 26272** add `90,000` with **Paid by: Client directly**. It shows *(client)* and the status is Settled without any receipt.

### 8.3 List view

Switch to **List**: every payment as a row with the same filters as Client Receipts (with **Paid by** instead of funding/mode) and a filtered total. **Open** jumps to that payment's cell in the grid with the panel open.

---

## 9. Outstanding: money to act on

**Payment pending** (oldest money first) lists obligations where client money is held:

| Held since | Client | Period | Held |
| --- | --- | --- | --- |
| 09/10/2026 | Kandy Motors | WHT 26090 | 35,000.00 |
| 07/11/2026 | Ceylon Tea | WHT 26100 | 55,000.00 |
| 10/11/2026 | Ceylon Tea | CIT 26272 | 400,000.00 |
| 12/11/2026 | Saman Wijesinghe | IIT 26272 | 75,000.00 |

**To recover** lists obligations the firm paid that the client hasn't reimbursed, with a subtotal per client:

| Client | Period | To recover |
| --- | --- | --- |
| Lakeside Hotels | CIT 26272 | 600,000.00 |
| Lakeside Hotels | APIT 26090 | 110,000.00 |
| *Lakeside subtotal* | | *710,000.00* |
| Matara Builders | PIT 26272 | 15,000.00 |

*(If you already did the "Try it" steps above, Ceylon Tea CIT 26272, Saman and Matara will have moved to Settled.)*

**Try it:** click **Open** on Lakeside CIT 26272 → you land in the IRD grid with the panel open. Now record the reimbursement the normal way: **Client Receipts → Add receipt**, client Lakeside, funding **Reimbursement**, Online transfer `TRF-DEMO-2`, CIT `26272`, `600,000`. Lakeside drops to 110,000 in Outstanding.

---

## 10. Excel export

Every table and grid has **Export to Excel** in the top right. The export uses the filters you have on screen.

- **IRD Payments grid → Export** gives the **old workbook layout**: period codes across (each with Date and Amount columns), clients down the side, extra rows for part-payments, amber/red fills with a note on held and to-recover cells, and a total row. Try it on **Income tax · 2025/26** to see Kandy Motors' four part-payments.
- Dates are real Excel dates (DD/MM/YYYY), so you can sort and filter them; amounts are real numbers.

---

## 11. Settings

- **Generate periods:** pick a year → **Generate periods**. It creates the five income codes for that year of assessment and twelve monthly codes for that calendar year. Running it twice adds nothing. Remember to generate each new year before its first due date (2028/29 and 2028 already exist).
- **Due dates:** pick a year and change any due date if the IRD moves it.
- **Staff accounts:** read-only list. Staff are added and removed in Supabase.

---

## 12. The audit trail

Every insert, change and delete of advice marks, receipts and IRD payments is recorded automatically, with who did it, when, and the row before and after. There is no screen for it yet. To look at it: Supabase → **Table Editor → audit_log**.

Demo examples to find there:

- Saman Wijesinghe's **deleted duplicate cash receipt** (`insert`, then `delete`).
- Galle Fort's **unticked advice mark** (`insert`, then `delete`).
- Ceylon Tea's **corrected advice date** for `25260` (`insert`, then `update`: 20/08 → 25/08/2026).

---

## 13. Checklist: everything PLAN.md asked for, and where to see it

| PLAN.md requirement | Where to see it in the demo |
| --- | --- |
| Advice tracked per period code; four instalments + final, or monthly | Tax Advice tabs |
| Advice marking: date and who, no amounts or email text | Hover a tick |
| Received but not paid shown clearly | Amber cells; Outstanding → Payment pending |
| Firm pays first; client reimburses | Lakeside Hotels |
| Client pays the IRD directly | Dr. Ratnayake IIT 26271 |
| Receipts table with filters and total | Client Receipts |
| One cheque over several periods | CHQ-100451 (Ceylon Tea) |
| Several payments per period (up to eight in the workbook) | Kandy Motors 25260 (four) |
| Payments long after the period | Kandy Motors 25261 |
| IRD workbook layout + export | IRD Payments grid + Export |
| Not-advised filter, bulk marking, counters | Tax Advice |
| Outstanding: pending (oldest first) and to recover (per client) | Outstanding |
| Dashboard cards and due-in-14-days | Dashboard |
| Codes generated, never typed; due dates editable | Settings |
| No hard deletes; deleted rows kept in audit log | Section 12 |
| Inactive clients kept with history | Old Harbour Traders |

---

## 14. When you've finished

Tell Claude you're ready to remove the demo data. Every `DEMO` client and everything attached to it (advice marks, receipts, payments and their audit entries), plus anything you created in the "Try it" steps (also named `DEMO …`), will be shown to you as a count first, then removed. The tax periods and staff accounts stay.
