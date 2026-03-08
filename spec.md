# CryptoTaxPro

## Current State
- Integrations page uses only local React state (`useState`) for connection status and API keys -- resets on every page refresh.
- Backend `getPortfolioSummary` returns hardcoded BTC holding and $85,000 total value regardless of actual transactions.
- Backend `getTaxSummary` returns hardcoded gains/losses regardless of actual transactions.
- Backend `getHarvestCandidates` returns a hardcoded ADA candidate regardless of actual transactions.
- No backend storage exists for integration connections or API keys.

## Requested Changes (Diff)

### Add
- Backend: `IntegrationConnection` type storing `id`, `name`, `category`, `connectedAt` (timestamp), and a masked API key indicator (no raw keys stored -- only a boolean `hasApiKey` and optional `address`).
- Backend: `saveIntegration(connection: IntegrationConnection)` -- persists a connection for the caller.
- Backend: `getIntegrations()` -- returns all saved integrations for the caller.
- Backend: `deleteIntegration(id: Text)` -- removes a specific integration for the caller.
- Frontend: On Integrations page, load existing connections from backend on mount and merge with static list.
- Frontend: On "Connect" confirm, call `saveIntegration` to persist. On disconnect, call `deleteIntegration`.

### Modify
- Backend `getPortfolioSummary`: Remove hardcoded values. Return empty holdings and zeros when no transactions exist.
- Backend `getTaxSummary`: Remove hardcoded values. Return zeroed summary when no transactions exist.
- Backend `getHarvestCandidates`: Remove hardcoded ADA candidate. Return empty array when no transactions exist.

### Remove
- Hardcoded mock holdings, tax summary, and harvest candidates from backend query functions.

## Implementation Plan
1. Update `main.mo`:
   - Add `IntegrationConnection` type with fields: `id`, `name`, `category`, `hasApiKey`, `address`, `connectedAt`.
   - Add `userIntegrations` map (`Map<Principal, List<IntegrationConnection>>`).
   - Implement `saveIntegration`, `getIntegrations`, `deleteIntegration`.
   - Fix `getPortfolioSummary` to return empty `{ holdings: [], totalValue: 0.0, totalUnrealizedGain: 0.0 }`.
   - Fix `getTaxSummary` to return zeroed `TaxSummary`.
   - Fix `getHarvestCandidates` to return `[]`.
2. Update `Integrations.tsx`:
   - On mount, call `getIntegrations()` and mark any returned IDs as connected.
   - On `handleConnect`, call `saveIntegration` with the integration id, name, category, and whether an API key was entered.
   - On `handleDisconnect`, call `deleteIntegration(id)`.
   - Show a loading state while fetching.
