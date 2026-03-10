import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import type { backendInterface } from "../backend";
import type {
  HarvestCandidate,
  Holding,
  PortfolioSummary,
  TaxSummary,
  Transaction,
  UserProfile,
} from "../backend.d";

import { useActor } from "./useActor";

// ──────────────────────────────────────────────
// Helper: wait for actor from React Query cache (handles race condition
// where hook closure captures a stale null actor on first render)
// Uses queryCache.findAll with prefix matching to check state.data directly,
// which is reliably populated on success even when getQueriesData returns undefined.
// ──────────────────────────────────────────────
export async function waitForActor(
  queryClient: ReturnType<typeof useQueryClient>,
  timeoutMs = 30000,
): Promise<backendInterface> {
  const deadline = Date.now() + timeoutMs;

  while (Date.now() < deadline) {
    const cache = queryClient.getQueryCache();
    const queries = cache.findAll({ queryKey: ["actor"], exact: false });
    for (const query of queries) {
      if (query.state.status === "success" && query.state.data) {
        return query.state.data as backendInterface;
      }
    }
    // Poll every 50ms for faster response
    await new Promise((r) => setTimeout(r, 50));
  }

  throw new Error("Not connected to backend. Please refresh the page.");
}

// ──────────────────────────────────────────────
// Transactions
// ──────────────────────────────────────────────
export function useTransactions() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["transactions"],
    queryFn: async () => {
      if (!actor) return [] as Transaction[];
      return await actor.getTransactions();
    },
    enabled: !!actor,
  });
}

export function useAddTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Transaction) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.addTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useAddTransactions() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (txs: Transaction[]) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.addTransactions(txs);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (tx: Transaction) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.updateTransaction(tx);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: bigint) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.deleteTransaction(id);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

export function useDeleteTransactionsByYear() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (year: number) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.deleteTransactionsByYear(BigInt(year));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["transactions"] });
    },
  });
}

// ──────────────────────────────────────────────
// Shared holding accumulation helper
// ──────────────────────────────────────────────
interface AssetAccumulator {
  netAmount: number;
  totalCostBasis: number;
  lastPriceUSD: number;
  assetName: string;
}

function accumulateHoldings(
  transactions: Transaction[],
): Map<string, AssetAccumulator> {
  const map = new Map<string, AssetAccumulator>();

  for (const tx of transactions) {
    const key = tx.asset;
    if (!map.has(key)) {
      map.set(key, {
        netAmount: 0,
        totalCostBasis: 0,
        lastPriceUSD: 0,
        assetName: tx.assetName,
      });
    }
    const acc = map.get(key)!;

    // Track latest price; derive from cost basis if priceUSD not set
    if (tx.priceUSD > 0) {
      acc.lastPriceUSD = tx.priceUSD;
    } else if (tx.costBasisUSD > 0 && tx.amount > 0) {
      acc.lastPriceUSD = tx.costBasisUSD / tx.amount;
    }
    acc.assetName = tx.assetName || acc.assetName;

    const type = tx.txType.toLowerCase();
    const tags = tx.tags ?? [];
    const isSell =
      type === "sell" ||
      (type === "trade" && tags.includes("sell")) ||
      (type === "trade" && tags.includes("convert") && !tags.includes("buy"));
    const isBuy =
      type === "buy" ||
      (type === "trade" && (tags.includes("buy") || tags.includes("convert")));
    const isNeutral = type === "transfer";

    if (isSell || type === "nft") {
      // Selling / disposing reduces holding
      acc.netAmount -= tx.amount;
    } else if (isNeutral) {
      // Own wallet move — neutral
    } else if (
      isBuy ||
      type === "staking" ||
      type === "airdrop" ||
      type === "mining" ||
      type === "defi" ||
      type === "trade"
    ) {
      // Buy, Staking, Airdrop, Mining, DeFi, generic Trade — adds to holding
      acc.netAmount += tx.amount;
      // costBasisUSD is the total cost for this transaction (not per-unit)
      acc.totalCostBasis += tx.costBasisUSD;
    }
  }

  return map;
}

// ──────────────────────────────────────────────
// Portfolio — computed from transactions + live prices
// livePrices: symbol (uppercase) → current USD price from CoinGecko
// Falls back to last known tx price, then cost basis per unit
// ──────────────────────────────────────────────
export function usePortfolioSummary(livePrices: Record<string, number> = {}): {
  data: PortfolioSummary;
  isLoading: boolean;
} {
  const { data: transactions, isLoading } = useTransactions();

  const data = useMemo<PortfolioSummary>(() => {
    if (!transactions || transactions.length === 0) {
      return { holdings: [], totalValue: 0, totalUnrealizedGain: 0 };
    }

    const map = accumulateHoldings(transactions);
    const holdings: Holding[] = [];

    for (const [asset, acc] of map.entries()) {
      if (acc.netAmount < 0.001) continue;

      const costBasisPerUnit =
        acc.netAmount > 0 ? acc.totalCostBasis / acc.netAmount : 0;

      // Priority: 1) live market price, 2) last known tx price, 3) cost basis per unit
      const livePrice = livePrices[asset.toUpperCase()];
      const currentPriceUSD =
        livePrice != null && livePrice > 0
          ? livePrice
          : acc.lastPriceUSD > 0
            ? acc.lastPriceUSD
            : costBasisPerUnit;

      const currentValueUSD = acc.netAmount * currentPriceUSD;
      const totalCost = acc.totalCostBasis;
      const unrealizedGainLoss = currentValueUSD - totalCost;
      const unrealizedPct =
        totalCost > 0 ? (unrealizedGainLoss / totalCost) * 100 : 0;

      holdings.push({
        asset,
        assetName: acc.assetName || asset,
        amount: acc.netAmount,
        currentPriceUSD,
        currentValueUSD,
        costBasisUSD: costBasisPerUnit,
        unrealizedGainLoss,
        unrealizedPct,
      });
    }

    const totalValue = holdings.reduce((sum, h) => sum + h.currentValueUSD, 0);
    const totalUnrealizedGain = holdings.reduce(
      (sum, h) => sum + h.unrealizedGainLoss,
      0,
    );

    return { holdings, totalValue, totalUnrealizedGain };
  }, [transactions, livePrices]);

  return { data, isLoading };
}

