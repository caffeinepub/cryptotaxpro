import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertTriangle,
  Calculator,
  Globe,
  Loader2,
  RefreshCw,
  Save,
} from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import type { UserProfile } from "../backend.d";
import { useActor } from "../hooks/useActor";
import { useSaveUserProfile, useUserProfile } from "../hooks/useQueries";

const COUNTRIES = [
  { code: "US", name: "United States" },
  { code: "UK", name: "United Kingdom" },
  { code: "CA", name: "Canada" },
  { code: "AU", name: "Australia" },
  { code: "DE", name: "Germany" },
  { code: "FR", name: "France" },
  { code: "ES", name: "Spain" },
  { code: "IT", name: "Italy" },
  { code: "NL", name: "Netherlands" },
  { code: "SE", name: "Sweden" },
  { code: "NO", name: "Norway" },
  { code: "DK", name: "Denmark" },
  { code: "CH", name: "Switzerland" },
  { code: "JP", name: "Japan" },
  { code: "SG", name: "Singapore" },
  { code: "IN", name: "India" },
  { code: "BR", name: "Brazil" },
  { code: "MX", name: "Mexico" },
  { code: "ZA", name: "South Africa" },
  { code: "NZ", name: "New Zealand" },
  { code: "AT", name: "Austria" },
  { code: "BE", name: "Belgium" },
  { code: "PL", name: "Poland" },
];

const CURRENCIES = [
  { code: "USD", name: "US Dollar ($)" },
  { code: "EUR", name: "Euro (€)" },
  { code: "GBP", name: "British Pound (£)" },
  { code: "CAD", name: "Canadian Dollar (CA$)" },
  { code: "AUD", name: "Australian Dollar (AU$)" },
  { code: "JPY", name: "Japanese Yen (¥)" },
  { code: "CHF", name: "Swiss Franc (CHF)" },
  { code: "SGD", name: "Singapore Dollar (S$)" },
];

interface CostBasisOption {
  id: string;
  name: string;
  description: string;
  detail: string;
}

const COST_BASIS_METHODS: CostBasisOption[] = [
  {
    id: "FIFO",
    name: "FIFO",
    description: "First In, First Out",
    detail:
      "Sells the oldest coins first. Default for most US filers. Generally results in more long-term gains.",
  },
  {
    id: "LIFO",
    name: "LIFO",
    description: "Last In, First Out",
    detail:
      "Sells the most recently purchased coins first. May result in more short-term gains.",
  },
  {
    id: "HIFO",
    name: "HIFO",
    description: "Highest In, First Out",
    detail:
      "Sells coins with the highest cost basis first. Often minimizes taxable gains.",
  },
  {
    id: "AverageCost",
    name: "Average Cost",
    description: "Average Cost Basis",
    detail:
      "Uses the average price paid across all purchases. Simple calculation, commonly used in UK.",
  },
  {
    id: "SharePooling",
    name: "Share Pooling",
    description: "Section 104 / Share Pooling",
    detail:
      "Required for UK taxpayers. Pools all purchases and uses average cost across the pool.",
  },
];

