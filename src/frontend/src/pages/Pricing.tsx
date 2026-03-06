import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, Star, Zap } from "lucide-react";
import { toast } from "sonner";
import { useUpgradePlan, useUserProfile } from "../hooks/useQueries";

interface PlanFeature {
  label: string;
  free: boolean | string;
  newbie: boolean | string;
  hodler: boolean | string;
  trader: boolean | string;
}

const FEATURES: PlanFeature[] = [
  {
    label: "Portfolio tracking",
    free: true,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "Holdings & unrealized gains",
    free: true,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "Transaction count",
    free: "Preview only",
    newbie: "Up to 100",
    hodler: "Up to 1,000",
    trader: "Up to 10,000",
  },
  {
    label: "Tax report downloads",
    free: false,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "Form 8949 & Schedule D",
    free: false,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "TurboTax / TaxAct export",
    free: false,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "CSV export",
    free: false,
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "Tax-loss harvesting",
    free: "Preview",
    newbie: true,
    hodler: true,
    trader: true,
  },
  {
    label: "DeFi & NFT support",
    free: false,
    newbie: false,
    hodler: true,
    trader: true,
  },
  {
    label: "International reports",
    free: false,
    newbie: false,
    hodler: true,
    trader: true,
  },
  {
    label: "Priority support",
    free: false,
    newbie: false,
    hodler: false,
    trader: true,
  },
  {
    label: "Unlimited wallets/exchanges",
    free: true,
    newbie: true,
    hodler: true,
    trader: true,
  },
];

const PLANS = [
  {
    id: "free",
    name: "Free",
    price: "$0",
    period: "forever",
    description: "Track your portfolio, preview gains",
    color: "border-border",
    buttonVariant: "outline" as const,
    featured: false,
  },
  {
    id: "newbie",
    name: "Newbie",
    price: "$49",
    period: "per tax year",
    description: "Perfect for casual investors",
    color: "border-blue-500/40",
    buttonVariant: "outline" as const,
    featured: false,
  },
  {
    id: "hodler",
    name: "Hodler",
    price: "$99",
    period: "per tax year",
    description: "For active crypto users",
    color: "border-primary",
    buttonVariant: "default" as const,
    featured: true,
  },
  {
    id: "trader",
    name: "Trader",
    price: "$179",
    period: "per tax year",
    description: "High-volume & DeFi traders",
    color: "border-yellow-500/40",
    buttonVariant: "outline" as const,
    featured: false,
  },
];

function FeatureValue({ value }: { value: boolean | string }) {
  if (value === true) return <Check className="w-4 h-4 text-gain mx-auto" />;
  if (value === false)
    return (
      <span className="text-muted-foreground text-lg leading-none mx-auto block text-center">
        —
      </span>
    );
  return (
    <span className="text-xs text-muted-foreground text-center block">
      {value}
    </span>
  );
}

export function Pricing() {
  const { data: profile } = useUserProfile();
  const upgradeMutation = useUpgradePlan();
  const currentPlan = profile?.plan ?? "free";

  async function handleUpgrade(planId: string) {
    if (planId === currentPlan) {
      toast.info("You're already on this plan");
      return;
    }
    try {
      await upgradeMutation.mutateAsync(planId);
      toast.success(`Upgraded to ${planId} plan! 🎉`);
    } catch {
      toast.error("Upgrade failed — please try again");
    }
  }

  return (
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="text-center max-w-xl mx-auto">
        <h1 className="text-3xl font-bold font-display text-foreground">
          Simple, Transparent Pricing
        </h1>
        <p className="text-muted-foreground mt-2 text-sm">
          Free portfolio tracking for everyone. Pay once per tax year when you
          need to file.
        </p>
      </div>

      {/* Plan Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 max-w-5xl mx-auto">
        {PLANS.map((plan, idx) => {
          const isCurrentPlan = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={cn(
                "relative rounded-xl border-2 bg-card p-5 flex flex-col transition-all duration-200",
                plan.featured
                  ? "border-primary shadow-lg shadow-primary/10"
                  : plan.color,
                isCurrentPlan && !plan.featured && "border-primary/50",
              )}
            >
              {plan.featured && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2">
                  <Badge className="bg-primary text-primary-foreground text-xs px-3 py-1 flex items-center gap-1">
                    <Star className="w-3 h-3" />
                    Most Popular
                  </Badge>
                </div>
              )}

              {isCurrentPlan && (
                <div className="absolute top-3 right-3">
                  <Badge
                    variant="outline"
                    className="text-xs border-primary/40 text-primary bg-primary/10"
                  >
                    Current
                  </Badge>
                </div>
              )}

              <div className="mb-4">
                <h3 className="text-lg font-bold font-display text-foreground">
                  {plan.name}
                </h3>
                <p className="text-xs text-muted-foreground mt-0.5">
                  {plan.description}
                </p>
              </div>

              <div className="mb-5">
                <div className="flex items-baseline gap-1">
                  <span className="text-3xl font-bold font-display text-foreground">
                    {plan.price}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground">{plan.period}</p>
              </div>

              <Button
                data-ocid={`pricing.upgrade_button.${idx + 1}`}
                variant={plan.featured ? "default" : "outline"}
                className={cn(
                  "w-full mt-auto",
                  plan.featured
                    ? "bg-primary text-primary-foreground hover:bg-primary/90"
                    : "border-border text-foreground hover:bg-secondary",
                  isCurrentPlan && "opacity-60 cursor-default",
                )}
                onClick={() => handleUpgrade(plan.id)}
                disabled={upgradeMutation.isPending}
              >
                {isCurrentPlan ? (
                  <>
                    <Check className="w-4 h-4 mr-2" />
                    Current Plan
                  </>
                ) : plan.id === "free" ? (
                  "Downgrade to Free"
                ) : (
                  <>
                    <Zap className="w-4 h-4 mr-2" />
                    Upgrade
                  </>
                )}
              </Button>
            </div>
          );
        })}
      </div>

      {/* Feature Comparison Table */}
      <div className="max-w-5xl mx-auto rounded-xl border border-border bg-card overflow-hidden">
        <div className="px-5 py-4 border-b border-border">
          <h2 className="text-sm font-semibold text-foreground">
            Feature Comparison
          </h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-border">
                <th className="text-left text-xs font-medium text-muted-foreground px-5 py-3 w-1/3">
                  Feature
                </th>
                {PLANS.map((plan) => (
                  <th
                    key={plan.id}
                    className={cn(
                      "text-center text-xs font-semibold px-4 py-3",
                      plan.featured ? "text-primary" : "text-foreground",
                    )}
                  >
                    {plan.name}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {FEATURES.map((feature, i) => (
                <tr
                  key={feature.label}
                  className={cn(
                    "border-b border-border last:border-0",
                    i % 2 === 0 ? "bg-secondary/10" : "",
                  )}
                >
                  <td className="text-xs text-muted-foreground px-5 py-3">
                    {feature.label}
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FeatureValue value={feature.free} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FeatureValue value={feature.newbie} />
                  </td>
                  <td className="px-4 py-3 text-center bg-primary/5">
                    <FeatureValue value={feature.hodler} />
                  </td>
                  <td className="px-4 py-3 text-center">
                    <FeatureValue value={feature.trader} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Disclaimer */}
      <p className="text-xs text-muted-foreground text-center max-w-xl mx-auto">
        Tax calculations are for informational purposes only and should not be
        considered legal or tax advice. Consult a qualified tax professional for
        your specific situation. Prices are in USD and billed once per tax year.
      </p>
    </div>
  );
}
