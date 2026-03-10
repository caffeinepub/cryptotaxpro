# CryptoTaxPro

## Current State
App has a Motoko backend and React frontend. Tax calculations, CSV import, Form 8949/Schedule D previews, dashboard portfolio, and metrics are all implemented. Multiple bugs exist in tax calculation logic.

## Requested Changes (Diff)

### Add
- FIFO lot matching during CSV import: compute `isShortTerm` by comparing disposal date vs acquisition date of the matched buy lot (holding period > 365 days = long-term)

### Modify
- `getBasis(tx)` in TaxReports.tsx: fix double-multiplication bug — `costBasisUSD` is already the total cost, not per-unit. Change `Math.round(tx.costBasisUSD * tx.amount)` → `Math.round(tx.costBasisUSD)`
- Form 8949 / Schedule D disposals filter: exclude buy-side trades (`tags.includes('buy')`) — currently buys leak into Form 8949 as taxable events
- `useActor.ts`: only create an actor when identity exists (remove anonymous actor creation). Change `enabled: true` → `enabled: !!identity` and remove the `if (!isAuthenticated)` branch
- `waitForActor` in useQueries.ts: after removing anonymous actor, this should work correctly as it waits for a success state actor
- `useUserProfile` in useQueries.ts: remove all mock fallbacks (`mockUserProfile`) and `placeholderData: mockUserProfile`. Return null/default profile object when actor is absent or backend returns nothing
- `isShortTerm: true` hardcode in Transactions.tsx `handleImport`: replace with computed value from FIFO lot matching

### Remove
- Anonymous actor creation in `useActor.ts`
- `placeholderData: mockUserProfile` and catch/null fallbacks to `mockUserProfile` in `useUserProfile`

## Implementation Plan
1. Fix `getBasis()` in TaxReports.tsx (line 71): remove `* tx.amount`
2. Fix all disposals filters in TaxReports.tsx to add `&& !(tx.tags ?? []).includes('buy')` exclusion
3. Fix `useActor.ts`: add `enabled: !!identity`, remove anonymous actor branch
4. Fix `useUserProfile` in useQueries.ts: return default profile values (not mockUserProfile) when backend returns null
5. Add FIFO lot matching in Transactions.tsx `handleImport`: sort rows by date, build per-asset lot queues from buys, for each sell determine acquisition date via FIFO and compute `isShortTerm = holdingDays <= 365`
6. Validate and build
