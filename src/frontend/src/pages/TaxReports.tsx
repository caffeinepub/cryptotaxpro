import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Lock,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import { StatCard } from "../components/StatCard";
import {
  useTaxSummary,
  useTransactions,
  useUpgradePlan,
  useUserProfile,
} from "../hooks/useQueries";
import { formatCurrency, formatDate } from "../utils/format";

const PLAN_OPTIONS = [
  {
    id: "newbie",
    name: "Newbie",
    price: "$49",
    limit: "Up to 100 transactions",
    color: "border-blue-500/40 hover:border-blue-500/70",
    badge: "",
  },
  {
    id: "hodler",
    name: "Hodler",
    price: "$99",
    limit: "Up to 1,000 transactions",
    color: "border-primary/50 hover:border-primary/80",
    badge: "Most Popular",
  },
  {
    id: "trader",
    name: "Trader",
    price: "$179",
    limit: "Up to 10,000 transactions",
    color: "border-yellow-500/40 hover:border-yellow-500/70",
    badge: "",
  },
];

export function TaxReports() {
  const [taxYear, setTaxYear] = useState("2025");
  const [upgradeOpen, setUpgradeOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState("hodler");
  const [upgradeSuccess, setUpgradeSuccess] = useState(false);

  const { data: taxSummary, isLoading: summaryLoading } = useTaxSummary(
    BigInt(Number(taxYear)),
  );
  const { data: transactions, isLoading: txLoading } = useTransactions();
  const { data: profile } = useUserProfile();
  const upgradeMutation = useUpgradePlan();

  const isPaid = profile?.plan !== "free";
  const method = profile?.costBasisMethod ?? "FIFO";

  // Form 8949 data — trade transactions
  const form8949Txs = (transactions ?? [])
    .filter(
      (tx) =>
        tx.txType === "Trade" || tx.txType === "NFT" || tx.txType === "DeFi",
    )
    .slice(0, 10);

  async function handleDownload(reportName: string) {
    if (!isPaid) {
      setUpgradeOpen(true);
      return;
    }
    toast.success(`Downloading ${reportName}...`);
  }

  async function handleUpgrade() {
    try {
      await upgradeMutation.mutateAsync(selectedPlan);
      setUpgradeSuccess(true);
      setTimeout(() => {
        setUpgradeOpen(false);
        setUpgradeSuccess(false);
        toast.success(`Upgraded to ${selectedPlan} plan!`);
      }, 1500);
    } catch {
      toast.error("Upgrade failed");
    }
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
          {!isPaid && (
            <Badge
              variant="outline"
              className="ml-2 border-yellow-500/40 text-yellow-500 bg-yellow-500/10 text-xs"
            >
              <Lock className="w-3 h-3 mr-1" /> Paid Plan Required
            </Badge>
          )}
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Button
            data-ocid="reports.download_8949.button"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative",
              !isPaid && "opacity-75",
            )}
            onClick={() => handleDownload("Form 8949 (PDF)")}
          >
            {!isPaid && (
              <Lock className="absolute top-2 right-2 w-3 h-3 text-yellow-500" />
            )}
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Form 8949</p>
              <p className="text-xs text-muted-foreground">PDF</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.download_scheduled.button"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative",
              !isPaid && "opacity-75",
            )}
            onClick={() => handleDownload("Schedule D")}
          >
            {!isPaid && (
              <Lock className="absolute top-2 right-2 w-3 h-3 text-yellow-500" />
            )}
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Schedule D</p>
              <p className="text-xs text-muted-foreground">PDF</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.export_turbotax.button"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative",
              !isPaid && "opacity-75",
            )}
            onClick={() => handleDownload("TurboTax Export")}
          >
            {!isPaid && (
              <Lock className="absolute top-2 right-2 w-3 h-3 text-yellow-500" />
            )}
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">TurboTax</p>
              <p className="text-xs text-muted-foreground">TXF</p>
            </div>
          </Button>
          <Button
            data-ocid="reports.export_csv.button"
            variant="outline"
            className={cn(
              "flex flex-col items-center gap-2 h-auto py-4 border-border text-foreground hover:bg-secondary relative",
              !isPaid && "opacity-75",
            )}
            onClick={() => handleDownload("CSV Export")}
          >
            {!isPaid && (
              <Lock className="absolute top-2 right-2 w-3 h-3 text-yellow-500" />
            )}
            <Download className="w-5 h-5 text-primary" />
            <div className="text-center">
              <p className="text-xs font-semibold">Export CSV</p>
              <p className="text-xs text-muted-foreground">All data</p>
            </div>
          </Button>
        </div>
        {!isPaid && (
          <p className="text-xs text-muted-foreground mt-3">
            <Button
              variant="link"
              className="text-primary p-0 h-auto text-xs"
              onClick={() => setUpgradeOpen(true)}
            >
              Upgrade your plan
            </Button>{" "}
            to download tax reports and export data.
          </p>
        )}
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
          Currently showing US reports. Country-specific summaries for UK HMRC,
          Canadian T1135, Australian CGT, and German Anlage SO are available on
          paid plans.
        </p>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {[
            "UK HMRC",
            "Canada T1135",
            "Australia CGT",
            "Germany Anlage SO",
          ].map((report) => (
            <div
              key={report}
              className="flex items-center gap-2 px-3 py-2 rounded-md border border-border bg-secondary/30 opacity-60"
            >
              <Lock className="w-3 h-3 text-muted-foreground" />
              <span className="text-xs text-muted-foreground">{report}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Upgrade Modal */}
      <Dialog open={upgradeOpen} onOpenChange={setUpgradeOpen}>
        <DialogContent
          data-ocid="reports.upgrade_modal.dialog"
          className="bg-card border-border text-foreground max-w-lg"
        >
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2">
              {upgradeSuccess ? (
                <>
                  <CheckCircle2 className="w-5 h-5 text-gain" />
                  Upgraded Successfully!
                </>
              ) : (
                <>
                  <Lock className="w-5 h-5 text-primary" />
                  Unlock Tax Reports
                </>
              )}
            </DialogTitle>
            {!upgradeSuccess && (
              <DialogDescription className="text-muted-foreground text-sm">
                Choose a plan to download your tax reports and export data.
              </DialogDescription>
            )}
          </DialogHeader>

          {!upgradeSuccess && (
            <div className="space-y-3 py-2">
              {PLAN_OPTIONS.map((plan) => (
                <button
                  key={plan.id}
                  type="button"
                  onClick={() => setSelectedPlan(plan.id)}
                  className={cn(
                    "w-full flex items-center justify-between p-4 rounded-lg border-2 transition-all text-left",
                    selectedPlan === plan.id
                      ? "border-primary bg-primary/10"
                      : cn(
                          "border-border bg-secondary/30 hover:bg-secondary/50",
                          plan.color,
                        ),
                  )}
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold text-foreground">
                        {plan.name}
                      </span>
                      {plan.badge && (
                        <Badge className="bg-primary text-primary-foreground text-xs px-1.5 py-0">
                          {plan.badge}
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground mt-0.5">
                      {plan.limit}
                    </p>
                  </div>
                  <div className="text-right">
                    <span className="text-lg font-bold text-foreground">
                      {plan.price}
                    </span>
                    <p className="text-xs text-muted-foreground">
                      per tax year
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}

          {!upgradeSuccess && (
            <DialogFooter>
              <Button
                data-ocid="reports.upgrade_modal.cancel_button"
                variant="outline"
                onClick={() => setUpgradeOpen(false)}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                data-ocid="reports.upgrade_modal.confirm_button"
                onClick={handleUpgrade}
                disabled={upgradeMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {upgradeMutation.isPending
                  ? "Processing..."
                  : `Upgrade to ${selectedPlan}`}
              </Button>
            </DialogFooter>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
