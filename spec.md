# CryptoTaxPro

## Current State
The app has 7 pages: Dashboard, Transactions, Tax Reports, Harvesting, Integrations, Pricing, Settings. The Integrations page lets users connect exchanges via fake API key flows that generate hardcoded mock transactions -- there is no real API connectivity possible on ICP. The CSV import dialog exists in Transactions.tsx but only parses a custom internal column format (date, type, asset, assetName, exchange, amount, priceUSD, costBasisUSD, gainLossUSD, notes) and doesn't handle real exchange CSV exports.

## Requested Changes (Diff)

### Add
- Robust CSV parsing that handles real-world exchange export formats:
  - **Coinbase**: columns like `Timestamp`, `Transaction Type`, `Asset`, `Quantity Transacted`, `Spot Price at Transaction`, `Subtotal`, `Total (inclusive of fees and/or spread)`, `Notes`
  - **Binance**: columns like `UTC_Time`, `Account`, `Operation`, `Coin`, `Change`, `Remark`
  - **Kraken**: columns like `txid`, `refid`, `time`, `type`, `subtype`, `aclass`, `asset`, `amount`, `fee`, `balance`
  - **Gemini**: columns like `Date`, `Time (UTC)`, `Type`, `Symbol`, `Specification`, `Liquidity Indicator`, `Trading Fee Rate (bps)`, `USD Amount`, `Fee (USD)`, `USD Balance`, `Trade ID`
  - **Generic fallback**: any CSV with recognizable date + asset + amount columns
- Auto-detect which exchange format the CSV is from based on column headers
- Download sample CSV template button in the import dialog so users know what format to use
- Clear label in preview showing which exchange format was detected

### Modify
- `CsvImportDialog` in Transactions.tsx: upgrade parser to handle all formats above, show detected exchange name, add sample download
- `AppLayout.tsx`: remove Integrations nav item
- `App.tsx`: remove integrations route and import
- `useQueries.ts`: remove `useIntegrations`, `useSaveIntegration`, `useDeleteIntegration` hooks and the `IntegrationConnection` import

### Remove
- `src/frontend/src/pages/Integrations.tsx` -- entire file deleted
- Integrations nav entry from sidebar
- Integrations route from router
- Integration-related hooks from useQueries.ts

## Implementation Plan
1. Delete `Integrations.tsx`
2. Remove integrations route + import from `App.tsx`
3. Remove Integrations nav item from `AppLayout.tsx`
4. Remove integration hooks from `useQueries.ts`
5. Rewrite `parseCSV` in `Transactions.tsx` to auto-detect and parse Coinbase, Binance, Kraken, Gemini, and generic CSV formats
6. Add sample CSV download button to the import dialog upload step
7. Show detected exchange name in the preview step
8. Validate and build
