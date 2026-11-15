# Tax Tracker: hands-on workbook

In this workbook you build a complete demo data set yourself, screen by screen. Every feature in PLAN.md gets used along the way. After each part there is a **checkpoint**: numbers you should see on screen if everything was entered correctly.

- **Live app:** https://tax-tracker-peach.vercel.app
- **The system starts empty.** Only the tax periods (2025/26 to 2028/29 and calendar 2025 to 2028) and the staff accounts exist.
- **Every demo client's name starts with `DEMO`.** When you've finished, tell Claude and all demo data will be removed together.
- **Time needed:** about 1 to 2 hours. You can stop between parts; everything is saved as you go.

---

## Before you start: five things to know

1. **Period codes are never typed.** You always pick them from a list (e.g. `26272 · 2nd Instalment · 2026/27`). You can type part of the code to search the list.
2. **Dates are always picked from a calendar**, shown as DD/MM/YYYY. Dates in the future can't be picked. Use the month and year drop-downs at the top of the calendar to jump back.
3. **Amounts** can be typed as `400000` or `400,000`. They're tidied to `400,000.00` when you leave the box.
4. **Everything is saved immediately.** A green message confirms each save. If you make a mistake, every record can be edited or deleted (see Part 5).
5. **What the app tracks** for every client, tax type and period: **1. Advised?** (Tax Advice) **2. Money received from the client?** (Client Receipts) **3. Paid to the IRD?** (IRD Payments). From 2 and 3 it works out a money status:

| Status | Meaning |
| --- | --- |
| **No activity** | Nothing received or paid yet |
| **Payment pending, Rs X held** | Client money is with the firm; the IRD payment isn't (fully) made |
| **To recover, Rs X** | The firm paid the IRD; the client still owes the firm |
| **Settled** | What the firm received equals what the firm paid |

Payments marked **Paid by: Client directly** count as paid but don't use the firm's money (Part 4 shows an example).

### The ten demo clients and their stories

| Client | Type | Tax types | Story |
| --- | --- | --- | --- |
| DEMO Ceylon Tea Exports (Pvt) Ltd | Company | CIT, WHT, APIT | Pays on time. One cheque covers two periods. Final tax paid in two parts. Money held for CIT 26272 and WHT October. |
| DEMO Lakeside Hotels PLC | Company | CIT, APIT | The firm pays first; the hotel reimburses later, sometimes only partly. |
| DEMO Kandy Motors (Pvt) Ltd | Company | CIT, WHT | Pays the 2025/26 final tax in four parts. Pays an old instalment 15 months late. |
| DEMO Old Harbour Traders (Pvt) Ltd | Company | CIT | Closed business: becomes inactive at the end, but its history stays. |
| DEMO Saman Wijesinghe | Individual | IIT | Pays by cheque, then in cash. A duplicate receipt is entered by mistake and deleted. |
| DEMO Dr. Priya Ratnayake | Individual | IIT, APIT | Pays the IRD herself once. Employs staff (APIT). |
| DEMO Nirosha Bandara | Individual | IIT | New client; advised once, no money yet. |
| DEMO Fernando & Silva Associates | Partnership | PIT, WHT | Pays in cash. |
| DEMO Matara Builders | Partnership | PIT, WHT | The firm pays more than the client sent. |
| DEMO Galle Fort Partners | Partnership | PIT | Nothing recorded. An advice mark ticked by mistake is unticked. |

---

## Part 1: Clients

### 1A. Add four companies one by one

Go to **Clients → Add client**. For each company below, fill in the fields, tick the tax types, and click **Add client**. After saving you land on the client's page; click **Clients** in the sidebar to add the next.

| Client name | Client type | Tax types | Contact person | Phone | TIN | Notes |
| --- | --- | --- | --- | --- | --- | --- |
| DEMO Ceylon Tea Exports (Pvt) Ltd | Company | CIT, WHT, APIT | Anura Jayasuriya | 011 234 5678 | 114567890 | One advice email usually covers all four CIT instalments. |
| DEMO Lakeside Hotels PLC | Company | CIT, APIT | Mala Senanayake | 081 222 3344 | 104455667 | The firm usually pays the IRD first. |
| DEMO Kandy Motors (Pvt) Ltd | Company | CIT, WHT | Ruwan Perera | 081 555 1212 | 109988776 | |
| DEMO Old Harbour Traders (Pvt) Ltd | Company | CIT | N. Rajapaksa | 021 222 1111 | 108877665 | Business closed. |

