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
import { StatCard } from "../components/StatCard";
import {
  useTaxSummary,
  useTransactions,
  useUserProfile,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

export function TaxReports() {
  const [taxYear, setTaxYear] = useState("2025");

  const { data: taxSummary, isLoading: summaryLoading } = useTaxSummary(
    BigInt(Number(taxYear)),
  );
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: profile } = useUserProfile();

  const method = profile?.costBasisMethod ?? "FIFO";

  // Form 8949 data — trade transactions
  const form8949Txs = (transactions ?? [])
    .filter(
      (tx) =>
        tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi",
    )
    .slice(0, 10);

  function triggerDownload(
    content: string,
    filename: string,
    mimeType: string,
  ) {
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

  function escapeCsvField(value: string | number): string {
    const str = String(value);
    if (str.includes(",") || str.includes('"') || str.includes("\n")) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return str;
  }

  function handleDownload(reportName: string) {
    const txs = transactions ?? [];
    const yearTxs = txs.filter((tx) => tx.date.startsWith(taxYear));

    if (reportName === "Form 8949 (PDF)") {
      // Generate Form 8949 CSV
      const disposalTxs = yearTxs.filter(
        (tx) =>
          tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi",
      );
      const rows = [
        [
          "Description/Asset",
          "Date Acquired",
          "Date Sold",
          "Proceeds (USD)",
          "Cost Basis (USD)",
          "Gain/Loss (USD)",
          "Term",
        ].join(","),
        ...disposalTxs.map((tx) =>
          [
            escapeCsvField(`${tx.asset} (${tx.amount} units)`),
            escapeCsvField("Various"),
            escapeCsvField(tx.date),
            escapeCsvField((tx.priceUSD * tx.amount).toFixed(2)),
            escapeCsvField((tx.costBasisUSD * tx.amount).toFixed(2)),
            escapeCsvField(tx.gainLossUSD.toFixed(2)),
            escapeCsvField(tx.isShortTerm ? "Short-Term" : "Long-Term"),
          ].join(","),
        ),
      ];
      triggerDownload(rows.join("\n"), `form8949_${taxYear}.csv`, "text/csv");
    } else if (reportName === "Schedule D") {
      // Generate Schedule D summary CSV
      const rows = [
        [
          "Category",
          "Proceeds (USD)",
          "Cost Basis (USD)",
          "Gain/Loss (USD)",
        ].join(","),
        [
          escapeCsvField("Short-Term (Box A/B)"),
          escapeCsvField(
            (
              (taxSummary?.shortTermGains ?? 0) +
              Math.abs(taxSummary?.losses ?? 0)
            ).toFixed(2),
          ),
          escapeCsvField((taxSummary?.shortTermGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.shortTermGains ?? 0).toFixed(2)),
        ].join(","),
        [
          escapeCsvField("Long-Term (Box D/E)"),
          escapeCsvField((taxSummary?.longTermGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.longTermGains ?? 0).toFixed(2)),
          escapeCsvField((taxSummary?.longTermGains ?? 0).toFixed(2)),
        ].join(","),
        [
          escapeCsvField("Net Capital Gain/Loss"),
          "",
          "",
          escapeCsvField((taxSummary?.netGains ?? 0).toFixed(2)),
        ].join(","),
      ];
      triggerDownload(rows.join("\n"), `scheduleD_${taxYear}.csv`, "text/csv");
    } else if (reportName === "TurboTax Export") {
      // Generate TurboTax-compatible CSV
      const disposalTxs = yearTxs.filter(
        (tx) =>
          tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi",
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
            escapeCsvField((tx.costBasisUSD * tx.amount).toFixed(2)),
            escapeCsvField(tx.date),
            escapeCsvField((tx.priceUSD * tx.amount).toFixed(2)),
          ].join(","),
        ),
      ];
      triggerDownload(rows.join("\n"), `turbotax_${taxYear}.csv`, "text/csv");
    } else if (reportName === "CSV Export") {
      // Full transaction export
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
      // International reports — gains/losses summary
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
              <p className="text-xs text-muted-foreground">PDF</p>
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
              <p className="text-xs text-muted-foreground">PDF</p>
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

      {/* Form 8949 Preview */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border flex items-center justify-between">
          <div>
            <h2 className="text-sm font-semibold text-foreground">
              Form 8949 Preview
            </h2>
            <p className="text-xs text-muted-foreground">
              Sales and Other Dispositions of Capital Assets
            </p>
          </div>
          <Badge
            variant="outline"
            className="text-xs border-border text-muted-foreground"
          >
            Tax Year {taxYear}
          </Badge>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground py-3">
                  Asset
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3">
                  Date Acquired
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3">
                  Date Sold
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Proceeds
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Cost Basis
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Gain/Loss
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3">
                  Term
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {txLoading
                ? (["a", "b", "c", "d", "e"] as const).map((k) => (
                    <TableRow key={`f8949-sk-${k}`} className="border-border">
                      {(["1", "2", "3", "4", "5", "6", "7"] as const).map(
                        (j) => (
                          <TableCell key={`c-${j}`}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))
                : form8949Txs.map((tx) => (
                    <TableRow key={tx.id.toString()} className="border-border">
                      <TableCell className="py-3 text-sm font-semibold text-foreground">
                        {tx.asset}
                        <p className="text-xs text-muted-foreground font-normal">
                          {tx.amount} units
                        </p>
                      </TableCell>
                      <TableCell className="py-3 text-xs mono text-muted-foreground">
                        Various
                      </TableCell>
                      <TableCell className="py-3 text-xs mono text-muted-foreground">
                        {formatDate(tx.date)}
                      </TableCell>
                      <TableCell className="py-3 text-right text-xs mono text-foreground">
                        {formatCurrency(tx.priceUSD * tx.amount)}
                      </TableCell>
                      <TableCell className="py-3 text-right text-xs mono text-foreground">
                        {formatCurrency(tx.costBasisUSD * tx.amount)}
                      </TableCell>
                      <TableCell
                        className={cn(
                          "py-3 text-right text-xs font-medium mono",
                          tx.gainLossUSD >= 0 ? "text-gain" : "text-loss",
                        )}
                      >
                        {tx.gainLossUSD >= 0 ? "+" : ""}
                        {formatCurrency(tx.gainLossUSD)}
                      </TableCell>
                      <TableCell className="py-3">
                        <Badge
                          variant="outline"
                          className={cn(
                            "text-xs",
                            tx.isShortTerm
                              ? "border-orange-500/30 text-orange-400 bg-orange-500/10"
                              : "border-blue-500/30 text-blue-400 bg-blue-500/10",
                          )}
                        >
                          {tx.isShortTerm ? "Short" : "Long"}
                        </Badge>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>
        </div>
      </div>

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
