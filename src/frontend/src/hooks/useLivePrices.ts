import { useQuery } from "@tanstack/react-query";

// Map common ticker symbols → CoinGecko IDs
const SYMBOL_TO_COINGECKO_ID: Record<string, string> = {
  BTC: "bitcoin",
  ETH: "ethereum",
  SOL: "solana",
  BNB: "binancecoin",
  XRP: "ripple",
  ADA: "cardano",
  AVAX: "avalanche-2",
  DOT: "polkadot",
  MATIC: "matic-network",
  POL: "matic-network",
  LINK: "chainlink",
  UNI: "uniswap",
  ATOM: "cosmos",
  LTC: "litecoin",
  BCH: "bitcoin-cash",
  ALGO: "algorand",
  XLM: "stellar",
  VET: "vechain",
  THETA: "theta-token",
  FIL: "filecoin",
  TRX: "tron",
  ETC: "ethereum-classic",
  MANA: "decentraland",
  SAND: "the-sandbox",
  AXS: "axie-infinity",
  FTM: "fantom",
  NEAR: "near",
  HBAR: "hedera-hashgraph",
  ICP: "internet-computer",
  SHIB: "shiba-inu",
  DOGE: "dogecoin",
  CRO: "crypto-com-chain",
  LUNA: "terra-luna-2",
  APE: "apecoin",
  OP: "optimism",
  ARB: "arbitrum",
  MKR: "maker",
  AAVE: "aave",
  COMP: "compound-governance-token",
  SNX: "havven",
  CRV: "curve-dao-token",
  BAL: "balancer",
  SUSHI: "sushi",
  YFI: "yearn-finance",
  GRT: "the-graph",
  LDO: "lido-dao",
  RPL: "rocket-pool",
  PEPE: "pepe",
  WIF: "dogwifcoin",
  BONK: "bonk",
  USDC: "usd-coin",
  USDT: "tether",
  DAI: "dai",
  BUSD: "binance-usd",
  TUSD: "true-usd",
};

export interface LivePriceMap {
  /** symbol → current USD price */
  prices: Record<string, number>;
  /** timestamp of last successful fetch */
  lastUpdated: Date | null;
  /** whether a fetch is in flight */
  isLoading: boolean;
  /** last error, if any */
  error: Error | null;
}

/**
 * Resolves a ticker symbol to a CoinGecko ID.
 * Falls back to lowercasing the symbol (works for many coins).
 */
export function symbolToId(symbol: string): string {
  return SYMBOL_TO_COINGECKO_ID[symbol.toUpperCase()] ?? symbol.toLowerCase();
}

/**
 * Fetches live USD prices for the provided list of ticker symbols
 * from CoinGecko's free public API. Auto-refreshes every 60 seconds.
 * Falls back gracefully to an empty map on failure so callers can
 * use last-known prices.
 */
export function useLivePrices(symbols: string[]): LivePriceMap {
  const uniqueSymbols = [
    ...new Set(symbols.map((s) => s.toUpperCase())),
  ].filter(Boolean);

  // Stablecoins — always $1, no need to fetch
  const STABLECOINS = new Set(["USDC", "USDT", "DAI", "BUSD", "TUSD", "USDP"]);

  const stableMap: Record<string, number> = {};
  const fetchSymbols = uniqueSymbols.filter((s) => {
    if (STABLECOINS.has(s)) {
      stableMap[s] = 1.0;
      return false;
    }
    return true;
  });

  const ids = fetchSymbols.map(symbolToId).join(",");

  const { data, isLoading, error } = useQuery<Record<string, number>>({
    queryKey: ["livePrices", ids],
    queryFn: async () => {
      if (!ids) return {};

      const url = `https://api.coingecko.com/api/v3/simple/price?ids=${ids}&vs_currencies=usd`;
      const res = await fetch(url);
      if (!res.ok) throw new Error(`CoinGecko returned ${res.status}`);

      const json = await res.json();
      // json shape: { "bitcoin": { "usd": 67000 }, "ethereum": { "usd": 3500 }, ... }
      const result: Record<string, number> = {};
      for (const symbol of fetchSymbols) {
        const id = symbolToId(symbol);
        if (json[id]?.usd) {
          result[symbol] = json[id].usd;
        }
      }
      return result;
    },
    enabled: fetchSymbols.length > 0,
    // Auto-refresh every 60 seconds
    refetchInterval: 60_000,
    // Keep previous data while re-fetching so UI doesn't flash
    placeholderData: (prev) => prev,
    // Treat data as stale after 55s so it always re-fetches on window focus
    staleTime: 55_000,
    // Don't retry aggressively on failure — just wait for next interval
    retry: 1,
    retryDelay: 5_000,
  });

  const prices: Record<string, number> = { ...stableMap, ...(data ?? {}) };

  return {
    prices,
    lastUpdated: data ? new Date() : null,
    isLoading,
    error: error as Error | null,
  };
}