**Try the duplicate check:** click **Add client** again and type `demo kandy motors (pvt) ltd` (small letters), choose Company, tick CIT, save. You get *A client with this name already exists.* Click **Cancel**.

### 1B. Add six clients at once (bulk add)

Go to **Clients → Bulk add** and paste this into the box (the last two lines are deliberately wrong):

```
name,client_type,tax_types
DEMO Saman Wijesinghe,individual,IIT
DEMO Dr. Priya Ratnayake,individual,IIT;APIT
DEMO Nirosha Bandara,individual,IIT
DEMO Fernando & Silva Associates,partnership,PIT;WHT
DEMO Matara Builders,partnership,PIT;WHT
DEMO Galle Fort Partners,partnership,PIT
DEMO Kandy Motors (Pvt) Ltd,company,CIT
DEMO Wrong Example,firm,VAT
```

1. Click **Check file**. The preview says **6 ready to import, 2 with errors**: Kandy Motors *already exists*, and the last line has an *unknown client type "firm"* and an *unknown tax type "VAT"*.
2. Click **Import 6 clients**. Only the six valid rows are added.

### 1C. Edit a client

Open **DEMO Dr. Priya Ratnayake** (click her name in the list) → **Edit**. Add contact person `Dr. Priya Ratnayake`, phone `071 987 6543`, notes `Sometimes pays the IRD herself.` → **Save changes**.

### ✅ Checkpoint 1

On **Clients**:
- The list shows **10 clients**.
- Tax type filter **APIT** → **3** (Ceylon Tea, Lakeside, Dr. Ratnayake). **PIT** → **3**. **WHT** → **4**.
- Search `perera` → **Kandy Motors** (found through its contact person, Ruwan Perera).
- Open **Ceylon Tea**: tax types CIT, WHT, APIT, and an **Obligations** section with every period of 2026/27 and 2026, all *Not advised* and *No activity*.

---

## Part 2: Tax Advice

**Purpose:** record that the advice email for a period was sent. Go to **Tax Advice**. The tabs are **Income tax** (CIT, IIT, PIT), **WHT** and **APIT**. Each column is a period code with an **Advised X of Y** counter.

Three ways to mark advice:

| Way | When to use | How |
| --- | --- | --- |
| **Tick a box** | One client, one period, sent today | Click the box. It saves today's date and your name. |
| **Mark year** | One email covered the whole year for one client | The **Mark year** button at the end of the client's row. Pick the date the email was sent. |
| **Mark selected** | Same period for several clients | Tick the small boxes at the left of the rows; a bar appears. Choose the period and the date, then **Mark selected**. |

### 2A. Income tax, 2026/27

Make sure the tab is **Income tax** and the year is **2026/27**.

