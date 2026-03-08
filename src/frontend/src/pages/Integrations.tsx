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
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import {
  Check,
  Hash,
  Key,
  RefreshCw,
  Search,
  Upload,
  Wifi,
  WifiOff,
} from "lucide-react";
import { useState } from "react";
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

export function Integrations() {
  const [search, setSearch] = useState("");
  const [integrations, setIntegrations] = useState(INTEGRATIONS);
  const [connectingId, setConnectingId] = useState<string | null>(null);
  const [connectState, setConnectState] = useState<
    "idle" | "connecting" | "connected"
  >("idle");
  const [apiKey, setApiKey] = useState("");
  const [apiSecret, setApiSecret] = useState("");
  const [address, setAddress] = useState("");
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [syncing, setSyncing] = useState(false);

  const filtered = integrations.filter((i) =>
    i.name.toLowerCase().includes(search.toLowerCase()),
  );

  const connectingItem = integrations.find((i) => i.id === connectingId);

  function openConnect(id: string) {
    setConnectingId(id);
    setConnectState("idle");
    setApiKey("");
    setApiSecret("");
    setAddress("");
  }

  function handleConnect() {
    setConnectState("connecting");
    setTimeout(() => {
      setConnectState("connected");
      setIntegrations((prev) =>
        prev.map((i) =>
          i.id === connectingId ? { ...i, connected: true } : i,
        ),
      );
      setTimeout(() => {
        setConnectingId(null);
        setConnectState("idle");
        toast.success(`${connectingItem?.name} connected successfully!`);
      }, 1000);
    }, 1500);
  }

  function handleDisconnect(id: string) {
    setIntegrations((prev) =>
      prev.map((i) => (i.id === id ? { ...i, connected: false } : i)),
    );
    toast.info("Integration disconnected");
  }

  async function handleSyncAll() {
    setSyncing(true);
    await new Promise((r) => setTimeout(r, 2000));
    setSyncing(false);
    toast.success("All integrations synced!");
  }

  const connectedCount = integrations.filter((i) => i.connected).length;

  return (
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
            disabled={syncing}
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
      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {filtered.map((integration, idx) => (
          <div
            key={integration.id}
            className={cn(
              "rounded-lg border bg-card p-4 flex flex-col gap-3 transition-all duration-200",
              integration.connected
                ? "border-primary/30 bg-primary/5"
                : "border-border hover:border-border hover:bg-secondary/20",
            )}
          >
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
              {integration.connected && (
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

            {/* Action */}
            <div className="flex items-center gap-1.5">
              {integration.connected ? (
                <>
                  <div className="flex items-center gap-1 flex-1">
                    <Wifi className="w-3 h-3 text-gain" />
                    <span className="text-xs text-gain">Connected</span>
                  </div>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-6 px-2 text-xs text-muted-foreground hover:text-destructive"
                    onClick={() => handleDisconnect(integration.id)}
                  >
                    <WifiOff className="w-3 h-3" />
                  </Button>
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
          </div>
        ))}
      </div>

      {/* Connect Modal */}
      <Dialog open={!!connectingId} onOpenChange={() => setConnectingId(null)}>
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
                    value={apiKey}
                    onChange={(e) => setApiKey(e.target.value)}
                    placeholder="Enter your read-only API key"
                    className="bg-secondary border-border text-foreground font-mono text-xs"
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
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  We only request read-only access. Your private keys are never
                  stored.
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
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  Public address only. We use this to fetch your transaction
                  history.
                </p>
              </TabsContent>
            </Tabs>
          )}

          {connectState === "connecting" && (
            <div className="flex items-center gap-3 py-4">
              <RefreshCw className="w-4 h-4 text-primary animate-spin" />
              <p className="text-sm text-muted-foreground">
                Connecting to {connectingItem?.name}...
              </p>
            </div>
          )}

          {connectState !== "connected" && connectState !== "connecting" && (
            <DialogFooter>
              <Button
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
              data-ocid="integrations.upload_button"
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
  );
}
