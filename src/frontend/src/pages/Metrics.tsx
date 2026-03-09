import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Activity,
  AlertCircle,
  Calendar,
  CheckCircle2,
  Code2,
  Database,
  Hash,
  Info,
  RefreshCw,
  Server,
  Shield,
  TrendingUp,
} from "lucide-react";
import { useCallback, useEffect, useState } from "react";

// Demo canister ID used when backend_canister_id is "undefined" (local dev / no deployment)
const DEMO_CANISTER_ID = "rrkah-fqaaa-aaaaa-aaaaq-cai";

interface RawApiData {
  canister_id?: string;
  canister_type?: string | null;
  controllers?: string[];
  id?: number;
  language?: string;
  module_hash?: string;
  name?: string;
  subnet_id?: string;
  updated_at?: string;
  upgrades?: Array<{
    executed_timestamp_seconds: number;
    module_hash: string;
    proposal_id: number;
  }>;
}

interface CanisterInfo {
  canisterId: string;
  label: string;
  description: string;
  name: string | null;
  subnetId: string | null;
  moduleHash: string | null;
  controllers: string[];
  lastUpdated: string | null;
  upgradeCount: number;
  language: string | null;
  isDemo: boolean;
  fetchError?: string;
}

function truncateMiddle(str: string, keepStart = 10, keepEnd = 6): string {
  if (!str || str.length <= keepStart + keepEnd + 3) return str;
  return `${str.slice(0, keepStart)}…${str.slice(-keepEnd)}`;
}

function formatDate(isoString: string): string {
  try {
    return new Date(isoString).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  } catch {
    return isoString;
  }
}

// Fetch canister info from the public IC API
async function fetchCanisterInfo(canisterId: string): Promise<RawApiData> {
  const response = await fetch(
    `https://ic-api.internetcomputer.org/api/v3/canisters/${canisterId}`,
    { signal: AbortSignal.timeout(10000) },
  );
  if (!response.ok) {
    throw new Error(`HTTP ${response.status}: ${response.statusText}`);
  }
  return response.json() as Promise<RawApiData>;
}

interface DetailRowProps {
  icon: React.ReactNode;
  label: string;
  value: string;
  title?: string;
  mono?: boolean;
}

function DetailRow({ icon, label, value, title, mono }: DetailRowProps) {
  return (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border/40 last:border-0">
      <div className="flex items-center gap-2 text-xs text-muted-foreground flex-shrink-0">
        {icon}
        <span>{label}</span>
      </div>
      <span
        className={`text-xs text-foreground text-right truncate max-w-[180px] ${mono ? "font-mono" : ""}`}
        title={title}
      >
        {value}
      </span>
    </div>
  );
}

interface CanisterCardProps {
  info: CanisterInfo;
  index: number;
}