1. **Mark year:** on **Ceylon Tea**, click **Mark year**, set the date to **20/07/2026**, then **Mark as advised**. All four instalments (26271–26274) are ticked; the final `26270` is not (it's usually advised separately).
2. **Mark selected, 26271:** tick the left boxes for **Lakeside, Kandy Motors, Saman, Dr. Ratnayake, Nirosha, Fernando & Silva, Matara Builders** (7 clients). In the bar choose **26271 1st Instalment**, date **05/08/2026**, then **Mark selected**.
3. **Mark selected, 26272:** select **Lakeside, Saman, Dr. Ratnayake, Matara Builders**. Choose **26272 2nd Instalment**, date **03/11/2026**, then **Mark selected**.
4. **Tick by mistake, then untick:** tick **Galle Fort → 26271**. Hover the tick: it shows today's date and your name. Now click it again. You're asked *Remove this advice mark?* → **Remove mark**. (The removal is kept in the audit log.)

### 2B. Income tax, 2025/26

Change the year to **2025/26**.

1. **Kandy Motors → 25261:** select only Kandy Motors, choose **25261**, date **01/08/2025** → **Mark selected**. (Use the calendar's year drop-down to reach 2025.)
2. **Kandy Motors and Old Harbour → 25260:** select both, choose **25260 Final Tax Payment**, date **25/06/2026** → **Mark selected**. Then change Old Harbour's date: click the small date under its tick and pick **15/08/2026**.
3. **Ceylon Tea → 25260, then correct the date:** tick the box directly (it saves today's date). Click the small date under the tick and change it to **25/08/2026**.

### 2C. WHT, 2026

Switch to the **WHT** tab, year **2026**. Use **Mark selected** each time:

| Period | Clients | Date |
| --- | --- | --- |
| 26080 August 2026 | Ceylon Tea | 05/09/2026 |
| 26090 September 2026 | Ceylon Tea, Kandy Motors, Matara Builders | 06/10/2026 |
| 26100 October 2026 | Ceylon Tea, Kandy Motors, Fernando & Silva | 05/11/2026 |

### 2D. APIT, 2026

Switch to the **APIT** tab, year **2026**:

| Period | Clients | Date |
| --- | --- | --- |
| 26080 August 2026 | Ceylon Tea, Dr. Ratnayake | 04/09/2026 |
| 26090 September 2026 | Ceylon Tea, Lakeside, Dr. Ratnayake | 04/10/2026 |
| 26100 October 2026 | Ceylon Tea, Lakeside, Dr. Ratnayake | 04/11/2026 |

### ✅ Checkpoint 2

- **Income tax · 2026/27** counters: 26271 **Advised 8 of 10**, 26272 **5 of 10**, 26273 **1 of 10**, 26274 **1 of 10**, 26270 **0 of 10**.
- Filter **Not advised for 26272** → exactly **Kandy Motors, Old Harbour, Nirosha, Fernando & Silva, Galle Fort** (5). The counters don't change with the filter.
- **Income tax · 2025/26:** 25261 **1 of 10**, 25260 **3 of 10**. Hover Ceylon's 25260 tick: *Advised on 25/08/2026 by …*.
- **WHT · 2026:** 26080 **1 of 4**, 26090 **3 of 4**, 26100 **3 of 4**.
- **APIT · 2026:** 26080 **2 of 3**, 26090 **3 of 3**, 26100 **3 of 3**.

---

## Part 3: Client Receipts

**Purpose:** record money the client gave the firm. Go to **Client Receipts → Add receipt**.

The form has a **header** (client, date received, funding method, payment mode, reference number) and one or more **lines** (tax type, period, amount). One cheque that covers several periods = one receipt with several lines.

- **Funding method:** *Client paid first* (the normal case) or *Reimbursement* (the firm already paid the IRD and the client is paying it back).
- **Reference number** is required for **Cheque** and **Online transfer**, and optional for **Cash**.

### 3A. One cheque covering two periods (step by step)

1. **Client:** type `ceylon` and pick **DEMO Ceylon Tea Exports**.
2. **Date received:** **05/08/2026**. **Funding method:** Client paid first. **Payment mode:** Cheque. **Reference:** `CHQ-100451`.
3. **Line 1:** tax type **CIT**, period: type `26271` and pick it, amount `400000`.
4. Click **Add another line**. **Line 2:** tax type **WHT**, period `26070` (July 2026), amount `50000`.
5. The running total shows **Rs 450,000.00**. Click **Save receipt**.

You land on the list filtered to `CHQ-100451`: **two rows**, same reference, total **450,000.00**.

### 3B. Try a mistake on purpose

Add receipt → Ceylon Tea → mode **Cheque**, leave the **reference empty**, one line CIT 26272 `1000` → **Save receipt**. You get *Enter the reference number for cheques and online transfers.* Click **Cancel**; nothing is saved.

### 3C. Enter the remaining receipts

Enter each row below as **one receipt**. Rows marked **(2 lines)** are one receipt with **Add another line**.

| # | Client | Date received | Funding | Mode | Reference | Lines (tax type · period · amount) |
| --- | --- | --- | --- | --- | --- | --- |
| 1 | Ceylon Tea | 10/11/2026 | Client paid first | Online transfer | TRF-77821 | CIT · 26272 · 400,000 |
| 2 | Ceylon Tea | 20/09/2026 | Client paid first | Cheque | CHQ-100520 | CIT · **25260** · 1,250,000 |
| 3 | Ceylon Tea | 08/09/2026 | Client paid first | Online transfer | TRF-CT-2608 | **(2 lines)** WHT · 26080 · 53,000 + APIT · 26080 · 140,000 |
| 4 | Ceylon Tea | 08/10/2026 | Client paid first | Online transfer | TRF-CT-2609 | **(2 lines)** WHT · 26090 · 54,000 + APIT · 26090 · 142,500 |
| 5 | Ceylon Tea | 07/11/2026 | Client paid first | Online transfer | TRF-CT-2610 | **(2 lines)** WHT · 26100 · 55,000 + APIT · 26100 · 145,000 |
| 6 | Lakeside Hotels | 02/09/2026 | **Reimbursement** | Online transfer | TRF-55102 | CIT · 26271 · 600,000 |
| 7 | Lakeside Hotels | 30/10/2026 | **Reimbursement** | Cheque | CHQ-77001 | APIT · 26090 · 200,000 |
| 8 | Kandy Motors | 10/07/2026 | Client paid first | Cheque | CHQ-30011 | CIT · 25260 · 500,000 |
| 9 | Kandy Motors | 10/08/2026 | Client paid first | Cheque | CHQ-30012 | CIT · 25260 · 500,000 |
| 10 | Kandy Motors | 10/09/2026 | Client paid first | Cheque | CHQ-30013 | CIT · 25260 · 500,000 |
| 11 | Kandy Motors | 10/10/2026 | Client paid first | Cheque | CHQ-30014 | CIT · 25260 · 500,000 |
| 12 | Kandy Motors | 20/10/2026 | Client paid first | Cheque | CHQ-30020 | CIT · **25261** · 180,000 |
| 13 | Kandy Motors | 09/10/2026 | Client paid first | Online transfer | TRF-88120 | WHT · 26090 · 35,000 |
| 14 | Old Harbour Traders | 10/09/2026 | Client paid first | Cheque | CHQ-12001 | CIT · 25260 · 300,000 |
| 15 | Saman Wijesinghe | 10/08/2026 | Client paid first | Cheque | CHQ-41100 | IIT · 26271 · 75,000 |
| 16 | Saman Wijesinghe | 12/11/2026 | Client paid first | **Cash** | *(leave empty)* | IIT · 26272 · 75,000 |
| 17 | Saman Wijesinghe | 12/11/2026 | Client paid first | **Cash** | *(leave empty)* | IIT · 26272 · 75,000. **This is the deliberate duplicate**; it's deleted in Part 5. |
| 18 | Dr. Priya Ratnayake | 08/09/2026 | Client paid first | Online transfer | TRF-90080 | APIT · 26080 · 85,000 |
| 19 | Dr. Priya Ratnayake | 08/10/2026 | Client paid first | Online transfer | TRF-90090 | APIT · 26090 · 87,500 |
| 20 | Fernando & Silva | 11/08/2026 | Client paid first | **Cash** | *(leave empty)* | PIT · 26271 · 60,000 |
| 21 | Fernando & Silva | 09/11/2026 | Client paid first | Online transfer | TRF-61010 | WHT · 26100 · 18,500 |
| 22 | Matara Builders | 10/11/2026 | Client paid first | Cheque | CHQ-52011 | PIT · 26272 · 30,000 |
| 23 | Matara Builders | 10/10/2026 | Client paid first | **Cash** | *(leave empty)* | WHT · 26090 · 22,000 |

**Tip:** the period list only shows periods for the tax type chosen on that line, and the tax-type list only shows the client's own tax types. Periods from 2025/26 (like `25260`) are further down the list; type the code to find them.

### ✅ Checkpoint 3

On **Client Receipts** (clear all filters first):
- **28 receipts**, total **6,532,500.00** (this still includes Saman's duplicate).
- Filter **Client: Kandy Motors** → **6 rows**, **2,215,000.00**.
- Filter **Funding method: Reimbursement** → **2 rows**, **800,000.00**.
- Filter **Payment mode: Cash** → **4 rows**, **232,000.00**.
- Search reference `TRF-CT` → **6 rows**, **589,500.00** (the three two-line transfers).
- Filter **Year: 2025/26 · 2025** → **7 rows**, **3,730,000.00**.

---

## Part 4: IRD Payments

**Purpose:** record payments made to the IRD, in the layout of the old workbooks. Go to **IRD Payments** (Grid).

- Clients run down the side and period codes across. Each cell lists its payments as **date · amount**.
- **Amber cell "Held X":** money received from the client, IRD payment not made yet.
- **Red cell "Recover X":** the firm paid more than it received.

**To record a payment:** click the cell. A side panel opens with Received / Paid to IRD / Balance held, the receipts, the payments, and an **Add a payment** form (date paid, amount, paid by, reference, note).

### 4A. Look before you pay

Income tax · **2026/27**: Ceylon Tea **26271** is amber, *Held 400,000*. Saman **26272** is amber, *Held 150,000* (because of the duplicate). Lakeside **26271** is amber, *Held 600,000*: the reimbursement is recorded, but the firm's payment isn't yet.

### 4B. Your first payment (step by step)

1. Income tax · 2026/27 → click **Ceylon Tea → 26271**.
2. The panel shows *Received 400,000.00, Paid 0.00, Balance held 400,000.00* and the cheque CHQ-100451.
3. **Add a payment:** date **12/08/2026**, amount `400000`, paid by **Firm** → **Add payment**.
4. The badge turns **Settled** and the cell loses its amber colour. Close the panel (✕ or Esc).

### 4C. Enter the remaining payments

Use the tab and year in the first column, click the client's cell for that period, and add the payment. Paid by is **Firm** unless the table says otherwise. Cells with several payments get several entries: add them one after another in the same panel.

| Tab · year | Client | Period | Date paid | Amount | Notes |
| --- | --- | --- | --- | --- | --- |
| Income · 2026/27 | Lakeside Hotels | 26271 | 14/08/2026 | 600,000 | |
| Income · 2026/27 | Lakeside Hotels | 26272 | 13/11/2026 | 600,000 | No money from the hotel yet → turns **red** |
| Income · 2026/27 | Saman Wijesinghe | 26271 | 14/08/2026 | 75,000 | |
| Income · 2026/27 | Dr. Priya Ratnayake | 26271 | 14/08/2026 | 90,000 | **Paid by: Client directly**. Shows *(client)*. |
| Income · 2026/27 | Fernando & Silva | 26271 | 13/08/2026 | 60,000 | |
| Income · 2026/27 | Matara Builders | 26272 | 14/11/2026 | 45,000 | More than the 30,000 received → **red, Recover 15,000** |
| Income · **2025/26** | Ceylon Tea | 25260 | 25/09/2026 | 750,000 | Part 1 |
| Income · 2025/26 | Ceylon Tea | 25260 | 29/09/2026 | 500,000 | Part 2 → Settled |
| Income · 2025/26 | Kandy Motors | 25260 | 15/07/2026 | 500,000 | Part 1 of 4 |
| Income · 2025/26 | Kandy Motors | 25260 | 14/08/2026 | 500,000 | Part 2 of 4 |
| Income · 2025/26 | Kandy Motors | 25260 | 15/09/2026 | 500,000 | Part 3 of 4 |
| Income · 2025/26 | Kandy Motors | 25260 | 14/10/2026 | 500,000 | Part 4 of 4 → **four payments stacked** in one cell |
| Income · 2025/26 | Kandy Motors | 25261 | 25/10/2026 | 180,000 | Due 15/08/2025: paid **more than a year late**, still accepted |
| Income · 2025/26 | Old Harbour Traders | 25260 | 15/09/2026 | 300,000 | |
| WHT · 2026 | Ceylon Tea | 26070 | 14/08/2026 | 50,000 | The WHT half of cheque CHQ-100451 |
| WHT · 2026 | Ceylon Tea | 26080 | 14/09/2026 | 53,000 | |
| WHT · 2026 | Ceylon Tea | 26090 | 14/10/2026 | 54,000 | |
| WHT · 2026 | Fernando & Silva | 26100 | 11/11/2026 | 18,500 | |
| WHT · 2026 | Matara Builders | 26090 | 14/10/2026 | 22,000 | |
| APIT · 2026 | Ceylon Tea | 26080 | 14/09/2026 | 140,000 | |
| APIT · 2026 | Ceylon Tea | 26090 | 14/10/2026 | 142,500 | |
| APIT · 2026 | Ceylon Tea | 26100 | 12/11/2026 | 145,000 | |
| APIT · 2026 | Lakeside Hotels | 26090 | 15/10/2026 | 310,000 | Only 200,000 reimbursed → **red, Recover 110,000** |
| APIT · 2026 | Dr. Priya Ratnayake | 26080 | 14/09/2026 | 85,000 | |
| APIT · 2026 | Dr. Priya Ratnayake | 26090 | 14/10/2026 | 87,500 | |

**Leave these unpaid on purpose** (they stay amber): Ceylon Tea CIT 26272, Ceylon Tea WHT 26100, Kandy Motors WHT 26090, Saman IIT 26272.

### ✅ Checkpoint 4

- **IRD Payments → List** (no filters): **26 payments**, total **6,707,500.00**. Filter **Paid by: Client directly** → 1 row (Dr. Ratnayake, 90,000).
- **Grid, Income · 2025/26:** Kandy Motors 25260 shows **four** dated payments; the bottom row shows **Total paid 3,550,000.00** under 25260 and **180,000.00** under 25261.
- **Grid, Income · 2026/27:** amber cells are Ceylon Tea 26272 (*Held 400,000*) and Saman 26272 (*Held 150,000*); red cells are Lakeside 26272 (*Recover 600,000*) and Matara 26272 (*Recover 15,000*).

---

## Part 5: Corrections and closing a client

### 5A. Delete the duplicate receipt

**Client Receipts** → filter **Client: Saman Wijesinghe** → on one of the two cash rows of 12/11/2026, click the **bin** icon → **Delete receipt**. The row disappears and the total drops by 75,000. (It stays in the audit log.)

### 5B. Edit a record

Every receipt row has a **pencil** icon (edit), and every payment has an edit icon in its side panel. Try opening one, look at the form, and click **Cancel** without changing anything.

### 5C. Make a client inactive

**Clients → DEMO Old Harbour Traders → Edit →** switch **Active client** off → **Save changes**. Old Harbour disappears from the Tax Advice and IRD grids and from the default client list (filter **Inactive** to see it). Its page and history are kept.

### ✅ Checkpoint 5

- **Client Receipts:** **27 receipts**, total **6,457,500.00**.
- **Tax Advice · Income · 2026/27:** counters now count **9** clients, e.g. 26271 **Advised 8 of 9**. *Not advised for 26272* → **Kandy Motors, Nirosha, Fernando & Silva, Galle Fort** (4).
- **IRD grid, Income · 2026/27:** Saman 26272 now shows *Held 75,000*.

---

## Part 6: Outstanding and Dashboard

### 6A. Outstanding

**Payment pending** (money held, oldest first):

| Held since | Client | Tax type | Period | Held (Rs) |
| --- | --- | --- | --- | --- |
| 09/10/2026 | Kandy Motors | WHT | 26090 | 35,000.00 |
| 07/11/2026 | Ceylon Tea | WHT | 26100 | 55,000.00 |
| 10/11/2026 | Ceylon Tea | CIT | 26272 | 400,000.00 |
| 12/11/2026 | Saman Wijesinghe | IIT | 26272 | 75,000.00 |
| | | | **Total** | **565,000.00** |

**To recover** (the firm paid, the client hasn't reimbursed), with a subtotal per client:

| Client | Tax type | Period | To recover (Rs) |
| --- | --- | --- | --- |
| Lakeside Hotels | CIT | 26272 | 600,000.00 |
| Lakeside Hotels | APIT | 26090 | 110,000.00 |
| *Subtotal Lakeside* | | | *710,000.00* |
| Matara Builders | PIT | 26272 | 15,000.00 |
| | | **Total** | **725,000.00** |

Click **Open** on any row: you land in the IRD grid with that cell's panel open.

### 6B. Dashboard

- **Money held, IRD payment not made:** Rs 565,000.00, 4 obligations.
- **To recover from clients:** Rs 725,000.00, 3 obligations.
- **Not yet advised** is for *the next period falling due from today*, so it depends on the day you look:
  - **Up to and including 15/11/2026** (next due: 26272 and 26100): CIT **1 of 3**, IIT **1 of 3**, PIT **2 of 3**, WHT **1 of 4**, APIT **0 of 3**.
  - **From 16/11/2026** the next periods are 26273 (due 15/02/2027) and 26110 (due 15/12/2026): CIT **2 of 3** (only Ceylon Tea was advised, via Mark year), IIT **3 of 3**, PIT **3 of 3**, WHT **4 of 4**, APIT **3 of 3**.
- Click any **Not yet advised** line: it opens Tax Advice already filtered to the clients still to advise.
- **Falling due in the next 14 days** lists the periods due soon, with not-advised counts per tax type.

### 6C. One client's full picture

Open **Clients → DEMO Ceylon Tea Exports**. With year **2026/27 · 2026** you see CIT, WHT and APIT side by side: advice, received, paid and status for every period, with totals. Switch to **2025/26 · 2025**: 25260 *Settled*, 1,250,000 received and paid.

---

## Part 7: Make something settle

Practise the everyday flow on two held items:

1. **Outstanding → Payment pending → Ceylon Tea CIT 26272 → Open.** In the panel, add a payment: today's date, `400000`, Firm → **Add payment**. Back on Outstanding, Ceylon Tea CIT 26272 is gone and the total is **165,000.00**.
2. **Lakeside reimburses.** **Client Receipts → Add receipt**: Lakeside Hotels, today, **Reimbursement**, Online transfer `TRF-55190`, line CIT 26272 `600000`. On Outstanding → To recover, the Lakeside subtotal drops to **110,000.00**.

---

## Part 8: Excel export

Every table and grid has **Export to Excel** (top right). The file uses the filters on screen.

- **IRD Payments → Grid → Income · 2025/26 → Export to Excel:** the **old workbook layout**, with period codes across (a Date and an Amount column under each), clients down the side, Kandy Motors' four part-payments on four rows, coloured held/to-recover cells with a note, and a total row.
- Try **Client Receipts** with a filter, **Outstanding** (two sheets: Payment pending and To recover), and a **client page**.

---

## Part 9: Settings

- **Generate periods:** creates a year's codes from the rules. Running it twice adds nothing. Years up to 2028/29 and 2028 already exist.
- **Due dates:** change a due date if the IRD moves it. *Try it:* year 2026/27 and 2026 → change `26273` to 16/02/2027, then back to 15/02/2027.
- **Staff accounts:** read-only list. Staff are invited and removed in Supabase.

---

## Part 10: The audit trail

Every insert, change and delete of advice marks, receipts and IRD payments is recorded automatically with who, when, and the row before and after. There is no screen for it yet. To see it: **Supabase → Table Editor → audit_log**, newest first. Look for:

- **client_receipts · delete:** Saman's duplicate cash receipt (Part 5A).
- **advice_marks · delete:** Galle Fort's mark ticked by mistake (Part 2A step 4).
- **advice_marks · update:** Ceylon Tea 25260's date changed to 25/08/2026 (Part 2B step 3).

---

## Checklist: everything PLAN.md asked for

| PLAN.md requirement | Where you did it |
| --- | --- |
| Advice per period code, with the date and who marked it | Part 2 |
| Mark a whole year for one client in one action | Part 2A step 1 |
| Mark one period for selected clients; counters; not-advised filter | Part 2, Checkpoint 2 |
| Receipts with method, date, reference, tax type, period, amount, filters and total | Part 3 |
| One cheque covering several periods (same reference) | Part 3A, rows 3–5 |
| Reference required for cheques and transfers | Part 3B |
| Client pays first / firm pays first (reimbursement) | Ceylon Tea / Lakeside |
| Client pays the IRD directly | Dr. Ratnayake 26271 |
| Several payments for one period | Kandy Motors and Ceylon Tea 25260 |
| Payments long after the period | Kandy Motors 25261 |
| Money received but not paid shown clearly | Amber cells, Outstanding → Payment pending |
| Workbook layout + Excel export | Part 4 grid, Part 8 |
| Outstanding: pending (oldest first) and to recover (per client) | Part 6A |
| Dashboard cards, due in 14 days | Part 6B |
| Codes generated, never typed; due dates editable | Part 9 |
| No hard deletes; deletions kept in the audit log | Part 5, Part 10 |
| Inactive clients keep their history | Part 5C |

When you've finished, tell Claude. It will show you the count of every `DEMO` record, then remove them all so the system is ready for the firm's real data.
