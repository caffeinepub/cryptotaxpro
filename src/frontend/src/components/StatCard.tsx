import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  label: string;
  value: string;
  subValue?: string;
  icon?: LucideIcon;
  trend?: "up" | "down" | "neutral";
  isLoading?: boolean;
  className?: string;
}

export function StatCard({
  label,
  value,
  subValue,
  icon: Icon,
  trend = "neutral",
  isLoading,
  className,
}: StatCardProps) {
  if (isLoading) {
    return (
      <div
        className={cn("rounded-lg border border-border bg-card p-4", className)}
      >
        <Skeleton className="h-4 w-24 mb-3" />
        <Skeleton className="h-7 w-32 mb-2" />
        <Skeleton className="h-3 w-20" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "rounded-lg border border-border bg-card p-4 transition-all duration-200 hover:border-border hover:shadow-card-hover",
        className,
      )}
    >
      <div className="flex items-start justify-between mb-1">
        <p className="text-xs font-medium text-muted-foreground uppercase tracking-wider">
          {label}
        </p>
        {Icon && (
          <div className="flex items-center justify-center w-7 h-7 rounded-md bg-primary/10">
            <Icon className="w-3.5 h-3.5 text-primary" />
          </div>
        )}
      </div>
      <p
        className={cn(
          "text-2xl font-bold font-display mt-2",
          trend === "up" && "text-gain",
          trend === "down" && "text-loss",
          trend === "neutral" && "text-foreground",
        )}
      >
        {value}
      </p>
      {subValue && (
        <p
          className={cn(
            "text-xs mt-1 font-medium",
            trend === "up" && "text-gain",
            trend === "down" && "text-loss",
            trend === "neutral" && "text-muted-foreground",
          )}
        >
          {subValue}
        </p>
      )}
    </div>
  );
}