function CanisterCard({ info, index }: CanisterCardProps) {
  return (
    <Card
      data-ocid={`metrics.canister.card.${index}`}
      className="bg-card border-border overflow-hidden"
    >
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 border border-primary/25 flex-shrink-0">
              <Server className="w-4 h-4 text-primary" />
            </div>
            <div className="min-w-0">
              <CardTitle className="text-sm font-semibold text-foreground leading-tight">
                {info.label}
              </CardTitle>
              <p className="text-xs text-muted-foreground mt-0.5">
                {info.description}
              </p>
            </div>
          </div>

          {info.name && (
            <Badge
              variant="outline"
              className="border-primary/30 bg-primary/10 text-primary text-xs flex-shrink-0"
            >
              <CheckCircle2 className="w-3 h-3 mr-1" />
              {info.name}
            </Badge>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-1">
        {/* Fetch error banner — shown per-card, doesn't block page */}
        {info.fetchError && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-destructive/10 border border-destructive/20 mb-3">
            <AlertCircle className="w-3.5 h-3.5 text-destructive flex-shrink-0 mt-0.5" />
            <p className="text-xs text-destructive/80">
              Could not load full metrics: {info.fetchError}
            </p>
          </div>
        )}

        {/* Canister ID */}
        <DetailRow
          icon={<Database className="w-3.5 h-3.5 flex-shrink-0" />}
          label="Canister ID"
          value={truncateMiddle(info.canisterId, 8, 5)}
          title={info.canisterId}
          mono
        />

        {/* Subnet ID */}
        {info.subnetId && (
          <DetailRow
            icon={<Activity className="w-3.5 h-3.5 flex-shrink-0" />}
            label="Subnet"
            value={truncateMiddle(info.subnetId, 8, 5)}
            title={info.subnetId}
            mono
          />
        )}

        {/* Module Hash */}
        {info.moduleHash && (
          <DetailRow
            icon={<Hash className="w-3.5 h-3.5 flex-shrink-0" />}
            label="Module Hash"
            value={truncateMiddle(info.moduleHash, 10, 6)}
            title={info.moduleHash}
            mono
          />
        )}

        {/* Controllers */}
        {info.controllers.length > 0 && (
          <DetailRow
            icon={<Shield className="w-3.5 h-3.5 flex-shrink-0" />}
            label={`Controllers (${info.controllers.length})`}
            value={truncateMiddle(info.controllers[0], 8, 5)}
            title={info.controllers.join(", ")}
            mono
          />
        )}

        {/* Last Updated */}
        {info.lastUpdated && (
          <DetailRow
            icon={<Calendar className="w-3.5 h-3.5 flex-shrink-0" />}
            label="Last Updated"
            value={formatDate(info.lastUpdated)}
          />
        )}

        {/* Total Upgrades */}
        {info.upgradeCount > 0 && (
          <DetailRow
            icon={<TrendingUp className="w-3.5 h-3.5 flex-shrink-0" />}
            label="Total Upgrades"
            value={String(info.upgradeCount)}
          />
        )}

        {/* Language */}
        {info.language && (
          <DetailRow
            icon={<Code2 className="w-3.5 h-3.5 flex-shrink-0" />}
            label="Language"
            value={info.language}
          />
        )}

        {/* Demo notice */}
        {info.isDemo && (
          <div className="flex items-start gap-2 p-2.5 rounded-md bg-yellow-500/10 border border-yellow-500/20 mt-3">
            <Info className="w-3.5 h-3.5 text-yellow-400 flex-shrink-0 mt-0.5" />
            <p className="text-xs text-yellow-300/80">
              This app hasn't been deployed yet. Deploy to see your real
              canister info.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function MetricsSkeleton() {
  return (
    <div
      data-ocid="metrics.loading_state"
      className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4"
    >
      {[1].map((i) => (
        <Card key={i} className="bg-card border-border">
          <CardHeader className="pb-3">
            <div className="flex items-center gap-2.5">
              <Skeleton className="w-9 h-9 rounded-lg" />
              <div className="space-y-1.5">
                <Skeleton className="h-4 w-36" />
                <Skeleton className="h-3 w-24" />
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
            <Skeleton className="h-8 w-full rounded-md" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

export function Metrics() {
  const [canisterInfos, setCanisterInfos] = useState<CanisterInfo[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [lastRefreshed, setLastRefreshed] = useState<Date | null>(null);

  const loadMetrics = useCallback(async () => {
    setIsLoading(true);

    // Determine the real canister ID — fall back to demo if not deployed
    let backendCanisterId: string = DEMO_CANISTER_ID;
    let isDemo = true;

    try {
      const envRes = await fetch("/env.json");
      if (envRes.ok) {
        const envData = (await envRes.json()) as {
          backend_canister_id?: string;
        };
        if (
          envData.backend_canister_id &&
          envData.backend_canister_id !== "undefined"
        ) {
          backendCanisterId = envData.backend_canister_id;
          isDemo = false;
        }
      }
    } catch {
      // env.json unavailable — keep demo mode
    }

    const canisters: Array<{
      id: string;
      label: string;
      description: string;
      isDemo: boolean;
    }> = [
      {
        id: backendCanisterId,
        label: "Application Canister",
        description: "Main backend — data storage & logic",
        isDemo,
      },
    ];

    const results: CanisterInfo[] = await Promise.all(
      canisters.map(async ({ id, label, description, isDemo: demo }) => {
        try {
          const data = await fetchCanisterInfo(id);
          return {
            canisterId: data.canister_id ?? id,
            label,
            description,
            name: data.name ?? null,
            subnetId: data.subnet_id ?? null,
            moduleHash: data.module_hash ?? null,
            controllers: data.controllers ?? [],
            lastUpdated: data.updated_at ?? null,
            upgradeCount: data.upgrades?.length ?? 0,
            language:
              data.language && data.language !== "" ? data.language : null,
            isDemo: demo,
          };
        } catch (err) {
          // HTTP fetch itself threw — show per-card error, still display canister ID
          return {
            canisterId: id,
            label,
            description,
            name: null,
            subnetId: null,
            moduleHash: null,
            controllers: [],
            lastUpdated: null,
            upgradeCount: 0,
            language: null,
            isDemo: demo,
            fetchError: err instanceof Error ? err.message : "Fetch failed",
          };
        }
      }),
    );

    setCanisterInfos(results);
    setLastRefreshed(new Date());
    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadMetrics();
  }, [loadMetrics]);

  return (
    <div className="flex flex-col h-full">
      {/* Page header */}
      <div className="flex items-center justify-between gap-4 px-6 py-5 border-b border-border bg-card/40">
        <div className="flex items-center gap-3">
          <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/15 border border-primary/25">
            <Activity className="w-5 h-5 text-primary" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-foreground font-display leading-tight">
              Canister Metrics
            </h1>
            <p className="text-xs text-muted-foreground mt-0.5">
              Internet Computer canister info via public API
              {lastRefreshed && (
                <>
                  {" "}
                  · Updated{" "}
                  {lastRefreshed.toLocaleTimeString([], {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                  })}
                </>
              )}
            </p>
          </div>
        </div>

        <Button
          data-ocid="metrics.refresh.button"
          variant="outline"
          size="sm"
          onClick={() => void loadMetrics()}
          disabled={isLoading}
          className="gap-2"
        >
          <RefreshCw
            className={`w-3.5 h-3.5 ${isLoading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {/* Page body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        {/* Info banner */}
        <div className="flex items-start gap-3 p-4 rounded-lg bg-blue-500/10 border border-blue-500/20">
          <Activity className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
          <div className="text-sm text-blue-300/90 space-y-1">
            <p className="font-medium text-blue-300">
              Live data from the Internet Computer public API
            </p>
            <p className="text-xs text-blue-300/70">
              Canister metadata including subnet, module hash, controllers, and
              upgrade history is fetched from{" "}
              <span className="font-mono">ic-api.internetcomputer.org</span>.
            </p>
          </div>
        </div>

        {/* Content */}
        {isLoading ? (
          <MetricsSkeleton />
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
            {canisterInfos.map((info, i) => (
              <CanisterCard key={info.canisterId} info={info} index={i + 1} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
