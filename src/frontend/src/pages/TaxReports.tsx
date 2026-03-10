import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  AlertCircle,
  DollarSign,
  Download,
  FileText,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { Transaction } from "../backend.d";
import { StatCard } from "../components/StatCard";
import {
  useTaxSummary,
  useTransactions,
  useUserProfile,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

// ─── Helpers ────────────────────────────────────────────────────────────────

function fmtDollars(value: number): string {
  return Math.round(value).toLocaleString("en-US");
}

function fmtIRS(value: number): string {
  if (value < 0)
    return `(${Math.abs(Math.round(value)).toLocaleString("en-US")})`;
  return Math.round(value).toLocaleString("en-US");
}

function getAdjCode(tx: Transaction): string {
  const notes = (tx.notes ?? "").toLowerCase();
  const tags = (tx.tags ?? []).join(" ").toLowerCase();
  if (
    notes.includes("fee") ||
    notes.includes("gas") ||
    tags.includes("fee") ||
    tags.includes("gas")
  ) {
    return "E";
  }
  return "";
}

function getProceeds(tx: Transaction): number {
  return Math.round(tx.priceUSD * tx.amount);
}

function getBasis(tx: Transaction): number {
  return Math.round(tx.costBasisUSD);
}

function getGainLoss(tx: Transaction): number {
  const proceeds = getProceeds(tx);
  const basis = getBasis(tx);
  return proceeds - basis;
}

function escapeCsvField(value: string | number): string {
  const str = String(value);
  if (str.includes(",") || str.includes('"') || str.includes("\n")) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

function triggerDownload(content: string, filename: string, mimeType: string) {
  const blob = new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// ─── Form 8949 Preview ────────────────────────────────────────────────────────

interface Form8949PreviewProps {
  taxYear: string;
  transactions: Transaction[];
  isLoading: boolean;
}

function Form8949Preview({
  taxYear,
  transactions,
  isLoading,
}: Form8949PreviewProps) {
  const shortTermTxs = transactions.filter(
    (tx) => tx.isShortTerm && !(tx.tags ?? []).includes("buy"),
  );
  const longTermTxs = transactions.filter(
    (tx) => !tx.isShortTerm && !(tx.tags ?? []).includes("buy"),
  );

  function sumColumn(txs: Transaction[], col: "d" | "e" | "g" | "h"): number {
    return txs.reduce((sum, tx) => {
      if (col === "d") return sum + getProceeds(tx);
      if (col === "e") return sum + getBasis(tx);
      if (col === "g") return sum; // adjustment always 0 for now
      if (col === "h") return sum + getGainLoss(tx);
      return sum;
    }, 0);
  }

  const SkeletonRows = () => (
    <>
      {[1, 2, 3].map((i) => (
        <TableRow key={`sk-${i}`} className="border-border">
          {[1, 2, 3, 4, 5, 6, 7, 8].map((j) => (
            <TableCell key={`sk-${i}-${j}`}>
              <Skeleton className="h-3.5 w-full" />
            </TableCell>
          ))}
        </TableRow>
      ))}
    </>
  );

  function TxRows({ txs }: { txs: Transaction[] }) {
    if (txs.length === 0) {
      return (
        <TableRow className="border-border">
          <TableCell
            colSpan={8}
            className="py-6 text-center text-xs text-muted-foreground italic"
          >
            No transactions for this period
          </TableCell>
        </TableRow>
      );
    }
    return (
      <>
        {txs.map((tx) => {
          const proceeds = getProceeds(tx);
          const basis = getBasis(tx);
          const adjCode = getAdjCode(tx);
          const gainLoss = getGainLoss(tx);

          return (
            <TableRow
              key={tx.id.toString()}
              className="border-border/60 hover:bg-secondary/30 data-[row-index]"
            >
              <TableCell className="py-2 text-xs text-foreground font-mono">
                <span className="font-semibold">
                  {tx.amount % 1 === 0
                    ? tx.amount.toFixed(0)
                    : tx.amount.toFixed(4)}{" "}
                  {tx.asset}
                </span>
                <span className="text-muted-foreground block text-[10px]">
                  {tx.txType}
                </span>
              </TableCell>
              <TableCell className="py-2 text-[11px] text-muted-foreground font-mono">
                Various
              </TableCell>
              <TableCell className="py-2 text-[11px] text-muted-foreground font-mono">
                {formatDate(tx.date)}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-right font-mono text-foreground">
                {fmtDollars(proceeds)}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-right font-mono text-foreground">
                {fmtDollars(basis)}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-center font-mono text-muted-foreground">
                {adjCode}
              </TableCell>
              <TableCell className="py-2 text-[11px] text-right font-mono text-muted-foreground">
                —
              </TableCell>
              <TableCell
                className={cn(
                  "py-2 text-[11px] text-right font-mono font-semibold",
                  gainLoss >= 0 ? "text-gain" : "text-loss",
                )}
              >
                {fmtIRS(gainLoss)}
              </TableCell>
            </TableRow>
          );
        })}
      </>
    );
  }

  function SubtotalRow({ txs, label }: { txs: Transaction[]; label: string }) {
    const dSum = sumColumn(txs, "d");
    const eSum = sumColumn(txs, "e");
    const hSum = sumColumn(txs, "h");
    return (
      <TableRow className="border-t border-primary/30 bg-muted/20">
        <TableCell
          colSpan={3}
          className="py-2 text-[11px] font-semibold text-foreground font-mono"
        >
          {label} Totals
        </TableCell>
        <TableCell className="py-2 text-[11px] text-right font-mono font-semibold text-foreground">
          {fmtDollars(dSum)}
        </TableCell>
        <TableCell className="py-2 text-[11px] text-right font-mono font-semibold text-foreground">
          {fmtDollars(eSum)}
        </TableCell>
        <TableCell className="py-2 text-[11px] text-center font-mono">
          —
        </TableCell>
        <TableCell className="py-2 text-[11px] text-right font-mono">
          —
        </TableCell>
        <TableCell
          className={cn(
            "py-2 text-[11px] text-right font-mono font-bold",
            hSum >= 0 ? "text-gain" : "text-loss",
          )}
        >
          {fmtIRS(hSum)}
        </TableCell>
      </TableRow>
    );
  }

  const columnHeaders = [
    { key: "a", label: "(a) Description of Property" },
    { key: "b", label: "(b) Date Acquired" },
    { key: "c", label: "(c) Date Sold" },
    { key: "d", label: "(d) Proceeds" },
    { key: "e", label: "(e) Cost or Other Basis" },
    { key: "f", label: "(f) Adj Code(s)" },
    { key: "g", label: "(g) Adj Amount" },
    { key: "h", label: "(h) Gain or (Loss)" },
  ];

  return (
    <div
      data-ocid="reports.form8949_preview.panel"
      className="space-y-0 rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* Form Header */}
      <div className="bg-muted/30 border-b border-border px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">
              Department of the Treasury — Internal Revenue Service
            </p>
            <h3 className="text-base font-bold font-display text-foreground">
              Form 8949
            </h3>
            <p className="text-sm text-muted-foreground">
              Sales and Other Dispositions of Capital Assets
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              For Digital Assets (Cryptocurrency) · Tax Year {taxYear}
            </p>
          </div>
          <div className="flex flex-col gap-1.5 text-right">
            <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-mono self-end">
              OMB No. 1545-0074
            </Badge>
            <p className="text-[10px] text-muted-foreground font-mono">
              Attach to Schedule D (Form 1040)
            </p>
          </div>
        </div>
      </div>

      {/* Note on 1099-DA checkboxes */}
      <div className="px-5 py-3 bg-secondary/20 border-b border-border flex flex-col sm:flex-row gap-4">
        <div className="flex items-start gap-2 flex-1">
          <div className="w-4 h-4 rounded-full border-2 border-primary flex items-center justify-center mt-0.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-primary" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground font-mono">
              Part I — Short-Term:{" "}
              <span className="text-primary">Box H checked</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              1099-DA issued · Proceeds reported to IRS · Basis NOT reported to
              IRS (2025 rules)
            </p>
          </div>
        </div>
        <div className="flex items-start gap-2 flex-1">
          <div className="w-4 h-4 rounded-full border-2 border-chart-2 flex items-center justify-center mt-0.5 flex-shrink-0">
            <div className="w-2 h-2 rounded-full bg-chart-2" />
          </div>
          <div>
            <p className="text-[11px] font-semibold text-foreground font-mono">
              Part II — Long-Term:{" "}
              <span className="text-chart-2">Box K checked</span>
            </p>
            <p className="text-[10px] text-muted-foreground">
              1099-DA issued · Proceeds reported to IRS · Basis NOT reported to
              IRS (2025 rules)
            </p>
          </div>
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow className="border-border bg-muted/10 hover:bg-muted/10">
              {columnHeaders.map((col) => (
                <TableHead
                  key={col.key}
                  className={cn(
                    "py-2 text-[10px] text-muted-foreground font-mono uppercase tracking-wide whitespace-nowrap",
                    ["d", "e", "g", "h"].includes(col.key) ? "text-right" : "",
                    col.key === "f" ? "text-center" : "",
                  )}
                >
                  {col.label}
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <SkeletonRows />
            ) : (
              <>
                {/* Part I — Short-Term */}
                <TableRow className="border-none bg-primary/5 hover:bg-primary/5">
                  <TableCell
                    colSpan={8}
                    className="py-1.5 px-4 text-[10px] font-bold font-mono uppercase tracking-widest text-primary"
                  >
                    Part I — Short-Term Transactions (held 1 year or less) · Box
                    H
                  </TableCell>
                </TableRow>
                <TxRows txs={shortTermTxs} />
                {shortTermTxs.length > 0 && (
                  <SubtotalRow txs={shortTermTxs} label="Part I" />
                )}

                {/* Part II — Long-Term */}
                <TableRow className="border-none bg-chart-2/5 hover:bg-chart-2/5">
                  <TableCell
                    colSpan={8}
                    className="py-1.5 px-4 text-[10px] font-bold font-mono uppercase tracking-widest text-chart-2"
                  >
                    Part II — Long-Term Transactions (held more than 1 year) ·
                    Box K
                  </TableCell>
                </TableRow>
                <TxRows txs={longTermTxs} />
                {longTermTxs.length > 0 && (
                  <SubtotalRow txs={longTermTxs} label="Part II" />
                )}
              </>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Footer Note */}
      <div className="px-5 py-3 border-t border-border bg-muted/10">
        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
          <span className="text-primary font-semibold">Note:</span> Digital
          asset transactions use 2025 Form 1099-DA rules. Basis reporting to the
          IRS is not required until assets acquired in 2026. You must
          independently verify and enter your cost basis. Proceeds are rounded
          to whole dollars per IRS instructions. Adjustment code "E" indicates
          deductible selling expenses (e.g., gas/network fees). All dollar
          amounts in USD.
        </p>
      </div>
    </div>
  );
}

// ─── Schedule D Preview ────────────────────────────────────────────────────────

interface ScheduleDPreviewProps {
  taxYear: string;
  transactions: Transaction[];
  isLoading: boolean;
}

interface SchedDLine {
  line: string;
  description: string;
  value: number | null;
  isHeader?: boolean;
  isKey?: boolean;
  isBlank?: boolean;
}

function ScheduleDPreview({
  taxYear,
  transactions,
  isLoading,
}: ScheduleDPreviewProps) {
  // Compute from transactions
  const yearTxs = transactions.filter((tx) => tx.date.startsWith(taxYear));
  const disposals = yearTxs.filter(
    (tx) =>
      (tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi") &&
      !(tx.tags ?? []).includes("buy"),
  );

  const shortTermDisposals = disposals.filter((tx) => tx.isShortTerm);
  const longTermDisposals = disposals.filter((tx) => !tx.isShortTerm);

  const stGainLoss = shortTermDisposals.reduce(
    (s, tx) => s + getGainLoss(tx),
    0,
  );
  const ltGainLoss = longTermDisposals.reduce(
    (s, tx) => s + getGainLoss(tx),
    0,
  );
  const netGainLoss = stGainLoss + ltGainLoss;

  const bothGains = stGainLoss > 0 && ltGainLoss > 0;
  const allowableLossDeduction =
    netGainLoss < 0 ? Math.max(netGainLoss, -3000) : null;

  const lines: SchedDLine[] = [
    // Part I
    {
      line: "",
      description: "Part I — Short-Term Capital Gains and Losses",
      value: null,
      isHeader: true,
    },
    {
      line: "1a",
      description:
        "Totals for all short-term transactions reported on Form 1099-B for which basis was reported to the IRS (excluding crypto)",
      value: 0,
    },
    {
      line: "1b",
      description:
        "Totals for all short-term transactions for which basis was not reported to the IRS (Box H, Form 8949 Part I)",
      value: stGainLoss,
      isKey: true,
    },
    {
      line: "2",
      description:
        "Net short-term gain or (loss) from partnerships, S corporations, estates, and trusts",
      value: 0,
    },
    {
      line: "3",
      description: "Short-term capital loss carryover from prior year",
      value: 0,
    },
    {
      line: "4",
      description: "Short-term capital gain from installment sales",
      value: 0,
    },
    {
      line: "5",
      description:
        "Short-term capital loss carryover from Form 4684, 6252, or 8824",
      value: 0,
    },
    {
      line: "6",
      description: "Short-term capital loss carryover (other)",
      value: 0,
    },
    {
      line: "7",
      description:
        "Net short-term capital gain or (loss). Combine lines 1a through 6.",
      value: stGainLoss,
      isKey: true,
    },
    // Part II
    {
      line: "",
      description: "Part II — Long-Term Capital Gains and Losses",
      value: null,
      isHeader: true,
    },
    {
      line: "8a",
      description:
        "Totals for all long-term transactions reported on Form 1099-B for which basis was reported to the IRS (excluding crypto)",
      value: 0,
    },
    {
      line: "8b",
      description:
        "Totals for all long-term transactions for which basis was not reported to the IRS (Box K, Form 8949 Part II)",
      value: ltGainLoss,
      isKey: true,
    },
    {
      line: "9",
      description:
        "Net long-term gain or (loss) from partnerships, S corporations, estates, and trusts",
      value: 0,
    },
    {
      line: "10",
      description: "Capital gain distributions from Form 1099-DIV",
      value: 0,
    },
    {
      line: "11",
      description: "Long-term capital loss carryover from prior year",
      value: 0,
    },
    {
      line: "12",
      description: "Long-term capital gain from installment sales",
      value: 0,
    },
    {
      line: "13",
      description: "Long-term capital gain from like-kind exchanges",
      value: 0,
    },
    {
      line: "14",
      description: "Long-term capital loss carryover (other)",
      value: 0,
    },
    {
      line: "15",
      description:
        "Net long-term capital gain or (loss). Combine lines 8a through 14.",
      value: ltGainLoss,
      isKey: true,
    },
    {
      line: "16",
      description:
        "Combine lines 7 and 15. Enter the result here and on Form 1040, line 7.",
      value: netGainLoss,
      isKey: true,
    },
    // Part III
    {
      line: "",
      description: "Part III — Summary",
      value: null,
      isHeader: true,
    },
    {
      line: "17",
      description:
        "Are lines 15 and 16 both gains? (If so, go to line 18; if not, go to line 21.)",
      value: null,
      isBlank: true,
    },
    {
      line: "18",
      description:
        "Add the amount on line 15 in column (h) (28% rate gain — collectibles). Crypto is $0.",
      value: 0,
    },
    {
      line: "19",
      description:
        "Unrecaptured section 1250 gain from installment sales and like-kind exchanges. Crypto is $0.",
      value: 0,
    },
    {
      line: "20",
      description: "Are the amounts on lines 18 and 19 both zero or blank?",
      value: null,
      isBlank: true,
    },
    {
      line: "21",
      description:
        "If line 16 is a (loss), enter here the smaller of: the loss on line 16 or ($3,000). Allowable capital loss deduction.",
      value: allowableLossDeduction,
    },
    {
      line: "22",
      description:
        "Do you have qualified dividends or capital gain distributions for the tax year?",
      value: null,
      isBlank: true,
    },
  ];

  function LineValue({ line }: { line: SchedDLine }) {
    if (line.isBlank || line.value === null) {
      if (line.line === "17") {
        return (
          <span
            className={cn(
              "font-mono text-sm font-semibold",
              bothGains ? "text-gain" : "text-muted-foreground",
            )}
          >
            {bothGains ? "Yes" : "No"}
          </span>
        );
      }
      if (line.line === "20") {
        return (
          <span className="font-mono text-sm font-semibold text-gain">Yes</span>
        );
      }
      if (line.line === "22") {
        return (
          <span className="font-mono text-sm font-semibold text-muted-foreground">
            No
          </span>
        );
      }
      return <span className="text-muted-foreground font-mono text-xs">—</span>;
    }

    const isNeg = line.value < 0;
    const isPos = line.value > 0;
    return (
      <span
        className={cn(
          "font-mono text-sm",
          line.isKey ? "font-bold" : "font-medium",
          isNeg ? "text-loss" : isPos ? "text-gain" : "text-muted-foreground",
        )}
      >
        {line.value === 0 ? (
          <span className="text-muted-foreground">$0</span>
        ) : (
          `$${fmtIRS(line.value)}`
        )}
      </span>
    );
  }

  return (
    <div
      data-ocid="reports.scheduled_preview.panel"
      className="rounded-lg border border-border bg-card overflow-hidden"
    >
      {/* Form Header */}
      <div className="bg-muted/30 border-b border-border px-5 py-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
          <div>
            <p className="text-[10px] font-mono text-muted-foreground uppercase tracking-widest mb-0.5">
              Department of the Treasury — Internal Revenue Service
            </p>
            <h3 className="text-base font-bold font-display text-foreground">
              Schedule D (Form 1040)
            </h3>
            <p className="text-sm text-muted-foreground">
              Capital Gains and Losses
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Tax Year {taxYear} · All amounts in whole dollars (USD)
            </p>
          </div>
          <div className="flex flex-col gap-1.5 text-right">
            <Badge className="bg-primary/15 text-primary border border-primary/30 text-[10px] font-mono self-end">
              OMB No. 1545-0074
            </Badge>
            <p className="text-[10px] text-muted-foreground font-mono">
              Attach to Form 1040 or 1040-SR
            </p>
          </div>
        </div>
      </div>

      {/* Lines */}
      <div className="divide-y divide-border/40">
        {isLoading ? (
          <div className="p-6 space-y-3">
            {[1, 2, 3, 4, 5, 6, 7].map((i) => (
              <Skeleton key={i} className="h-8 w-full" />
            ))}
          </div>
        ) : (
          lines.map((line) => {
            const lineKey = line.line
              ? `line-${line.line}`
              : `hdr-${line.description.slice(0, 20).replace(/\s+/g, "-")}`;
            if (line.isHeader) {
              return (
                <div
                  key={lineKey}
                  className="px-5 py-2.5 bg-primary/5 border-y border-primary/20"
                >
                  <p className="text-[10px] font-bold font-mono uppercase tracking-widest text-primary">
                    {line.description}
                  </p>
                </div>
              );
            }

            return (
              <div
                key={lineKey}
                className={cn(
                  "flex items-start gap-4 px-5 py-2.5 hover:bg-secondary/20 transition-colors",
                  line.isKey ? "bg-muted/20" : "",
                )}
              >
                {/* Line Number */}
                <div className="w-10 flex-shrink-0 pt-0.5">
                  <span
                    className={cn(
                      "font-mono text-xs font-bold",
                      line.isKey ? "text-primary" : "text-muted-foreground",
                    )}
                  >
                    {line.line}
                  </span>
                </div>

                {/* Description */}
                <div className="flex-1 min-w-0">
                  <p
                    className={cn(
                      "text-xs leading-relaxed",
                      line.isKey
                        ? "text-foreground font-medium"
                        : "text-muted-foreground",
                    )}
                  >
                    {line.description}
                  </p>
                </div>

                {/* Value */}
                <div className="flex-shrink-0 w-32 text-right pt-0.5">
                  {line.isKey ? (
                    <div className="border border-primary/30 bg-primary/5 rounded px-2 py-0.5 inline-block">
                      <LineValue line={line} />
                    </div>
                  ) : (
                    <LineValue line={line} />
                  )}
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Disclaimer */}
      <div className="px-5 py-3 border-t border-border bg-muted/10">
        <p className="text-[10px] text-muted-foreground font-mono leading-relaxed">
          <span className="text-primary font-semibold">Disclaimer:</span> This
          is a calculated summary for reference purposes only. All values are
          derived from your imported transactions using the FIFO cost-basis
          method. Capital loss carryovers from prior years are not included.
          Verify with a qualified tax professional before filing. For official
          IRS instructions, visit irs.gov/scheduledCapital.
        </p>
      </div>
    </div>
  );
}

// ─── Main Component ────────────────────────────────────────────────────────────

export function TaxReports() {
  const [taxYear, setTaxYear] = useState("2025");
  const [activeFormTab, setActiveFormTab] = useState("form8949");

  const { data: taxSummary, isLoading: summaryLoading } = useTaxSummary(
    BigInt(Number(taxYear)),
  );
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: profile } = useUserProfile();

  const method = profile?.costBasisMethod ?? "FIFO";

  // Filter to disposal transactions (Trade, NFT, DeFi)
  const allDisposals = (transactions ?? []).filter(
    (tx) =>
      (tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi") &&
      !(tx.tags ?? []).includes("buy"),
  );
  const yearDisposals = allDisposals.filter((tx) =>
    tx.date.startsWith(taxYear),
  );

  // ─── Download handlers ───────────────────────────────────────────────────────

  function handleDownload(reportName: string) {
    const txs = transactions ?? [];
    const yearTxs = txs.filter((tx) => tx.date.startsWith(taxYear));

    if (reportName === "Form 8949 (PDF)") {
      // IRS-accurate Form 8949 CSV
      const disposalTxs = yearTxs.filter(
        (tx) =>
          (tx.txType === "Trade" ||
            tx.txType === "NFT" ||
            tx.txType === "DeFi") &&
          !(tx.tags ?? []).includes("buy"),
      );
      const rows = [
        [
          "(a) Description of Property",
          "(b) Date Acquired",
          "(c) Date Sold or Disposed",
          "(d) Proceeds",
          "(e) Cost or Other Basis",
          "(f) Adjustment Code(s)",
          "(g) Amount of Adjustment",
          "(h) Gain or (Loss)",
        ].join(","),
        ...disposalTxs.map((tx) => {
          const proceeds = getProceeds(tx);
          const basis = getBasis(tx);
          const adjCode = getAdjCode(tx);
          const gainLoss = proceeds - basis;
          return [
            escapeCsvField(
              `${tx.amount % 1 === 0 ? tx.amount.toFixed(0) : tx.amount.toFixed(4)} ${tx.asset}`,
            ),
            escapeCsvField("Various"),
            escapeCsvField(tx.date),
            escapeCsvField(proceeds.toString()),
            escapeCsvField(basis.toString()),
            escapeCsvField(adjCode),
            escapeCsvField("0"),
            escapeCsvField(gainLoss.toString()),
          ].join(",");
        }),
      ];
      triggerDownload(rows.join("\n"), `form8949_${taxYear}.csv`, "text/csv");
    } else if (reportName === "Schedule D") {
      // IRS-accurate Schedule D CSV
      const disposalTxs = yearTxs.filter(
        (tx) =>
          (tx.txType === "Trade" ||
            tx.txType === "NFT" ||
            tx.txType === "DeFi") &&
          !(tx.tags ?? []).includes("buy"),
      );
      const stGainLoss = disposalTxs
        .filter((tx) => tx.isShortTerm)
        .reduce((s, tx) => s + getGainLoss(tx), 0);
      const ltGainLoss = disposalTxs
        .filter((tx) => !tx.isShortTerm)
        .reduce((s, tx) => s + getGainLoss(tx), 0);
      const netGainLoss = stGainLoss + ltGainLoss;
      const allowableLoss = netGainLoss < 0 ? Math.max(netGainLoss, -3000) : 0;

      const schedDLines = [
        ["Part I — Short-Term Capital Gains and Losses", "", ""],
        [
          "1a",
          "Totals for short-term transactions (basis reported to IRS)",
          "0",
        ],
        [
          "1b",
          "Box H — Short-term, basis NOT reported to IRS (crypto)",
          stGainLoss.toString(),
        ],
        ["2", "Net short-term gain from partnerships/S corps/estates", "0"],
        ["3", "Short-term capital loss carryover from prior year", "0"],
        ["4", "Short-term gain from installment sales", "0"],
        ["5", "Short-term loss from Form 4684, 6252, 8824", "0"],
        ["6", "Short-term capital loss carryover (other)", "0"],
        [
          "7",
          "Net short-term capital gain or (loss). Lines 1a–6.",
          stGainLoss.toString(),
        ],
        ["Part II — Long-Term Capital Gains and Losses", "", ""],
        [
          "8a",
          "Totals for long-term transactions (basis reported to IRS)",
          "0",
        ],
        [
          "8b",
          "Box K — Long-term, basis NOT reported to IRS (crypto)",
          ltGainLoss.toString(),
        ],
        ["9", "Net long-term gain from partnerships/S corps/estates", "0"],
        ["10", "Capital gain distributions from Form 1099-DIV", "0"],
        ["11", "Long-term capital loss carryover from prior year", "0"],
        ["12", "Long-term gain from installment sales", "0"],
        ["13", "Long-term gain from like-kind exchanges", "0"],
        ["14", "Long-term capital loss carryover (other)", "0"],
        [
          "15",
          "Net long-term capital gain or (loss). Lines 8a–14.",
          ltGainLoss.toString(),
        ],
        [
          "16",
          "Combine lines 7 and 15. Enter on Form 1040 line 7.",
          netGainLoss.toString(),
        ],
        ["Part III — Summary", "", ""],
        [
          "17",
          "Are lines 15 and 16 both gains?",
          stGainLoss > 0 && ltGainLoss > 0 ? "Yes" : "No",
        ],
        ["18", "28% rate gain (collectibles). Crypto = $0.", "0"],
        ["19", "Unrecaptured section 1250 gain. Crypto = $0.", "0"],
        ["20", "Are amounts on lines 18 and 19 both zero?", "Yes"],
        [
          "21",
          "Allowable capital loss deduction (max $3,000).",
          allowableLoss.toString(),
        ],
        ["22", "Qualified dividends or capital gain distributions?", "No"],
      ];

      const rows = [
        ["Line", "Description", "Amount (USD)"].join(","),
        ...schedDLines.map((row) =>
          row.map((cell) => escapeCsvField(cell)).join(","),
        ),
      ];
      triggerDownload(rows.join("\n"), `scheduleD_${taxYear}.csv`, "text/csv");
    } else if (reportName === "TurboTax Export") {
      const disposalTxs = yearTxs.filter(
        (tx) =>
          (tx.txType === "Trade" ||
            tx.txType === "NFT" ||
            tx.txType === "DeFi") &&
          !(tx.tags ?? []).includes("buy"),
      );
      const rows = [
        [
          "Currency Name",
          "Purchase Date",
          "Cost Basis",
          "Date Sold",
          "Proceeds",
        ].join(","),
        ...disposalTxs.map((tx) =>
          [
            escapeCsvField(tx.asset),
            escapeCsvField("Various"),
            escapeCsvField(getBasis(tx).toString()),
            escapeCsvField(tx.date),
            escapeCsvField(getProceeds(tx).toString()),
          ].join(","),
        ),
      ];
      triggerDownload(rows.join("\n"), `turbotax_${taxYear}.csv`, "text/csv");
    } else if (reportName === "CSV Export") {
      const rows = [
        [
          "ID",
          "Date",
          "Type",
          "Asset",
          "Amount",
          "Price (USD)",
          "Value (USD)",
          "Cost Basis (USD)",
          "Gain/Loss (USD)",
          "Short Term",
          "Exchange",
          "Tags",
          "Notes",
        ].join(","),
        ...txs.map((tx) =>
          [
            escapeCsvField(tx.id.toString()),
            escapeCsvField(tx.date),
            escapeCsvField(tx.txType),
            escapeCsvField(tx.asset),
            escapeCsvField(tx.amount.toString()),
            escapeCsvField(tx.priceUSD.toFixed(2)),
            escapeCsvField((tx.priceUSD * tx.amount).toFixed(2)),
            escapeCsvField(tx.costBasisUSD.toFixed(2)),
            escapeCsvField(tx.gainLossUSD.toFixed(2)),
            escapeCsvField(tx.isShortTerm ? "Yes" : "No"),
            escapeCsvField(tx.exchange),
            escapeCsvField(tx.tags.join("; ")),
            escapeCsvField(tx.notes),
          ].join(","),
        ),
      ];
      triggerDownload(
        rows.join("\n"),
        `transactions_${taxYear}.csv`,
        "text/csv",
      );
    } else {
      // International reports
      const countryMap: Record<string, string> = {
        "UK HMRC": "uk_hmrc",
        "Canada T1135": "canada_t1135",
        "Australia CGT": "australia_cgt",
        "Germany Anlage SO": "germany_anlageso",
      };
      const slug =
        countryMap[reportName] ?? reportName.toLowerCase().replace(/\s+/g, "_");
      const rows = [
        [
          "Report",
          "Tax Year",
          "Short-Term Gains (USD)",
          "Long-Term Gains (USD)",
          "Income (USD)",
          "Losses (USD)",
          "Net Gains (USD)",
          "Estimated Tax (USD)",
        ].join(","),
        [
          escapeCsvField(reportName),
          escapeCsvField(taxYear),
          escapeCsvField((taxSummary?.shortTermGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.longTermGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.income ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.losses ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.netGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.estimatedTax ?? 0).toFixed(2)),
        ].join(","),
      ];
      triggerDownload(rows.join("\n"), `${slug}_${taxYear}.csv`, "text/csv");
    }

    toast.success(`Downloaded ${reportName}`);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold font-display text-foreground">
            Tax Reports
          </h1>
          <p className="text-sm text-muted-foreground mt-0.5">
            US tax forms and gain/loss calculations
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Badge
            variant="outline"
            className="border-primary/40 text-primary bg-primary/10 text-xs px-2.5 py-1"
          >
            Method: {method}
          </Badge>
          <Select value={taxYear} onValueChange={setTaxYear}>
            <SelectTrigger
              data-ocid="reports.year_select"
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
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <StatCard
          label="Short-Term Gains"
          value={formatCurrency(taxSummary?.shortTermGains ?? 0)}
          subValue="Taxed at ordinary income rate"
          icon={TrendingUp}
          trend={(taxSummary?.shortTermGains ?? 0) >= 0 ? "up" : "down"}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Long-Term Gains"
          value={formatCurrency(taxSummary?.longTermGains ?? 0)}
          subValue="0–20% preferential rate"
          icon={TrendingUp}
          trend={(taxSummary?.longTermGains ?? 0) >= 0 ? "up" : "down"}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Income (Staking/Airdrops)"
          value={formatCurrency(taxSummary?.income ?? 0)}
          subValue="Ordinary income"
          icon={DollarSign}
          trend="up"
          isLoading={summaryLoading}
        />
        <StatCard
          label="Total Losses"
          value={formatCurrency(Math.abs(taxSummary?.losses ?? 0))}
          subValue="Can offset gains"
          icon={TrendingDown}
          trend="down"
          isLoading={summaryLoading}
        />
        <StatCard
          label="Net Gains"
          value={formatCurrency(taxSummary?.netGains ?? 0)}
          subValue="After loss harvesting"
          icon={DollarSign}
          trend={(taxSummary?.netGains ?? 0) >= 0 ? "up" : "down"}
          isLoading={summaryLoading}
        />
        <StatCard
          label="Estimated Tax"
          value={formatCurrency(taxSummary?.estimatedTax ?? 0)}
          subValue="Estimated liability"
          icon={AlertCircle}
          trend="neutral"
          isLoading={summaryLoading}
        />
      </div>

      {/* Download Section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-4">
          <FileText className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Download Reports
          </h2>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            data-ocid="reports.download_8949.button"
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative"
            onClick={() => handleDownload("Form 8949 (PDF)")}
          >
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Form 8949</p>
              <p className="text-xs text-muted-foreground">CSV</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.download_scheduled.button"
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative"
            onClick={() => handleDownload("Schedule D")}
          >
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Schedule D</p>
              <p className="text-xs text-muted-foreground">CSV</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.export_turbotax.button"
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative"
            onClick={() => handleDownload("TurboTax Export")}
          >
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">TurboTax</p>
              <p className="text-xs text-muted-foreground">TXF</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.export_csv.button"
            variant="outline"
            className="flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative"
            onClick={() => handleDownload("CSV Export")}
          >
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Export CSV</p>
              <p className="text-xs text-muted-foreground">All data</p>
            </div>
          </Button>
        </div>
      </div>

      {/* Form Preview Tabs */}
      <Tabs value={activeFormTab} onValueChange={setActiveFormTab}>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-primary" />
            <h2 className="text-sm font-semibold text-foreground">
              IRS Form Preview
            </h2>
            <Badge
              variant="outline"
              className="text-[10px] border-border text-muted-foreground font-mono"
            >
              Tax Year {taxYear}
            </Badge>
          </div>
          <TabsList className="bg-muted/50 border border-border h-8">
            <TabsTrigger
              data-ocid="reports.form8949_tab.tab"
              value="form8949"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono"
            >
              Form 8949
            </TabsTrigger>
            <TabsTrigger
              data-ocid="reports.scheduled_tab.tab"
              value="scheduled"
              className="text-xs h-6 px-3 data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-mono"
            >
              Schedule D
            </TabsTrigger>
          </TabsList>
        </div>

        <TabsContent value="form8949" className="mt-0">
          <Form8949Preview
            taxYear={taxYear}
            transactions={yearDisposals}
            isLoading={txLoading}
          />
        </TabsContent>

        <TabsContent value="scheduled" className="mt-0">
          <ScheduleDPreview
            taxYear={taxYear}
            transactions={yearDisposals}
            isLoading={txLoading}
          />
        </TabsContent>
      </Tabs>

      {/* International section */}
      <div className="rounded-lg border border-border bg-card p-5">
        <h2 className="text-sm font-semibold text-foreground mb-3">
          International Reports
        </h2>
        <p className="text-xs text-muted-foreground mb-4">
          Country-specific summaries for UK HMRC, Canadian T1135, Australian
          CGT, and German Anlage SO.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            "UK HMRC",
            "Canada T1135",
            "Australia CGT",
            "Germany Anlage SO",
          ].map((report) => (
            <Button
              key={report}
              variant="outline"
              className="flex items-center gap-2 px-3 py-2 border-border text-foreground hover:bg-secondary justify-start h-auto"
              onClick={() => handleDownload(report)}
            >
              <Download className="w-3 h-3 text-primary" />
              <span className="text-xs">{report}</span>
            </Button>
          ))}
        </div>
      </div>
    </div>
  );
}