// ──────────────────────────────────────────────
// Tax Summary — computed from transactions
// ──────────────────────────────────────────────
export function useTaxSummary(year: bigint): {
  data: TaxSummary;
  isLoading: boolean;
} {
  const { data: transactions, isLoading } = useTransactions();
  const yearStr = year.toString();

  const data = useMemo<TaxSummary>(() => {
    const empty: TaxSummary = {
      taxYear: year,
      shortTermGains: 0,
      longTermGains: 0,
      income: 0,
      losses: 0,
      netGains: 0,
      estimatedTax: 0,
    };

    if (!transactions || transactions.length === 0) return empty;

    const yearTxs = transactions.filter((tx) => tx.date.startsWith(yearStr));
    if (yearTxs.length === 0) return empty;

    let shortTermGains = 0;
    let longTermGains = 0;
    let income = 0;
    let losses = 0;

    for (const tx of yearTxs) {
      const type = tx.txType.toLowerCase();
      if (type === "staking" || type === "airdrop" || type === "mining") {
        income += tx.gainLossUSD;
      } else if (type === "trade" || type === "nft" || type === "defi") {
        if (tx.gainLossUSD >= 0) {
          if (tx.isShortTerm) {
            shortTermGains += tx.gainLossUSD;
          } else {
            longTermGains += tx.gainLossUSD;
          }
        } else {
          losses += tx.gainLossUSD;
        }
      }
    }

    const netGains = shortTermGains + longTermGains + income + losses;
    const estimatedTax = Math.max(
      0,
      (shortTermGains + income) * 0.37 + longTermGains * 0.2 + losses * 0.3,
    );

    return {
      taxYear: year,
      shortTermGains,
      longTermGains,
      income,
      losses,
      netGains,
      estimatedTax,
    };
  }, [transactions, yearStr, year]);

  return { data, isLoading };
}

// ──────────────────────────────────────────────
// Harvest Candidates — computed from transactions + live prices
// ──────────────────────────────────────────────
export function useHarvestCandidates(livePrices: Record<string, number> = {}): {
  data: HarvestCandidate[];
  isLoading: boolean;
} {
  const { data: transactions, isLoading } = useTransactions();

  const data = useMemo<HarvestCandidate[]>(() => {
    if (!transactions || transactions.length === 0) return [];

    const map = accumulateHoldings(transactions);
    const candidates: HarvestCandidate[] = [];

    for (const [asset, acc] of map.entries()) {
      if (acc.netAmount < 0.001) continue;

      const costBasisPerUnit =
        acc.netAmount > 0 ? acc.totalCostBasis / acc.netAmount : 0;

      const livePrice = livePrices[asset.toUpperCase()];
      const currentPrice =
        livePrice != null && livePrice > 0
          ? livePrice
          : acc.lastPriceUSD > 0
            ? acc.lastPriceUSD
            : costBasisPerUnit;

      const currentValue = acc.netAmount * currentPrice;
      const totalCost = acc.totalCostBasis;
      const unrealizedGainLoss = currentValue - totalCost;

      if (unrealizedGainLoss < 0) {
        candidates.push({
          asset,
          assetName: acc.assetName || asset,
          amount: acc.netAmount,
          currentPrice,
          unrealizedLoss: unrealizedGainLoss, // negative value
          taxSavings: Math.abs(unrealizedGainLoss) * 0.3,
        });
      }
    }

    return candidates;
  }, [transactions, livePrices]);

  return { data, isLoading };
}

// ──────────────────────────────────────────────
// User Profile
// ──────────────────────────────────────────────
const DEFAULT_PROFILE: UserProfile = {
  country: "US",
  plan: "free",
  costBasisMethod: "FIFO",
  currency: "USD",
  taxYear: 2025n,
};

export function useUserProfile() {
  const { actor } = useActor();
  return useQuery({
    queryKey: ["userProfile"],
    queryFn: async () => {
      if (!actor) return DEFAULT_PROFILE;
      try {
        const profile = await actor.getCallerUserProfile();
        return profile ?? DEFAULT_PROFILE;
      } catch {
        return DEFAULT_PROFILE;
      }
    },
    enabled: !!actor,
  });
}

export function useSaveUserProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (profile: UserProfile) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.saveCallerUserProfile(profile);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}

export function useUpgradePlan() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (plan: string) => {
      const actorInstance = await waitForActor(queryClient);
      return actorInstance.upgradePlan(plan);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["userProfile"] });
    },
  });
}
