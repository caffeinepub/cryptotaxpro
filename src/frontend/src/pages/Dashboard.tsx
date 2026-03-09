import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Link } from "@tanstack/react-router";
import {
  AlertTriangle,
  ArrowUpRight,
  DollarSign,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
import {
  Cell,
  Legend,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from "recharts";
import { StatCard } from "../components/StatCard";
import { TxTypeBadge } from "../components/TxTypeBadge";
import { useLivePrices } from "../hooks/useLivePrices";
import {
  usePortfolioSummary,
  useTaxSummary,
  useTransactions,
} from "../hooks/useQueries";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  formatPct,
  gainLossClass,
} from "../utils/format";

const CHART_COLORS = [
  "oklch(0.72 0.16 195)",
  "oklch(0.65 0.18 155)",
  "oklch(0.58 0.2 285)",
  "oklch(0.75 0.18 85)",
  "oklch(0.68 0.22 340)",
  "oklch(0.62 0.16 50)",
  "oklch(0.55 0.18 245)",
];

export function Dashboard() {
  const [taxYear, setTaxYear] = useState("2025");

  // Derive asset symbols from transactions first (needed for price fetch)
  const { data: transactions, isLoading: txLoading } = useTransactions();

  // Collect unique asset symbols from transactions
  const heldSymbols = [
    ...new Set((transactions ?? []).map((tx) => tx.asset.toUpperCase())),
  ];

  // Fetch live prices for all held assets, auto-refresh every 60s
  const {
    prices: livePrices,
    isLoading: pricesLoading,
    error: pricesError,
    lastUpdated,
  } = useLivePrices(heldSymbols);

  const { data: portfolio, isLoading: portfolioLoading } =
    usePortfolioSummary(livePrices);
  const { data: taxSummary, isLoading: taxLoading } = useTaxSummary(
    BigInt(Number(taxYear)),
  );

  const recentTxs = [...(transactions ?? [])]
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 6);

  const pieData = (portfolio?.holdings ?? []).map((h) => ({
    name: h.asset,
    value: h.currentValueUSD,
    fullName: h.assetName,
  }));

  const totalValue = portfolio?.totalValue ?? 0;
  const totalUnrealized = portfolio?.totalUnrealizedGain ?? 0;

  const priceStatusLabel = pricesLoading
    ? "Fetching prices..."
    : pricesError
      ? "Using last known prices"
      : lastUpdated
        ? `Prices updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
        : null;

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Portfolio Dashboard
          </h1>
          <div className="flex items-center gap-2 mt-0.5">
            <p className="text-sm text-muted-foreground">
              Real-time overview of your crypto holdings and tax position
            </p>
            {priceStatusLabel && (
              <span
                className={cn(
                  "flex items-center gap-1 text-xs",
                  pricesError
                    ? "text-yellow-500"
                    : pricesLoading
                      ? "text-muted-foreground"
                      : "text-emerald-500",
                )}
              >
                {pricesError ? (
                  <WifiOff className="w-3 h-3" />
                ) : (
                  <RefreshCw
                    className={cn("w-3 h-3", pricesLoading && "animate-spin")}
                  />
                )}
                {priceStatusLabel}
              </span>
            )}
          </div>
        </div>
        <Select value={taxYear} onValueChange={setTaxYear}>
          <SelectTrigger
            data-ocid="dashboard.year_select"
            className="w-36 bg-card border-border text-foreground"
          >
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="2025">Tax Year 2025</SelectItem>
            <SelectItem value="2024">Tax Year 2024</SelectItem>
            <SelectItem value="2023">Tax Year 2023</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Portfolio Value"
          value={formatCurrency(totalValue, true)}
          subValue={`${formatCurrency(totalUnrealized, true)} unrealized`}
          icon={DollarSign}
          trend={totalUnrealized >= 0 ? "up" : "down"}
          isLoading={portfolioLoading}
        />
        <StatCard
          label="Unrealized Gain/Loss"
          value={formatCurrency(totalUnrealized, true)}
          subValue={
            totalValue - totalUnrealized > 0
              ? formatPct(
                  (totalUnrealized / (totalValue - totalUnrealized)) * 100,
                )
              : "—"
          }
          icon={totalUnrealized >= 0 ? TrendingUp : TrendingDown}
          trend={totalUnrealized >= 0 ? "up" : "down"}
          isLoading={portfolioLoading}
        />
        <StatCard
          label={`Short-Term Gains (${taxYear})`}
          value={formatCurrency(taxSummary?.shortTermGains ?? 0, true)}
          subValue="Taxed as ordinary income"
          icon={ArrowUpRight}
          trend={(taxSummary?.shortTermGains ?? 0) >= 0 ? "up" : "down"}
          isLoading={taxLoading}
        />
        <StatCard
          label={`Long-Term Gains (${taxYear})`}
          value={formatCurrency(taxSummary?.longTermGains ?? 0, true)}
          subValue="0–20% preferential rate"
          icon={TrendingUp}
          trend={(taxSummary?.longTermGains ?? 0) >= 0 ? "up" : "down"}
          isLoading={taxLoading}
        />
      </div>

      {/* Chart + Holdings */}
      <div className="grid grid-cols-1 lg:grid-cols-5 gap-6">
        {/* Pie Chart */}
        <div className="lg:col-span-2 rounded-lg border border-border bg-card p-4">
          <h2 className="text-sm font-semibold text-foreground mb-1">
            Portfolio Allocation
          </h2>
          <p className="text-xs text-muted-foreground mb-4">By current value</p>
          {portfolioLoading ? (
            <div className="flex items-center justify-center h-52">
              <Skeleton className="w-40 h-40 rounded-full" />
            </div>
          ) : (
            <div data-ocid="dashboard.portfolio_chart">
              <ResponsiveContainer width="100%" height={240}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={95}
                    paddingAngle={2}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell
                        key={`cell-${entry.name}`}
                        fill={CHART_COLORS[index % CHART_COLORS.length]}
                        stroke="transparent"
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(value: number) => [
                      formatCurrency(value),
                      "Value",
                    ]}
                    contentStyle={{
                      background: "oklch(0.18 0.012 240)",
                      border: "1px solid oklch(0.28 0.018 240)",
                      borderRadius: "6px",
                      color: "oklch(0.92 0.01 200)",
                      fontSize: "12px",
                    }}
                  />
                  <Legend
                    formatter={(value) => (
                      <span
                        style={{
                          color: "oklch(0.75 0.02 210)",
                          fontSize: "11px",
                        }}
                      >
                        {value}
                      </span>
                    )}
                  />
                </PieChart>
              </ResponsiveContainer>
            </div>
          )}
        </div>

        {/* Holdings Table */}
        <div className="lg:col-span-3 rounded-lg border border-border bg-card overflow-hidden">
          <div className="px-4 py-3 border-b border-border flex items-center justify-between">
            <h2 className="text-sm font-semibold text-foreground">Holdings</h2>
            {pricesError && (
              <span className="flex items-center gap-1 text-xs text-yellow-500">
                <WifiOff className="w-3 h-3" />
                Prices unavailable — using last known
              </span>
            )}
          </div>
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="text-xs text-muted-foreground font-medium py-2">
                    Asset
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium py-2 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium py-2 text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium py-2 text-right">
                    Value
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium py-2 text-right">
                    Gain/Loss
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground font-medium py-2 text-right">
                    ROI
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {portfolioLoading
                  ? (["a", "b", "c", "d", "e"] as const).map((k) => (
                      <TableRow key={`sk-${k}`} className="border-border">
                        <TableCell>
                          <Skeleton className="h-4 w-20" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-16 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-20 ml-auto" />
                        </TableCell>
                        <TableCell>
                          <Skeleton className="h-4 w-12 ml-auto" />
                        </TableCell>
                      </TableRow>
                    ))
                  : (portfolio?.holdings ?? []).map((holding) => {
                      const isLive =
                        livePrices[holding.asset.toUpperCase()] != null;
                      return (
                        <TableRow
                          key={holding.asset}
                          className="border-border table-row-hover"
                        >
                          <TableCell className="py-2">
                            <div>
                              <span className="text-sm font-semibold text-foreground">
                                {holding.asset}
                              </span>
                              <p className="text-xs text-muted-foreground">
                                {holding.assetName}
                              </p>
                            </div>
                          </TableCell>
                          <TableCell className="py-2 text-right mono text-xs text-muted-foreground">
                            {formatNumber(holding.amount, 4)}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs text-foreground mono">
                            <span
                              title={
                                isLive
                                  ? "Live market price"
                                  : "Last known price from transactions"
                              }
                            >
                              {formatCurrency(holding.currentPriceUSD)}
                            </span>
                            {!isLive && (
                              <span
                                className="ml-1 text-yellow-500 text-xs"
                                title="Using last known price"
                              >
                                ~
                              </span>
                            )}
                          </TableCell>
                          <TableCell className="py-2 text-right text-xs font-semibold text-foreground">
                            {formatCurrency(holding.currentValueUSD)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2 text-right text-xs font-medium mono",
                              gainLossClass(holding.unrealizedGainLoss),
                            )}
                          >
                            {holding.unrealizedGainLoss >= 0 ? "+" : ""}
                            {formatCurrency(holding.unrealizedGainLoss)}
                          </TableCell>
                          <TableCell
                            className={cn(
                              "py-2 text-right text-xs font-medium",
                              gainLossClass(holding.unrealizedPct),
                            )}
                          >
                            {formatPct(holding.unrealizedPct)}
                          </TableCell>
                        </TableRow>
                      );
                    })}
              </TableBody>
            </Table>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <h2 className="text-sm font-semibold text-foreground">
            Recent Transactions
          </h2>
          <Link
            to="/transactions"
            className="text-xs text-primary hover:text-primary/80 transition-colors"
          >
            View all →
          </Link>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground py-2">
                  Date
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2">
                  Type
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2">
                  Asset
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2">
                  Exchange
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">
                  Amount
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2 text-right">
                  Gain/Loss
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-2" />
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading
                ? (["a", "b", "c", "d", "e"] as const).map((k) => (
                    <TableRow key={`rtx-sk-${k}`} className="border-border">
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-5 w-16" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-12" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell>
                        <Skeleton className="h-4 w-20 ml-auto" />
                      </TableCell>
                      <TableCell />
                    </TableRow>
                  ))
                : recentTxs.map((tx) => (
                    <TableRow
                      key={tx.id.toString()}
                      className="border-border table-row-hover"
                    >
                      <TableCell className="py-2 text-xs text-muted-foreground mono">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="py-2">
                        <TxTypeBadge type={tx.txType} />
                      </TableCell>
                      <TableCell className="py-2">
                        <span className="text-sm font-semibold text-foreground">
                          {tx.asset}
                        </span>
                      </TableCell>
                      <TableCell className="py-2 text-xs text-muted-foreground">
                        {tx.exchange}
                      </TableCell>
                      <TableCell className="py-2 text-right text-xs mono text-foreground">
                        {formatNumber(tx.amount, 4)} {tx.asset}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-2 text-right text-xs font-medium mono",
                          gainLossClass(tx.gainLossUSD),
                        )}
                      >
                        {tx.gainLossUSD !== 0 ? (
                          `${tx.gainLossUSD >= 0 ? "+" : ""}${formatCurrency(tx.gainLossUSD)}`
                        ) : (
                          <span className="text-muted-foreground">—</span>
                        )}
                      </TableCell>
                      <TableCell className="py-2">
                        {tx.isFlagged && (
                          <AlertTriangle className="w-3.5 h-3.5 text-yellow-500" />
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>
    </div>
  );
}
