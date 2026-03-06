# CryptoTaxPro

## Current State
- Full app with Dashboard, Transactions, Tax Reports, Tax-Loss Harvesting, Integrations, Pricing, Settings pages
- Internet Identity infrastructure exists (InternetIdentityProvider in main.tsx, useInternetIdentity hook) but is unused
- No login gate: app loads directly into the dashboard for any visitor
- No login/logout button anywhere in the UI
- Transactions page has Add/Edit/Delete but no CSV import

## Requested Changes (Diff)

### Add
- **Login gate**: A full-screen login page shown to unauthenticated visitors. Shows the CryptoTaxPro brand, a brief value proposition, and a "Sign in with Internet Identity" button. After successful login, redirect to /dashboard.
- **User menu in sidebar**: Replace or augment the sidebar bottom area with a user principal display + logout button (calls `clear()` from useInternetIdentity).
- **CSV import dialog on Transactions page**: A new "Import CSV" button next to "Add Transaction". Opens a dialog with: file dropzone (accepts .csv), a sample format note (columns: date, type, asset, assetName, exchange, amount, priceUSD, costBasisUSD, gainLossUSD, notes), a parse/preview step showing how many rows were detected, then an import button that calls addTransaction for each parsed row.

### Modify
- **AppLayout**: After login is added, the sidebar bottom section should show the user's short principal ID and a logout button.
- **App routing**: Wrap protected routes so unauthenticated users are redirected to /login. The /login route is public.

### Remove
- Nothing removed

## Implementation Plan
1. Add a `/login` route and `Login.tsx` page using `useInternetIdentity` -- shows brand + "Sign in with Internet Identity" CTA.
2. Create an `AuthGuard` component (or logic in AppLayout) that checks `identity` from `useInternetIdentity`; if not present, redirect to `/login`.
3. Update `AppLayout` sidebar bottom section: show truncated principal + logout button.
4. Add "Import CSV" button to Transactions page header.
5. Build `CsvImportDialog` component: file input/dropzone, CSV parsing (no external lib needed -- manual split on newlines/commas), preview row count, import all rows via `useAddTransaction`.
6. Wire routes in App.tsx: add `/login` as a public route outside the auth-guarded layout.
