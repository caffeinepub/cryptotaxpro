import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertTriangle,
  DollarSign,
  Info,
  Scissors,
  TrendingDown,
} from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import type { HarvestCandidate } from "../backend.d";
import { useLivePrices } from "../hooks/useLivePrices";
import { useHarvestCandidates, useTransactions } from "../hooks/useQueries";
import { formatCurrency, formatNumber } from "../utils/format";

export function Harvesting() {
  const { data: transactions } = useTransactions();
  const heldSymbols = [
    ...new Set((transactions ?? []).map((tx) => tx.asset.toUpperCase())),
  ];
  const { prices: livePrices } = useLivePrices(heldSymbols);
  const { data: candidates, isLoading } = useHarvestCandidates(livePrices);
  const [simulatingItem, setSimulatingItem] = useState<HarvestCandidate | null>(
    null,
  );
  const [simulated, setSimulated] = useState(false);

  const totalSavings = (candidates ?? []).reduce(
    (sum, c) => sum + c.taxSavings,
    0,
  );
  const totalLoss = (candidates ?? []).reduce(
    (sum, c) => sum + c.unrealizedLoss,
    0,
  );

  function handleSimulate(candidate: HarvestCandidate) {
    setSimulatingItem(candidate);
    setSimulated(false);
  }

  function confirmSimulate() {
    setSimulated(true);
    setTimeout(() => {
      setSimulatingItem(null);
      setSimulated(false);
      toast.success(
        "Harvest simulation complete! Review your transactions to proceed.",
      );
    }, 1800);
  }

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Tax-Loss Harvesting
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Identify and simulate strategic losses to reduce your tax liability
        </p>
      </div>

      {/* Explanation Card */}
      <div className="rounded-lg border border-primary/20 bg-primary/5 p-5">
        <div className="flex items-start gap-3">
          <div className="flex items-center justify-center w-8 h-8 rounded-lg bg-primary/20 flex-shrink-0 mt-0.5">
            <Info className="w-4 h-4 text-primary" />
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-1">
              What is Tax-Loss Harvesting?
            </h2>
            <p className="text-sm text-muted-foreground leading-relaxed">
              Tax-loss harvesting is the practice of selling assets that have
              declined in value to realize a capital loss. These losses can
              offset capital gains, potentially reducing your tax bill. After
              selling, you can reinvest in similar (but not substantially
              identical) assets to maintain your market exposure.
            </p>
            <div className="flex items-center gap-2 mt-3">
              <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0" />
              <p className="text-xs text-yellow-500/90">
                <strong>Wash Sale Warning:</strong> The IRS prohibits claiming a
                loss if you buy the same or substantially identical asset within
                30 days before or after the sale. Note: This rule currently
                applies to stocks — crypto wash sale rules are evolving.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Harvest Candidates
          </p>
          <p className="text-2xl font-bold font-display text-foreground">
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              (candidates?.length ?? 0)
            )}
          </p>
          <p className="text-xs text-muted-foreground mt-1">
            Assets with unrealized losses
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Total Unrealized Loss
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-28" />
          ) : (
            <p className="text-2xl font-bold font-display text-loss">
              {formatCurrency(totalLoss)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            If all candidates harvested
          </p>
        </div>
        <div className="rounded-lg border border-border bg-card p-4">
          <p className="text-xs text-muted-foreground uppercase tracking-wider mb-1">
            Potential Tax Savings
          </p>
          {isLoading ? (
            <Skeleton className="h-7 w-24" />
          ) : (
            <p className="text-2xl font-bold font-display text-gain">
              {formatCurrency(totalSavings)}
            </p>
          )}
          <p className="text-xs text-muted-foreground mt-1">
            Estimated at 27% effective rate
          </p>
        </div>
      </div>

      {/* Harvest Candidates Table */}
      <div className="rounded-lg border border-border bg-card overflow-hidden">
        <div className="px-4 py-3 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Harvest Candidates
          </h2>
          <p className="text-xs text-muted-foreground">
            Assets currently at a loss
          </p>
        </div>
        <div className="overflow-x-auto">
          <Table>
            <TableHeader>
              <TableRow className="border-border hover:bg-transparent">
                <TableHead className="text-xs text-muted-foreground py-3">
                  Asset
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Current Price
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Amount
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Current Value
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  Unrealized Loss
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <DollarSign className="w-3 h-3" />
                    Est. Tax Savings
                  </div>
                </TableHead>
                <TableHead className="text-xs text-muted-foreground py-3 text-center">
                  Action
                </TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {isLoading
                ? (["a", "b", "c"] as const).map((k) => (
                    <TableRow key={`hvst-sk-${k}`} className="border-border">
                      {(["1", "2", "3", "4", "5", "6", "7"] as const).map(
                        (j) => (
                          <TableCell key={`c-${j}`}>
                            <Skeleton className="h-4 w-full" />
                          </TableCell>
                        ),
                      )}
                    </TableRow>
                  ))
                : (candidates ?? []).map((candidate, idx) => (
                    <TableRow key={candidate.asset} className="border-border">
                      <TableCell className="py-4">
                        <div>
                          <span className="text-sm font-semibold text-foreground">
                            {candidate.asset}
                          </span>
                          <p className="text-xs text-muted-foreground">
                            {candidate.assetName}
                          </p>
                        </div>
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs mono text-foreground">
                        {formatCurrency(candidate.currentPrice)}
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs mono text-foreground">
                        {formatNumber(candidate.amount, 4)}
                      </TableCell>
                      <TableCell className="py-4 text-right text-xs mono text-foreground">
                        {formatCurrency(
                          candidate.currentPrice * candidate.amount,
                        )}
                      </TableCell>
                      <TableCell className="py-4 text-right text-sm font-semibold text-loss mono">
                        {formatCurrency(candidate.unrealizedLoss)}
                      </TableCell>
                      <TableCell className="py-4 text-right">
                        <Badge className="bg-gain-subtle text-gain border border-gain/20 text-xs mono">
                          +{formatCurrency(candidate.taxSavings)}
                        </Badge>
                      </TableCell>
                      <TableCell className="py-4 text-center">
                        <Button
                          data-ocid={`harvesting.simulate_button.${idx + 1}`}
                          size="sm"
                          variant="outline"
                          onClick={() => handleSimulate(candidate)}
                          className="border-primary/40 text-primary hover:bg-primary/10 hover:border-primary/70"
                        >
                          <Scissors className="w-3.5 h-3.5 mr-1.5" />
                          Simulate
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
            </TableBody>
          </Table>

          {!isLoading && (candidates ?? []).length === 0 && (
            <div
              className="py-12 text-center"
              data-ocid="harvesting.empty_state"
            >
              <TrendingDown className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm text-muted-foreground">
                No harvest candidates found
              </p>
              <p className="text-xs text-muted-foreground mt-1">
                All your holdings are currently at a gain
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Simulate Modal */}
      {simulatingItem && (
        <Dialog
          open={!!simulatingItem}
          onOpenChange={() => setSimulatingItem(null)}
        >
          <DialogContent
            data-ocid="harvesting.simulate_modal.dialog"
            className="bg-card border-border text-foreground max-w-md"
          >
            <DialogHeader>
              <DialogTitle className="font-display flex items-center gap-2">
                <Scissors className="w-4 h-4 text-primary" />
                Harvest Simulation: {simulatingItem.asset}
              </DialogTitle>
            </DialogHeader>

            {simulated ? (
              <div className="py-6 text-center space-y-3">
                <div className="w-12 h-12 rounded-full bg-gain-subtle flex items-center justify-center mx-auto">
                  <DollarSign className="w-6 h-6 text-gain" />
                </div>
                <p className="text-sm font-semibold text-foreground">
                  Simulation Complete!
                </p>
                <p className="text-xs text-muted-foreground">
                  Processing your harvest projection...
                </p>
              </div>
            ) : (
              <div className="space-y-4 py-3">
                <div className="rounded-lg bg-secondary/40 p-4 space-y-3">
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Asset</span>
                    <span className="font-semibold text-foreground">
                      {simulatingItem.asset} — {simulatingItem.assetName}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Amount to Sell
                    </span>
                    <span className="font-semibold text-foreground mono">
                      {formatNumber(simulatingItem.amount, 4)}{" "}
                      {simulatingItem.asset}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Current Price</span>
                    <span className="font-semibold text-foreground mono">
                      {formatCurrency(simulatingItem.currentPrice)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">Sale Proceeds</span>
                    <span className="font-semibold text-foreground mono">
                      {formatCurrency(
                        simulatingItem.currentPrice * simulatingItem.amount,
                      )}
                    </span>
                  </div>
                  <div className="border-t border-border pt-3 flex justify-between text-sm">
                    <span className="text-muted-foreground">Realized Loss</span>
                    <span className="font-bold text-loss mono">
                      {formatCurrency(simulatingItem.unrealizedLoss)}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-muted-foreground">
                      Estimated Tax Savings
                    </span>
                    <span className="font-bold text-gain mono">
                      +{formatCurrency(simulatingItem.taxSavings)}
                    </span>
                  </div>
                </div>

                <div className="flex items-start gap-2 p-3 rounded-md bg-yellow-500/10 border border-yellow-500/20">
                  <AlertTriangle className="w-3.5 h-3.5 text-yellow-500 flex-shrink-0 mt-0.5" />
                  <p className="text-xs text-yellow-500/90">
                    Remember the 30-day wash sale window. Avoid repurchasing{" "}
                    {simulatingItem.asset} within 30 days of this sale.
                  </p>
                </div>
              </div>
            )}

            {!simulated && (
              <DialogFooter>
                <Button
                  variant="outline"
                  onClick={() => setSimulatingItem(null)}
                  className="border-border text-foreground"
                >
                  Cancel
                </Button>
                <Button
                  onClick={confirmSimulate}
                  className="bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  <Scissors className="w-3.5 h-3.5 mr-2" />
                  Run Simulation
                </Button>
              </DialogFooter>
            )}
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