export function Settings() {
  const { data: profile, isLoading } = useUserProfile();
  const saveMutation = useSaveUserProfile();
  const { actor } = useActor();
  const queryClient = useQueryClient();

  const [formData, setFormData] = useState<UserProfile>({
    country: "US",
    currency: "USD",
    taxYear: BigInt(2025),
    plan: "free",
    costBasisMethod: "FIFO",
  });

  const [resetDialogOpen, setResetDialogOpen] = useState(false);
  const [resetting, setResetting] = useState(false);

  useEffect(() => {
    if (profile) {
      setFormData(profile);
    }
  }, [profile]);

  async function handleSave() {
    try {
      await saveMutation.mutateAsync(formData);
      toast.success("Settings saved successfully");
    } catch {
      toast.error("Failed to save settings");
    }
  }

  async function handleReset() {
    setResetting(true);
    try {
      if (actor) {
        // Delete all transactions from the backend
        const transactions = await actor.getTransactions();
        await Promise.all(
          transactions.map((tx) => actor.deleteTransaction(tx.id)),
        );
      }
      // Set transactions to empty immediately — portfolio, tax summary, and harvest
      // candidates are all derived from transactions via useMemo, so they will
      // update automatically without needing separate setQueryData calls.
      queryClient.setQueryData(["transactions"], []);
      await queryClient.invalidateQueries({ queryKey: ["transactions"] });
      setResetDialogOpen(false);
      toast.success("All data has been reset");
    } catch {
      toast.error("Failed to reset data");
    } finally {
      setResetting(false);
    }
  }

  if (isLoading) {
    return (
      <div className="p-6 flex items-center justify-center h-64">
        <div className="flex items-center gap-3 text-muted-foreground">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span className="text-sm">Loading settings...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 space-y-8 max-w-2xl">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold font-display text-foreground">
          Settings
        </h1>
        <p className="text-sm text-muted-foreground mt-0.5">
          Configure your account preferences and tax calculation settings
        </p>
      </div>

      {/* Account Section */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Globe className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Account Settings
          </h2>
        </div>
        <Separator className="bg-border" />

        <div className="space-y-4">
          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Country / Tax Jurisdiction
            </Label>
            <Select
              value={formData.country}
              onValueChange={(v) => setFormData((p) => ({ ...p, country: v }))}
            >
              <SelectTrigger
                data-ocid="settings.country_select"
                className="bg-card border-border text-foreground max-w-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="max-h-60">
                {COUNTRIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Determines which tax forms and rules apply to your reports.
            </p>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">
              Fiat Currency
            </Label>
            <Select
              value={formData.currency}
              onValueChange={(v) => setFormData((p) => ({ ...p, currency: v }))}
            >
              <SelectTrigger
                data-ocid="settings.currency_select"
                className="bg-card border-border text-foreground max-w-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {CURRENCIES.map((c) => (
                  <SelectItem key={c.code} value={c.code}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <Label className="text-xs text-muted-foreground">Tax Year</Label>
            <Select
              value={formData.taxYear.toString()}
              onValueChange={(v) =>
                setFormData((p) => ({ ...p, taxYear: BigInt(v) }))
              }
            >
              <SelectTrigger
                data-ocid="settings.year_select"
                className="bg-card border-border text-foreground max-w-xs"
              >
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="2025">2025</SelectItem>
                <SelectItem value="2024">2024</SelectItem>
                <SelectItem value="2023">2023</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      </section>

      {/* Tax Settings */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <Calculator className="w-4 h-4 text-primary" />
          <h2 className="text-sm font-semibold text-foreground">
            Tax Calculation
          </h2>
        </div>
        <Separator className="bg-border" />

        <div className="space-y-2">
          <Label className="text-xs text-muted-foreground">
            Cost Basis Method
          </Label>
          <RadioGroup
            data-ocid="settings.cost_basis.radio"
            value={formData.costBasisMethod}
            onValueChange={(v) =>
              setFormData((p) => ({ ...p, costBasisMethod: v }))
            }
            className="space-y-2"
          >
            {COST_BASIS_METHODS.map((method) => (
              <label
                key={method.id}
                htmlFor={method.id}
                className={cn(
                  "flex items-start gap-4 p-4 rounded-lg border cursor-pointer transition-all",
                  formData.costBasisMethod === method.id
                    ? "border-primary/50 bg-primary/5"
                    : "border-border bg-card hover:bg-secondary/30",
                )}
              >
                <RadioGroupItem
                  value={method.id}
                  id={method.id}
                  className="mt-0.5"
                />
                <div className="flex-1 space-y-0.5">
                  <div className="flex items-center gap-2">
                    <span className="text-sm font-semibold text-foreground">
                      {method.name}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {method.description}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground leading-relaxed">
                    {method.detail}
                  </p>
                </div>
              </label>
            ))}
          </RadioGroup>
          <p className="text-xs text-muted-foreground mt-2">
            Changing the cost basis method will recalculate all your gains and
            losses.
          </p>
        </div>
      </section>

      {/* Save Button */}
      <Button
        data-ocid="settings.save_button"
        onClick={handleSave}
        disabled={saveMutation.isPending}
        className="bg-primary text-primary-foreground hover:bg-primary/90"
      >
        {saveMutation.isPending ? (
          <>
            <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            Saving...
          </>
        ) : (
          <>
            <Save className="w-4 h-4 mr-2" />
            Save Settings
          </>
        )}
      </Button>

      {/* Danger Zone */}
      <section className="space-y-4">
        <div className="flex items-center gap-2 mb-2">
          <AlertTriangle className="w-4 h-4 text-destructive" />
          <h2 className="text-sm font-semibold text-destructive">
            Danger Zone
          </h2>
        </div>
        <Separator className="bg-destructive/20" />
        <div className="rounded-lg border border-destructive/20 bg-destructive/5 p-4 flex items-center justify-between">
          <div>
            <p className="text-sm font-medium text-foreground">
              Reset All Data
            </p>
            <p className="text-xs text-muted-foreground mt-0.5">
              Permanently delete all transactions, holdings, and tax data. This
              cannot be undone.
            </p>
          </div>
          <Button
            data-ocid="settings.reset_button"
            variant="destructive"
            size="sm"
            onClick={() => setResetDialogOpen(true)}
            className="flex-shrink-0 ml-4"
          >
            <RefreshCw className="w-3.5 h-3.5 mr-2" />
            Reset Data
          </Button>
        </div>
      </section>

      {/* Reset Confirmation Dialog */}
      <Dialog open={resetDialogOpen} onOpenChange={setResetDialogOpen}>
        <DialogContent className="bg-card border-border text-foreground max-w-sm">
          <DialogHeader>
            <DialogTitle className="font-display flex items-center gap-2 text-destructive">
              <AlertTriangle className="w-5 h-5" />
              Reset All Data?
            </DialogTitle>
            <DialogDescription className="text-muted-foreground text-sm">
              This will permanently delete all your transactions, holdings, and
              tax calculations. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => setResetDialogOpen(false)}
              className="border-border text-foreground"
            >
              Cancel
            </Button>
            <Button
              variant="destructive"
              onClick={handleReset}
              disabled={resetting}
            >
              {resetting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 mr-2 animate-spin" />
                  Resetting...
                </>
              ) : (
                "Yes, Reset Everything"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
