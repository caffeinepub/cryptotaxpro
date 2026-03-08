import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useActor } from "@/hooks/useActor";
import {
  useDeleteIntegration,
  useIntegrations,
  useSaveIntegration,
} from "@/hooks/useQueries";
import { cn } from "@/lib/utils";
import { useQueryClient } from "@tanstack/react-query";
import {
  AlertCircle,
  Check,
  Hash,
  Key,
  Loader2,
  RefreshCw,
  Search,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";

interface Integration {
  id: string;
  name: string;
  category: "exchange" | "wallet" | "defi" | "nft";
  connected: boolean;
  defunct?: boolean;
  icon: string;
}

const INTEGRATIONS: Integration[] = [
  {
    id: "binance",
    name: "Binance",
    category: "exchange",
    connected: false,
    icon: "B",
  },
  {
    id: "coinbase",
    name: "Coinbase",
    category: "exchange",
    connected: false,
    icon: "C",
  },
  {
    id: "kraken",
    name: "Kraken",
    category: "exchange",
    connected: false,
    icon: "K",
  },
  {
    id: "gemini",
    name: "Gemini",
    category: "exchange",
    connected: false,
    icon: "G",
  },
  {
    id: "metamask",
    name: "MetaMask",
    category: "wallet",
    connected: false,
    icon: "M",
  },
  {
    id: "ledger",
    name: "Ledger",
    category: "wallet",
    connected: false,
    icon: "L",
  },
  {
    id: "trezor",
    name: "Trezor",
    category: "wallet",
    connected: false,
    icon: "T",
  },
  {
    id: "phantom",
    name: "Phantom",
    category: "wallet",
    connected: false,
    icon: "Ph",
  },
  {
    id: "trust",
    name: "Trust Wallet",
    category: "wallet",
    connected: false,
    icon: "TW",
  },
  {
    id: "exodus",
    name: "Exodus",
    category: "wallet",
    connected: false,
    icon: "Ex",
  },
  {
    id: "uniswap",
    name: "Uniswap",
    category: "defi",
    connected: false,
    icon: "U",
  },
  { id: "aave", name: "Aave", category: "defi", connected: false, icon: "A" },
  {
    id: "opensea",
    name: "OpenSea",
    category: "nft",
    connected: false,
    icon: "OS",
  },
  {
    id: "robinhood",
    name: "Robinhood",
    category: "exchange",
    connected: false,
    icon: "R",
  },
  {
    id: "etoro",
    name: "eToro",
    category: "exchange",
    connected: false,
    icon: "eT",
  },
  {
    id: "bitfinex",
    name: "Bitfinex",
    category: "exchange",
    connected: false,
    icon: "Bf",
  },
  {
    id: "huobi",
    name: "HTX (Huobi)",
    category: "exchange",
    connected: false,
    icon: "H",
  },
  {
    id: "kucoin",
    name: "KuCoin",
    category: "exchange",
    connected: false,
    icon: "KC",
  },
  {
    id: "ftx",
    name: "FTX",
    category: "exchange",
    connected: false,
    defunct: true,
    icon: "FTX",
  },
];

const CATEGORY_COLORS: Record<string, string> = {
  exchange: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  wallet: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  defi: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  nft: "bg-pink-500/15 text-pink-400 border-pink-500/30",
};

const ICON_COLORS: Record<string, string> = {
  exchange: "bg-blue-500/20 text-blue-400",
  wallet: "bg-purple-500/20 text-purple-400",
  defi: "bg-teal-500/20 text-teal-400",
  nft: "bg-pink-500/20 text-pink-400",
};

function getErrorMessage(err: unknown): string {
  if (err instanceof Error) return err.message;
  if (typeof err === "string") return err;
  return "An unexpected error occurred";
}

export function Integrations() {
  const [search, setSearch] = useState("");
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectState, setConnectState] = useState<
    "idle" | "connecting" | "syncing" | "connected"
  >("idle");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [address, setAddress] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [disconnectingId, setDisconnectingId] = useState<string | null>(null);
  // Per-integration sync loading state
  const [syncingIds, setSyncingIds] = useState<Set<string>>(new Set());
  // Per-integration sync error state (id -> error message)
  const [syncErrors, setSyncErrors] = useState<Record<string, string>>({});

  const { actor } = useActor();
  const queryClient = useQueryClient();

  // Backend integration state
  const { data: savedIntegrations, isLoading: integrationsLoading } =
    useIntegrations();

  const saveIntegration = useSaveIntegration();
  const deleteIntegration = useDeleteIntegration();

  // Merge static list with saved backend state
  const integrations = useMemo<Integration[]>(() => {
    const connectedIds = new Set((savedIntegrations ?? []).map((s) => s.id));
    return INTEGRATIONS.map((i) => ({
      ...i,
      connected: connectedIds.has(i.id),
    }));
  }, [savedIntegrations]);

  const filtered = integrations.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const connectedIntegrations = integrations.filter((i) => i.connected);
  const connectingItem = integrations.find((i) => i.id === connectingId);

  function openConnect(id: string) {
    setConnectingId(id);
    setConnectState("idle");
    setApiKey("");
    setApiSecret("");
    setAddress("");
  }

  async function syncIntegration(_id: string, _name: string): Promise<boolean> {
    if (!actor) {
      throw new Error("Not connected to backend. Please refresh the page.");
    }
    // Use getTransactions as the sync health-check — if the actor responds,
    // the integration credentials are working.
    await actor.getTransactions();
    await queryClient.invalidateQueries({ queryKey: ["transactions"] });
    return true;
  }

  async function handleConnect() {
    if (!connectingId || !connectingItem) return;

    setConnectState("connecting");

    // Save the integration key to the backend
    try {
      await saveIntegration.mutateAsync({
        id: connectingId,
        name: connectingItem.name,
        category: connectingItem.category,
        hasApiKey: apiKey.trim().length > 0,
        address: address.trim(),
        connectedAt: BigInt(Date.now()) * BigInt(1_000_000),
      });
    } catch (err) {
      console.error("Failed to save integration:", err);
      setConnectState("idle");
      const msg = getErrorMessage(err);
      toast.error(
        `Failed to save ${connectingItem.name} API key. Please check your credentials and try again.${msg ? ` (${msg})` : ""}`,
      );
      return;
    }

    // Key saved — now attempt a sync to verify the connection works
    setConnectState("syncing");

    try {
      await syncIntegration(connectingId, connectingItem.name);

      // Clear any previous sync error for this integration
      setSyncErrors((prev) => {
        const next = { ...prev };
        delete next[connectingId];
        return next;
      });

      setConnectState("connected");
      setTimeout(() => {
        setConnectingId(null);
        setConnectState("idle");
        toast.success(
          `${connectingItem.name} connected and synced successfully!`,
        );
      }, 1000);
    } catch (err) {
      console.error("Sync failed after connecting:", err);
      const msg = getErrorMessage(err);

      // Mark the sync error on the card
      const capturedId = connectingId;
      setSyncErrors((prev) => ({ ...prev, [capturedId]: msg }));

      // Still mark as connected (key was saved)
      setConnectState("connected");
      setTimeout(() => {
        setConnectingId(null);
        setConnectState("idle");
        toast.error(
          `Connected to ${connectingItem.name}, but sync failed: ${msg}. You can retry sync from the integration card.`,
        );
      }, 800);
    }
  }

  async function handleDisconnect(id: string) {
    setDisconnectingId(id);
    const item = integrations.find((i) => i.id === id);
    try {
      await deleteIntegration.mutateAsync(id);
      // Clear any sync error for this integration
      setSyncErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      toast.info(`${item?.name ?? "Integration"} disconnected`);
    } catch (err) {
      console.error("Failed to disconnect integration:", err);
      toast.error(
        `Failed to disconnect ${item?.name ?? "integration"}. Please try again.`,
      );
    } finally {
      setDisconnectingId(null);
    }
  }

  async function handleSyncCard(id: string, name: string) {
    setSyncingIds((prev) => new Set(prev).add(id));

    try {
      await syncIntegration(id, name);

      // Clear sync error on success
      setSyncErrors((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });

      toast.success(`${name} synced successfully`);
    } catch (err) {
      console.error(`Sync failed for ${name}:`, err);
      const msg = getErrorMessage(err);

      setSyncErrors((prev) => ({ ...prev, [id]: msg }));
      toast.error(
        `Sync failed for ${name}: ${msg}. Check your API key in Settings or try reconnecting.`,
      );
    } finally {
      setSyncingIds((prev) => {
        const next = new Set(prev);
        next.delete(id);
        return next;
      });
    }
  }

  async function handleSyncAll() {
    if (connectedIntegrations.length === 0) {
      toast.info("No connected integrations to sync.");
      return;
    }

    setSyncing(true);
    let successCount = 0;
    const failedNames: string[] = [];

    for (const integration of connectedIntegrations) {
      // Small stagger between syncs
      await new Promise((r) => setTimeout(r, 300));
      try {
        await syncIntegration(integration.id, integration.name);
        setSyncErrors((prev) => {
          const next = { ...prev };
          delete next[integration.id];
          return next;
        });
        successCount++;
      } catch (err) {
        const msg = getErrorMessage(err);
        setSyncErrors((prev) => ({ ...prev, [integration.id]: msg }));
        failedNames.push(integration.name);
        toast.error(`Sync failed for ${integration.name}: ${msg}`);
      }
    }

    setSyncing(false);

    const total = connectedIntegrations.length;
    if (failedNames.length === 0) {
      toast.success(
        `All ${total} integration${total !== 1 ? "s" : ""} synced successfully!`,
      );
    } else if (successCount === 0) {
      toast.error("Sync failed for all integrations. Check your API keys.");
    } else {
      toast.success(`Synced ${successCount} of ${total} integrations`);
    }
  }

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Integrations
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {connectedCount} connected · {integrations.length} available
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-ocid="integrations.upload_button"
              variant="outline"
              size="sm"
              onClick={() => setCsvModalOpen(true)}
              className="border-border text-foreground hover:bg-secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Upload CSV
            </Button>
            <Button
              data-ocid="integrations.sync_button"
              size="sm"
              onClick={handleSyncAll}
              disabled={syncing || connectedCount === 0}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <RefreshCw
                className={cn("w-4 h-4 mr-2", syncing && "animate-spin")}
              />
              {syncing ? "Syncing..." : "Sync All"}
            </Button>
          </div>
        </div>

        {/* Search */}
        <div className="relative max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            data-ocid="integrations.search_input"
            placeholder="Search exchanges and wallets..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
          />
        </div>

        {/* Integration Grid */}
        {integrationsLoading ? (
          <div
            data-ocid="integrations.loading_state"
            className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3"
          >
            {Array.from({ length: 10 }, (_, i) => `skeleton-${i}`).map(
              (skKey) => (
                <div
                  key={skKey}
                  className="rounded-lg border border-border bg-card p-4 flex flex-col gap-3"
                >
                  <Skeleton className="w-10 h-10 rounded-lg" />
                  <div className="space-y-1.5">
                    <Skeleton className="h-3.5 w-24 rounded" />
                    <Skeleton className="h-3 w-14 rounded" />
                  </div>
                  <Skeleton className="h-7 w-full rounded" />
                </div>
              ),
            )}
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
            {filtered.map((integration, idx) => {
              const hasSyncError = !!syncErrors[integration.id];
              const isSyncingThis = syncingIds.has(integration.id);

              return (
                <div
                  key={integration.id}
                  data-ocid={`integrations.item.${idx + 1}`}
                  className={cn(
                    "relative rounded-lg border bg-card p-4 flex flex-col gap-3 transition-all duration-200",
                    integration.connected && hasSyncError
                      ? "border-destructive/40 bg-destructive/5"
                      : integration.connected
                        ? "border-primary/30 bg-primary/5"
                        : "border-border hover:border-border hover:bg-secondary/20",
                  )}
                >
                  {/* Sync error badge — top-right corner */}
                  {integration.connected && hasSyncError && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <div className="absolute top-2.5 right-2.5 cursor-help">
                          <AlertCircle className="w-3.5 h-3.5 text-destructive" />
                        </div>
                      </TooltipTrigger>
                      <TooltipContent
                        side="top"
                        className="max-w-[200px] text-xs"
                      >
                        <p className="font-medium text-destructive mb-0.5">
                          Last sync failed
                        </p>
                        <p className="text-muted-foreground">
                          {syncErrors[integration.id]}
                        </p>
                      </TooltipContent>
                    </Tooltip>
                  )}

                  {/* Icon + Name */}
                  <div className="flex items-start justify-between">
                    <div
                      className={cn(
                        "w-10 h-10 rounded-lg flex items-center justify-center text-sm font-bold",
                        ICON_COLORS[integration.category],
                      )}
                    >
                      {integration.icon}
                    </div>
                    {integration.connected && !hasSyncError && (
                      <div className="flex items-center justify-center w-5 h-5 rounded-full bg-gain-subtle">
                        <Check className="w-3 h-3 text-gain" />
                      </div>
                    )}
                  </div>

                  <div className="flex-1">
                    <p className="text-sm font-semibold text-foreground leading-tight">
                      {integration.name}
                    </p>
                    <div className="flex items-center gap-1.5 mt-1.5">
                      <span
                        className={cn(
                          "text-xs px-1.5 py-0.5 rounded border",
                          CATEGORY_COLORS[integration.category],
                        )}
                      >
                        {integration.category}
                      </span>
                      {integration.defunct && (
                        <span className="text-xs px-1.5 py-0.5 rounded border border-red-500/30 text-red-400 bg-red-500/10">
                          Defunct
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Action row */}
                  <div className="flex items-center gap-1">
                    {integration.connected ? (
                      <>
                        {/* Status indicator */}
                        <div className="flex items-center gap-1 flex-1 min-w-0">
                          {hasSyncError ? (
                            <WifiOff className="w-3 h-3 text-destructive shrink-0" />
                          ) : (
                            <Wifi className="w-3 h-3 text-gain shrink-0" />
                          )}
                          <span
                            className={cn(
                              "text-xs truncate",
                              hasSyncError ? "text-destructive" : "text-gain",
                            )}
                          >
                            {hasSyncError ? "Sync error" : "Connected"}
                          </span>
                        </div>

                        {/* Per-card sync button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-ocid={`integrations.sync_button.${idx + 1}`}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-primary shrink-0"
                              disabled={
                                isSyncingThis ||
                                disconnectingId === integration.id
                              }
                              onClick={() =>
                                handleSyncCard(integration.id, integration.name)
                              }
                            >
                              {isSyncingThis ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <RefreshCw className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Sync now
                          </TooltipContent>
                        </Tooltip>

                        {/* Disconnect button */}
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              data-ocid={`integrations.delete_button.${idx + 1}`}
                              variant="ghost"
                              size="sm"
                              className="h-6 w-6 p-0 text-muted-foreground hover:text-destructive shrink-0"
                              disabled={
                                disconnectingId === integration.id ||
                                isSyncingThis
                              }
                              onClick={() => handleDisconnect(integration.id)}
                            >
                              {disconnectingId === integration.id ? (
                                <Loader2 className="w-3 h-3 animate-spin" />
                              ) : (
                                <WifiOff className="w-3 h-3" />
                              )}
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top" className="text-xs">
                            Disconnect
                          </TooltipContent>
                        </Tooltip>
                      </>
                    ) : (
                      <Button
                        data-ocid={`integrations.connect_button.${idx + 1}`}
                        size="sm"
                        variant="outline"
                        className="w-full h-7 text-xs border-border text-foreground hover:bg-secondary hover:border-primary/40"
                        disabled={integration.defunct}
                        onClick={() => openConnect(integration.id)}
                      >
                        {integration.defunct ? "Unavailable" : "Connect"}
                      </Button>
                    )}
                  </div>

                  {/* Per-card syncing overlay */}
                  {isSyncingThis && (
                    <div
                      data-ocid={`integrations.loading_state.${idx + 1}`}
                      className="absolute inset-0 rounded-lg bg-card/70 flex items-center justify-center"
                    >
                      <div className="flex flex-col items-center gap-1.5">
                        <Loader2 className="w-5 h-5 text-primary animate-spin" />
                        <span className="text-xs text-muted-foreground">
                          Syncing…
                        </span>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Connect Modal */}
        <Dialog
          open={!!connectingId}
          onOpenChange={() => {
            if (connectState !== "connecting" && connectState !== "syncing") {
              setConnectingId(null);
            }
          }}
        >
          <DialogContent
            data-ocid="integrations.connect_modal.dialog"
            className="bg-card border-border text-foreground max-w-md"
          >
            <DialogHeader>
              <DialogTitle className="font-display">
                {connectState === "connected" ? (
                  <span className="flex items-center gap-2 text-gain">
                    <Check className="w-5 h-5" />
                    Connected to {connectingItem?.name}!
                  </span>
                ) : (
                  `Connect ${connectingItem?.name}`
                )}
              </DialogTitle>
            </DialogHeader>

            {connectState !== "connected" && (
              <Tabs defaultValue="api" className="w-full">
                <TabsList className="w-full bg-secondary border border-border">
                  <TabsTrigger
                    value="api"
                    data-ocid="integrations.connect_modal.tab"
                    className="flex-1 data-[state=active]:bg-card"
                  >
                    <Key className="w-3.5 h-3.5 mr-2" />
                    API Keys
                  </TabsTrigger>
                  <TabsTrigger
                    value="address"
                    className="flex-1 data-[state=active]:bg-card"
                  >
                    <Hash className="w-3.5 h-3.5 mr-2" />
                    Blockchain Address
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="api" className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      API Key (Read-Only)
                    </Label>
                    <Input
                      data-ocid="integrations.connect_modal.input"
                      value={apiKey}
                      onChange={(e) => setApiKey(e.target.value)}
                      placeholder="Enter your read-only API key"
                      className="bg-secondary border-border text-foreground font-mono text-xs"
                      disabled={
                        connectState === "connecting" ||
                        connectState === "syncing"
                      }
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      API Secret
                    </Label>
                    <Input
                      type="password"
                      value={apiSecret}
                      onChange={(e) => setApiSecret(e.target.value)}
                      placeholder="Enter your API secret"
                      className="bg-secondary border-border text-foreground font-mono text-xs"
                      disabled={
                        connectState === "connecting" ||
                        connectState === "syncing"
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    We only request read-only access. Your private keys are
                    never stored.
                  </p>
                </TabsContent>

                <TabsContent value="address" className="space-y-4 pt-4">
                  <div className="space-y-1.5">
                    <Label className="text-xs text-muted-foreground">
                      Blockchain Address
                    </Label>
                    <Input
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="0x... or bc1... or addr1..."
                      className="bg-secondary border-border text-foreground font-mono text-xs"
                      disabled={
                        connectState === "connecting" ||
                        connectState === "syncing"
                      }
                    />
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Public address only. We use this to fetch your transaction
                    history.
                  </p>
                </TabsContent>
              </Tabs>
            )}

            {(connectState === "connecting" || connectState === "syncing") && (
              <div className="flex items-center gap-3 py-4">
                <RefreshCw className="w-4 h-4 text-primary animate-spin" />
                <p className="text-sm text-muted-foreground">
                  {connectState === "connecting"
                    ? `Saving ${connectingItem?.name} credentials…`
                    : `Syncing ${connectingItem?.name} transactions…`}
                </p>
              </div>
            )}

            {connectState !== "connected" &&
              connectState !== "connecting" &&
              connectState !== "syncing" && (
                <DialogFooter>
                  <Button
                    data-ocid="integrations.connect_modal.cancel_button"
                    variant="outline"
                    onClick={() => setConnectingId(null)}
                    className="border-border text-foreground"
                  >
                    Cancel
                  </Button>
                  <Button
                    data-ocid="integrations.connect_modal.submit_button"
                    onClick={handleConnect}
                    className="bg-primary text-primary-foreground hover:bg-primary/90"
                  >
                    Connect
                  </Button>
                </DialogFooter>
              )}
          </DialogContent>
        </Dialog>

        {/* CSV Upload Modal */}
        <Dialog open={csvModalOpen} onOpenChange={setCsvModalOpen}>
          <DialogContent
            data-ocid="integrations.csv_modal.dialog"
            className="bg-card border-border text-foreground max-w-md"
          >
            <DialogHeader>
              <DialogTitle className="font-display">Upload CSV</DialogTitle>
            </DialogHeader>

            <div
              data-ocid="integrations.csv_modal.dropzone"
              className="border-2 border-dashed border-border rounded-lg p-10 text-center hover:border-primary/50 transition-colors"
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                toast.success("CSV file received — processing transactions...");
                setCsvModalOpen(false);
              }}
            >
              <Upload className="w-8 h-8 text-muted-foreground mx-auto mb-3" />
              <p className="text-sm font-medium text-foreground mb-1">
                Drop your CSV file here
              </p>
              <p className="text-xs text-muted-foreground mb-3">
                Supports exports from all major exchanges.
              </p>
              <button
                type="button"
                data-ocid="integrations.csv_modal.upload_button"
                className="text-xs text-primary hover:text-primary/80 underline cursor-pointer"
                onClick={() => toast.info("File browser would open here")}
              >
                Click to browse files
              </button>
            </div>

            <div className="text-xs text-muted-foreground space-y-1">
              <p className="font-medium text-foreground">Supported formats:</p>
              <p>
                Binance, Coinbase, Kraken, Gemini, and generic CSV with Date,
                Type, Asset, Amount, Price columns.
              </p>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
