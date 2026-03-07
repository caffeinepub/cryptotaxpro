# CryptoTaxPro

## Current State
The Tax Reports page has:
- Summary stat cards (short-term gains, long-term gains, income, losses, net gains, estimated tax)
- A download section with 4 buttons (Form 8949 CSV, Schedule D CSV, TurboTax CSV, full CSV export)
- A basic Form 8949 preview table showing: Asset, Date Acquired, Date Sold, Proceeds, Cost Basis, Gain/Loss, Term
- An international reports section

The Form 8949 preview is a simple table without IRS-accurate structure. There is no Schedule D preview. The "Form 8949 (PDF)" and "Schedule D" download buttons produce simplified CSVs with incorrect/missing columns.

## Requested Changes (Diff)

### Add
- **Form 8949 in-app preview** -- full IRS-accurate layout:
  - Header section: form title, tax year, taxpayer name
  - Checkbox section showing digital asset boxes (Part I: G/H/I for short-term; Part II: J/K/L for long-term) -- default to Box H (short-term) and Box K (long-term) for all crypto
  - Transaction table with all 8 IRS columns: (a) Description of property, (b) Date acquired, (c) Date sold/disposed, (d) Proceeds, (e) Cost or other basis, (f) Adjustment code(s), (g) Amount of adjustment, (h) Gain or (loss)
  - Subtotals row at the bottom of Part I and Part II
  - Note/disclaimer text referencing 1099-DA
- **Schedule D in-app preview** -- full IRS-accurate layout:
  - Header: form title, tax year
  - Part I (Short-Term): Lines 1a, 1b, 2, 3, 6 (carryover), 7 (net short-term)
  - Part II (Long-Term): Lines 8a, 8b, 9, 10, 11, 13, 14 (carryover), 15 (net long-term), 16 (overall net)
  - Part III Summary: Line 17, 18 (28% rate gain), 19 (unrecaptured 1250), 21 (loss limit), final line 22
  - Each line shows label, description, and computed dollar value
  - Values flow from Form 8949 totals (short-term and long-term column h sums)
- **Tab switcher** on the Tax Reports page to toggle between "Form 8949" and "Schedule D" preview panels
- **Improved CSV downloads**: Form 8949 CSV must include all 8 columns (a)-(h) per IRS spec; Schedule D CSV must include all line items by number and description

### Modify
- The existing Form 8949 preview table -- replace with the new full IRS-accurate layout
- The download buttons for Form 8949 and Schedule D -- update CSV generation to match new column/line structure
- The "Form 8949 Preview" section heading -- update to reflect tab-based navigation

### Remove
- Nothing removed -- existing stat cards, international reports, and other download buttons remain

## Implementation Plan
1. Add tab state (useState) to TaxReports.tsx to switch between Form8949 and ScheduleD preview panels
2. Build Form8949Preview component:
   - Compute short-term and long-term disposal transactions from transactions data
   - For each transaction: populate columns (a)-(h), derive adjustment code "E" if notes mention fees, default adjustment to 0, compute gain/loss as (d)-(e)+(g)
   - Show Part I (short-term, Box H checked) and Part II (long-term, Box K checked) with checkbox UI
   - Show subtotals for each part
3. Build ScheduleDPreview component:
   - Compute Part I lines from Form 8949 short-term totals (lines 1b, 7/15)
   - Compute Part II lines from Form 8949 long-term totals (lines 8b, 15/16)
   - Part III: compute overall net, apply $3,000 loss limit, show line 21
   - Display as a structured form-like layout with line numbers and values
4. Update Form 8949 CSV download to use all 8 columns (a)-(h)
5. Update Schedule D CSV download to use all numbered line items
6. Wire tab buttons with data-ocid markers; add data-ocid markers to all interactive elements in new components
