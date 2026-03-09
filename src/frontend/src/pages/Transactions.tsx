import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
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
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import {
  AlertTriangle,
  CheckCircle2,
  Edit2,
  FileUp,
  Plus,
  Search,
  Tag,
  Trash2,
  Upload,
  XCircle,
} from "lucide-react";
import { useCallback, useRef, useState } from "react";
import { toast } from "sonner";
import type { Transaction } from "../backend.d";
import { TxTypeBadge } from "../components/TxTypeBadge";
import {
  useAddTransaction,
  useDeleteTransaction,
  useTransactions,
  useUpdateTransaction,
} from "../hooks/useQueries";
import {
  formatCurrency,
  formatDate,
  formatNumber,
  gainLossClass,
} from "../utils/format";

// ──────────────────────────────────────────────
// CSV Import Dialog
// ──────────────────────────────────────────────

const SAMPLE_CSV = `Transaction ID,Transaction Type,Date & Time,Asset Acquired,Quantity Acquired (Bought, Received, etc),Cost Basis (Incl. Fees and/or Spread) (USD),Data Source,Asset Disposed (Sold, Sent, etc),Quantity Disposed,Proceeds (Excl. Fees and/or Spread) (USD)
abc-001,Buy,2025-01-15T10:30:00Z,BTC,0.5,33750.00,Coinbase,,,
abc-002,Sell,2025-03-20T14:15:00Z,,,16800.00,Coinbase,ETH,5,17500.00
abc-003,Rewards Income,2025-04-01T00:00:00Z,ETH,0.05,155.00,Coinbase,,,
abc-004,Send,2025-05-10T09:00:00Z,,,,Coinbase,BTC,0.1,
abc-005,Receive,2025-06-15T11:00:00Z,SOL,10,1200.00,Customer provided,,,
`;

interface ParsedRow {
  date: string;
  txType: string;
  asset: string;
  assetName: string;
  exchange: string;
  amount: number;
  priceUSD: number;
  costBasisUSD: number;
  gainLossUSD: number;
  notes: string;
  tags?: string[];
  transactionId?: string;
  isFlagged?: boolean;
  flagReason?: string;
}

/** Parse a single CSV line correctly handling quoted fields with commas inside */
function parseCsvLine(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        // escaped double-quote inside quoted field
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current.trim());
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current.trim());
  return cells;
}

type DetectedFormat =
  | "coinbase"
  | "coinbase_legacy"
  | "binance"
  | "kraken"
  | "gemini"
  | "generic";

function detectFormat(headers: string[]): DetectedFormat {
  const h = new Set(headers);
  // New Coinbase Transaction Report format (2025+)
  if (
    h.has("transaction id") &&
    (h.has("asset acquired") ||
      h.has("quantity acquired (bought, received, etc)") ||
      h.has("cost basis (incl. fees and/or spread) (usd)"))
  ) {
    return "coinbase";
  }
  // Legacy Coinbase format
  if (h.has("quantity transacted") || h.has("spot price at transaction")) {
    return "coinbase_legacy";
  }
  if (h.has("utc_time") && h.has("operation") && h.has("coin")) {
    return "binance";
  }
  if (h.has("txid") && h.has("refid") && h.has("aclass")) {
    return "kraken";
  }
  if (h.has("trade id") || (h.has("usd balance") && h.has("specification"))) {
    return "gemini";
  }
  return "generic";
}

const FORMAT_LABEL: Record<DetectedFormat, string> = {
  coinbase: "Coinbase",
  coinbase_legacy: "Coinbase (Legacy)",
  binance: "Binance",
  kraken: "Kraken",
  gemini: "Gemini",
  generic: "Generic",
};

function mapCoinbaseTxType(raw: string): { txType: string; tags: string[] } {
  const v = raw.toLowerCase().trim();
  if (v === "buy" || v === "advanced trade buy")
    return { txType: "Trade", tags: ["buy"] };
  if (v === "sell" || v === "advanced trade sell")
    return { txType: "Trade", tags: ["sell"] };
  if (v === "rewards income" || v === "staking income")
    return { txType: "Staking", tags: [] };
  if (v === "send") return { txType: "Transfer", tags: ["send"] };
  if (v === "receive") return { txType: "Transfer", tags: ["receive"] };
  if (v === "convert" || v === "converted from" || v === "converted to")
    return { txType: "Trade", tags: ["convert"] };
  if (v === "stake") return { txType: "Staking", tags: ["stake"] };
  if (v === "unstake") return { txType: "Transfer", tags: ["unstake"] };
  return { txType: "Trade", tags: [] };
}

function mapBinanceTxType(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v === "buy" || v === "spot trading" || v === "small assets exchange bnb")
    return "Trade";
  if (v === "staking rewards" || v === "staking purchase") return "Staking";
  if (v === "deposit" || v === "withdraw") return "Transfer";
  if (v === "airdrop assets") return "Airdrop";
  return "Trade";
}

function mapKrakenTxType(raw: string): string {
  const v = raw.toLowerCase().trim();
  if (v === "trade" || v === "spend" || v === "receive") return "Trade";
  if (v === "staking") return "Staking";
  if (v === "deposit" || v === "withdrawal") return "Transfer";
  return "Trade";
}

function normalizeKrakenAsset(raw: string): string {
  // Strip legacy X/Z prefix: XXBT→BTC, XETH→ETH, ZUSD→USD
  const v = raw.toUpperCase();
  if (v === "XXBT" || v === "XBT") return "BTC";
  if (v === "XETH") return "ETH";
  if (/^[XZ][A-Z]{3,}$/.test(v)) return v.slice(1);
  return v;
}

function mapGeminiTxType(raw: string): { txType: string; tags: string[] } {
  const v = raw.toLowerCase().trim();
  if (v === "buy") return { txType: "Trade", tags: ["buy"] };
  if (v === "sell") return { txType: "Trade", tags: ["sell"] };
  if (v === "credit") return { txType: "Airdrop", tags: [] };
  if (v === "debit") return { txType: "Transfer", tags: [] };
  return { txType: "Trade", tags: [] };
}

function extractGeminiAsset(symbol: string): string {
  // "BTCUSD" → "BTC", strip trailing 3-letter fiat
  const s = symbol.toUpperCase();
  const fiat = ["USD", "EUR", "GBP", "SGD", "AUD"];
  for (const f of fiat) {
    if (s.endsWith(f) && s.length > f.length) {
      return s.slice(0, s.length - f.length);
    }
  }
  return s;
}

function parseCSV(text: string): {
  rows: ParsedRow[];
  errors: string[];
  format: DetectedFormat;
} {
  const lines = text.split(/\r?\n/).filter((l) => l.trim().length > 0);
  if (lines.length < 2) {
    return {
      rows: [],
      errors: ["CSV must have a header row and at least one data row."],
      format: "generic",
    };
  }

  const rawHeaders = parseCsvLine(lines[0]);
  const headers = rawHeaders.map((h) => h.toLowerCase().replace(/['"]/g, ""));
  const format = detectFormat(headers);

  const colIdx = (name: string) =>
    headers.findIndex((h) => h === name.toLowerCase());

  const errors: string[] = [];
  const rows: ParsedRow[] = [];

  // New Coinbase Transaction Report format (2025+)
  if (format === "coinbase") {
    const iTxId = colIdx("transaction id");
    const iType = colIdx("transaction type");
    const iDateTime = colIdx("date & time");
    const iAssetAcq = colIdx("asset acquired");
    const iQtyAcq = colIdx("quantity acquired (bought, received, etc)");
    const iCostBasis = colIdx("cost basis (incl. fees and/or spread) (usd)");
    const iDataSource = colIdx("data source");
    const iAssetDisp = colIdx("asset disposed (sold, sent, etc)");
    const iQtyDisp = colIdx("quantity disposed");
    const iProceeds = colIdx("proceeds (excl. fees and/or spread) (usd)");

    if (iDateTime === -1) {
      errors.push(
        "Coinbase Transaction Report CSV missing required 'Date & Time' column.",
      );
      return { rows: [], errors, format };
    }

    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (c[idx] ?? "").trim() : "");

      const parseUSD = (val: string) =>
        Number.parseFloat(val.replace(/[$,]/g, "")) || 0;

      const txId = get(iTxId);
      const rawType = get(iType);
      const { txType, tags } = mapCoinbaseTxType(rawType);

      // Date: handle "2025-01-15T10:30:00Z" or "2025-01-15 10:30:00 UTC"
      const rawDateTime = get(iDateTime);
      const date = rawDateTime.slice(0, 10).replace(" ", "-");

      const assetAcq = get(iAssetAcq).toUpperCase();
      const qtyAcq = Number.parseFloat(get(iQtyAcq)) || 0;
      const costBasis = parseUSD(get(iCostBasis));
      const dataSource = get(iDataSource) || "Coinbase";
      const assetDisp = get(iAssetDisp).toUpperCase();
      const qtyDisp = Number.parseFloat(get(iQtyDisp)) || 0;
      const proceeds = parseUSD(get(iProceeds));

      // Determine primary asset: prefer acquired, fall back to disposed
      const asset = assetAcq || assetDisp || "UNKNOWN";
      // Determine amount: prefer acquired qty, fall back to disposed qty
      const amount = qtyAcq > 0 ? qtyAcq : qtyDisp;

      // Compute priceUSD from proceeds / qtyDisp for sells
      const priceUSD = proceeds > 0 && qtyDisp > 0 ? proceeds / qtyDisp : 0;

      // gainLossUSD for sells/disposals: proceeds - costBasis
      const isSell = [
        "sell",
        "advanced trade sell",
        "send",
        "converted from",
      ].includes(rawType.toLowerCase().trim());
      const gainLossUSD = isSell && proceeds > 0 ? proceeds - costBasis : 0;

      // Build notes
      const notesParts: string[] = [];
      if (txId) notesParts.push(`TX: ${txId}`);
      if (assetAcq && assetDisp) notesParts.push(`Disposed: ${assetDisp}`);

      // Flag if missing cost basis on a trade
      const isFlagged = costBasis === 0 && txType === "Trade";
      const flagReason = isFlagged ? "Missing cost basis" : "";

      rows.push({
        date,
        txType,
        asset,
        assetName: asset,
        exchange: dataSource,
        amount,
        priceUSD,
        costBasisUSD: costBasis,
        gainLossUSD,
        notes: notesParts.join(" | "),
        tags,
        transactionId: txId || undefined,
        isFlagged,
        flagReason,
      });
    }
    return { rows, errors, format };
  }

  // Legacy Coinbase format (old CSV export)
  if (format === "coinbase_legacy") {
    const iDate = colIdx("timestamp");
    const iType = colIdx("transaction type");
    const iAsset = colIdx("asset");
    const iQty = colIdx("quantity transacted");
    const iSpot = colIdx("spot price at transaction");
    const iSubtotal = colIdx("subtotal");
    const iNotes = colIdx("notes");

    if (iDate === -1 || iAsset === -1 || iQty === -1) {
      errors.push("Coinbase CSV missing required columns.");
      return { rows: [], errors, format };
    }

    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (c[idx] ?? "") : "");
      const { txType, tags } = mapCoinbaseTxType(get(iType));
      const asset = get(iAsset).toUpperCase();
      rows.push({
        date: get(iDate).slice(0, 10),
        txType,
        asset,
        assetName: asset,
        exchange: "Coinbase",
        amount: Math.abs(Number.parseFloat(get(iQty)) || 0),
        priceUSD: Number.parseFloat(get(iSpot)) || 0,
        costBasisUSD: Math.abs(Number.parseFloat(get(iSubtotal)) || 0),
        gainLossUSD: 0,
        notes: get(iNotes),
        tags,
      });
    }
    return { rows, errors, format };
  }

  if (format === "binance") {
    const iDate = colIdx("utc_time");
    const iOp = colIdx("operation");
    const iCoin = colIdx("coin");
    const iChange = colIdx("change");
    const iRemark = colIdx("remark");

    if (iDate === -1 || iCoin === -1) {
      errors.push("Binance CSV missing required columns.");
      return { rows: [], errors, format };
    }

    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (c[idx] ?? "") : "");
      const asset = get(iCoin).toUpperCase();
      rows.push({
        date: get(iDate).slice(0, 10),
        txType: mapBinanceTxType(get(iOp)),
        asset,
        assetName: asset,
        exchange: "Binance",
        amount: Math.abs(Number.parseFloat(get(iChange)) || 0),
        priceUSD: 0,
        costBasisUSD: 0,
        gainLossUSD: 0,
        notes: get(iRemark),
        tags: [],
      });
    }
    return { rows, errors, format };
  }

  if (format === "kraken") {
    const iTime = colIdx("time");
    const iType = colIdx("type");
    const iAsset = colIdx("asset");
    const iAmount = colIdx("amount");

    if (iTime === -1 || iAsset === -1 || iAmount === -1) {
      errors.push("Kraken CSV missing required columns.");
      return { rows: [], errors, format };
    }

    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (c[idx] ?? "") : "");
      const asset = normalizeKrakenAsset(get(iAsset));
      rows.push({
        date: get(iTime).slice(0, 10),
        txType: mapKrakenTxType(get(iType)),
        asset,
        assetName: asset,
        exchange: "Kraken",
        amount: Math.abs(Number.parseFloat(get(iAmount)) || 0),
        priceUSD: 0,
        costBasisUSD: 0,
        gainLossUSD: 0,
        notes: "",
        tags: [],
      });
    }
    return { rows, errors, format };
  }

  if (format === "gemini") {
    const iDate = colIdx("date");
    const iType = colIdx("type");
    const iSymbol = colIdx("symbol");
    const iUsdAmt = colIdx("usd amount");
    const iSpec = colIdx("specification");

    if (iDate === -1 || iType === -1) {
      errors.push("Gemini CSV missing required columns.");
      return { rows: [], errors, format };
    }

    for (let i = 1; i < lines.length; i++) {
      const c = parseCsvLine(lines[i]);
      const get = (idx: number) => (idx >= 0 ? (c[idx] ?? "") : "");
      const { txType, tags } = mapGeminiTxType(get(iType));
      const asset = iSymbol >= 0 ? extractGeminiAsset(get(iSymbol)) : "UNKNOWN";
      const usdAmt = Math.abs(
        Number.parseFloat(get(iUsdAmt).replace(/[,$]/g, "")) || 0,
      );
      rows.push({
        date: get(iDate).slice(0, 10),
        txType,
        asset,
        assetName: asset,
        exchange: "Gemini",
        amount: 0,
        priceUSD: 0,
        costBasisUSD: usdAmt,
        gainLossUSD: 0,
        notes: get(iSpec),
        tags,
      });
    }
    return { rows, errors, format };
  }

  // Generic fallback
  const colMap: Record<string, number> = {};
  const fieldMappings: Record<string, string[]> = {
    date: ["date"],
    txType: ["type", "txtype", "tx_type"],
    asset: ["asset"],
    assetName: ["assetname", "asset_name", "name"],
    exchange: ["exchange", "wallet"],
    amount: ["amount"],
    priceUSD: ["priceusd", "price_usd", "price"],
    costBasisUSD: ["costbasisusd", "cost_basis_usd", "costbasis", "cost_basis"],
    gainLossUSD: ["gainlossusd", "gain_loss_usd", "gainloss", "gain_loss"],
    notes: ["notes", "note", "comment"],
  };

  for (const [field, aliases] of Object.entries(fieldMappings)) {
    const idx = headers.findIndex((h) => aliases.includes(h));
    if (idx !== -1) colMap[field] = idx;
  }

  if (colMap.date === undefined) errors.push("Missing required column: date");
  if (colMap.asset === undefined) errors.push("Missing required column: asset");
  if (errors.length > 0) return { rows: [], errors, format };

  for (let i = 1; i < lines.length; i++) {
    const cells = parseCsvLine(lines[i]);
    const get = (field: string, fallback = "") =>
      colMap[field] !== undefined
        ? (cells[colMap[field]] ?? fallback)
        : fallback;

    rows.push({
      date: get("date"),
      txType: get("txType", "Trade"),
      asset: get("asset").toUpperCase(),
      assetName: get("assetName", get("asset")),
      exchange: get("exchange", ""),
      amount: Number.parseFloat(get("amount", "0")) || 0,
      priceUSD: Number.parseFloat(get("priceUSD", "0")) || 0,
      costBasisUSD: Number.parseFloat(get("costBasisUSD", "0")) || 0,
      gainLossUSD: Number.parseFloat(get("gainLossUSD", "0")) || 0,
      notes: get("notes", ""),
      tags: [],
    });
  }

  return { rows, errors, format };
}

function downloadSampleCsv() {
  const blob = new Blob([SAMPLE_CSV], { type: "text/csv" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "coinbase-transaction-report-sample.csv";
  a.click();
  URL.revokeObjectURL(url);
}

interface CsvImportDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

type ImportStep = "upload" | "preview" | "importing" | "done";

function CsvImportDialog({ open, onOpenChange }: CsvImportDialogProps) {
  const addMutation = useAddTransaction();
  const fileRef = useRef<HTMLInputElement>(null);
  const [step, setStep] = useState<ImportStep>("upload");
  const [parsedRows, setParsedRows] = useState<ParsedRow[]>([]);
  const [parseErrors, setParseErrors] = useState<string[]>([]);
  const [fileName, setFileName] = useState("");
  const [isDragging, setIsDragging] = useState(false);
  const [importProgress, setImportProgress] = useState(0);
  const [importTotal, setImportTotal] = useState(0);
  const [detectedFormat, setDetectedFormat] =
    useState<DetectedFormat>("generic");

  function resetState() {
    setStep("upload");
    setParsedRows([]);
    setParseErrors([]);
    setFileName("");
    setIsDragging(false);
    setImportProgress(0);
    setImportTotal(0);
    setDetectedFormat("generic");
    if (fileRef.current) fileRef.current.value = "";
  }

  function handleClose(openState: boolean) {
    if (!openState) resetState();
    onOpenChange(openState);
  }

  const processFile = useCallback((file: File) => {
    if (!file.name.endsWith(".csv")) {
      setParseErrors(["Only .csv files are accepted."]);
      setStep("preview");
      return;
    }
    setFileName(file.name);
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      const { rows, errors, format } = parseCSV(text);
      setParsedRows(rows);
      setParseErrors(errors);
      setDetectedFormat(format);
      setStep("preview");
    };
    reader.readAsText(file);
  }, []);

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) processFile(file);
  }

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLElement>) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files?.[0];
      if (file) processFile(file);
    },
    [processFile],
  );

  const handleDragOver = useCallback((e: React.DragEvent<HTMLElement>) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback(() => setIsDragging(false), []);

  async function handleImport() {
    if (parsedRows.length === 0) return;
    setStep("importing");
    setImportTotal(parsedRows.length);
    setImportProgress(0);

    let successCount = 0;
    for (let i = 0; i < parsedRows.length; i++) {
      const row = parsedRows[i];
      try {
        // Prepend transactionId to notes if present
        const notes = row.transactionId
          ? `TX: ${row.transactionId}${row.notes ? ` ${row.notes}` : ""}`.trim()
          : row.notes;

        const tx: Transaction = {
          date: row.date,
          txType: row.txType,
          asset: row.asset,
          assetName: row.assetName,
          exchange: row.exchange,
          amount: row.amount,
          priceUSD: row.priceUSD,
          costBasisUSD: row.costBasisUSD,
          gainLossUSD: row.gainLossUSD,
          notes,
          id: BigInt(Date.now() + i),
          isFlagged: row.isFlagged ?? false,
          flagReason: row.flagReason ?? "",
          tags: row.tags ?? [],
          isShortTerm: true,
        };
        await addMutation.mutateAsync(tx);
        successCount++;
      } catch {
        // continue importing remaining rows
      }
      setImportProgress(i + 1);
    }

    setStep("done");
    toast.success(
      `Imported ${successCount} of ${parsedRows.length} transactions`,
    );
  }

  const progressPct =
    importTotal > 0 ? Math.round((importProgress / importTotal) * 100) : 0;

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent
        data-ocid="transactions.csv_import.dialog"
        className="bg-card border-border text-foreground max-w-lg"
      >
        <DialogHeader>
          <DialogTitle className="font-display flex items-center gap-2">
            <FileUp className="w-4 h-4 text-primary" />
            Import Transactions from CSV
          </DialogTitle>
        </DialogHeader>

        {/* Step: Upload */}
        {step === "upload" && (
          <div className="space-y-4 py-2">
            <label
              data-ocid="transactions.csv_import.dropzone"
              onDrop={handleDrop}
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              className={cn(
                "flex flex-col items-center gap-3 p-8 rounded-lg border-2 border-dashed cursor-pointer transition-colors",
                isDragging
                  ? "border-primary bg-primary/10"
                  : "border-border hover:border-primary/50 hover:bg-primary/5",
              )}
            >
              <Upload className="w-8 h-8 text-muted-foreground" />
              <div className="text-center">
                <p className="text-sm font-medium text-foreground">
                  Drop your CSV file here
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  or click to browse
                </p>
              </div>
              <input
                ref={fileRef}
                type="file"
                accept=".csv"
                className="hidden"
                onChange={handleFileChange}
              />
            </label>

            <div className="rounded-md bg-secondary/50 border border-border px-4 py-3 space-y-2">
              <p className="text-xs font-medium text-muted-foreground">
                Supported formats:
              </p>
              <div className="flex flex-wrap gap-1.5">
                {(
                  [
                    "Coinbase",
                    "Binance",
                    "Kraken",
                    "Gemini",
                    "Generic CSV",
                  ] as const
                ).map((ex) => (
                  <span
                    key={ex}
                    className="text-xs px-2 py-0.5 rounded-full bg-secondary border border-border text-foreground"
                  >
                    {ex}
                  </span>
                ))}
              </div>
              <button
                type="button"
                data-ocid="transactions.csv_import.upload_button"
                onClick={downloadSampleCsv}
                className="flex items-center gap-1.5 text-xs text-primary hover:underline mt-1"
              >
                <FileUp className="w-3 h-3" />
                Download sample CSV
              </button>
            </div>
          </div>
        )}

        {/* Step: Preview */}
        {step === "preview" && (
          <div className="space-y-4 py-2">
            {parseErrors.length > 0 ? (
              <div className="rounded-md bg-destructive/10 border border-destructive/30 px-4 py-3 space-y-1">
                <p className="text-xs font-semibold text-destructive flex items-center gap-1.5">
                  <XCircle className="w-3.5 h-3.5" />
                  Parse errors
                </p>
                {parseErrors.map((e) => (
                  <p key={e} className="text-xs text-destructive/80">
                    {e}
                  </p>
                ))}
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2 text-sm flex-wrap">
                  <CheckCircle2 className="w-4 h-4 text-gain" />
                  <span className="text-foreground font-medium">
                    {parsedRows.length} rows detected
                  </span>
                  <span className="text-muted-foreground text-xs">
                    from {fileName}
                  </span>
                  <span className="ml-auto text-xs px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20">
                    Detected format: {FORMAT_LABEL[detectedFormat]}
                  </span>
                </div>

                {/* Preview table */}
                <div className="rounded-md border border-border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <thead>
                        <tr className="border-b border-border bg-secondary/50">
                          {["Date", "Type", "Asset", "Amount", "Price"].map(
                            (h) => (
                              <th
                                key={h}
                                className="px-3 py-2 text-left text-muted-foreground font-medium"
                              >
                                {h}
                              </th>
                            ),
                          )}
                        </tr>
                      </thead>
                      <tbody>
                        {parsedRows.slice(0, 3).map((row) => (
                          <tr
                            key={`${row.date}-${row.asset}-${row.amount}`}
                            className="border-b border-border last:border-0"
                          >
                            <td className="px-3 py-2 text-muted-foreground mono">
                              {row.date}
                            </td>
                            <td className="px-3 py-2">{row.txType}</td>
                            <td className="px-3 py-2 font-semibold">
                              {row.asset}
                            </td>
                            <td className="px-3 py-2 mono">
                              {row.amount.toString()}
                            </td>
                            <td className="px-3 py-2 mono">
                              ${row.priceUSD.toFixed(2)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {parsedRows.length > 3 && (
                    <p className="text-xs text-muted-foreground text-center py-2 border-t border-border">
                      + {parsedRows.length - 3} more rows
                    </p>
                  )}
                </div>
              </>
            )}
          </div>
        )}

        {/* Step: Importing */}
        {step === "importing" && (
          <div className="space-y-4 py-4">
            <p className="text-sm text-foreground">
              Importing {importProgress} / {importTotal} transactions...
            </p>
            <Progress value={progressPct} className="h-2" />
            <p className="text-xs text-muted-foreground text-center">
              Please wait, do not close this dialog.
            </p>
          </div>
        )}

        {/* Step: Done */}
        {step === "done" && (
          <div className="py-6 flex flex-col items-center gap-3">
            <CheckCircle2 className="w-10 h-10 text-gain" />
            <p className="text-sm font-medium text-foreground">
              Import complete!
            </p>
            <p className="text-xs text-muted-foreground">
              {importProgress} transactions imported successfully.
            </p>
          </div>
        )}

        <DialogFooter>
          <Button
            data-ocid="transactions.csv_import.cancel_button"
            variant="outline"
            onClick={() => handleClose(false)}
            className="border-border text-foreground"
            disabled={step === "importing"}
          >
            {step === "done" ? "Close" : "Cancel"}
          </Button>

          {step === "preview" &&
            parseErrors.length === 0 &&
            parsedRows.length > 0 && (
              <Button
                data-ocid="transactions.csv_import.import_button"
                onClick={handleImport}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                Import {parsedRows.length} rows
              </Button>
            )}

          {step === "preview" &&
            (parseErrors.length > 0 || parsedRows.length === 0) && (
              <Button
                variant="outline"
                onClick={resetState}
                className="border-border text-foreground"
              >
                Try again
              </Button>
            )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

const TX_TYPES = [
  "All",
  "Trade",
  "Staking",
  "Airdrop",
  "DeFi",
  "NFT",
  "Transfer",
];

const emptyTx: Omit<Transaction, "id"> = {
  date: new Date().toISOString().slice(0, 10),
  txType: "Trade",
  asset: "",
  assetName: "",
  exchange: "",
  amount: 0,
  priceUSD: 0,
  costBasisUSD: 0,
  gainLossUSD: 0,
  isShortTerm: true,
  isFlagged: false,
  flagReason: "",
  tags: [],
  notes: "",
};

export function Transactions() {
  const { data: transactions, isLoading } = useTransactions();
  const addMutation = useAddTransaction();
  const updateMutation = useUpdateTransaction();
  const deleteMutation = useDeleteTransaction();

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState("All");
  const [showFlagged, setShowFlagged] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [editingTx, setEditingTx] = useState<Transaction | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [formData, setFormData] = useState<Omit<Transaction, "id">>(emptyTx);

  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 10;
  const [csvImportOpen, setCsvImportOpen] = useState(false);

  // Filter transactions
  const filtered = (transactions ?? []).filter((tx) => {
    const matchSearch =
      !search ||
      tx.asset.toLowerCase().includes(search.toLowerCase()) ||
      tx.assetName.toLowerCase().includes(search.toLowerCase()) ||
      tx.exchange.toLowerCase().includes(search.toLowerCase());
    const matchType = typeFilter === "All" || tx.txType === typeFilter;
    const matchFlagged = !showFlagged || tx.isFlagged;
    return matchSearch && matchType && matchFlagged;
  });

  const totalPages = Math.ceil(filtered.length / pageSize);
  const paginated = filtered.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize,
  );

  function toggleSelect(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function selectAll() {
    if (selected.size === paginated.length) {
      setSelected(new Set());
    } else {
      setSelected(new Set(paginated.map((t) => t.id.toString())));
    }
  }

  async function handleSave() {
    try {
      if (isAdding) {
        const newId = BigInt(Date.now());
        await addMutation.mutateAsync({ ...formData, id: newId });
        toast.success("Transaction added");
      } else if (editingTx) {
        await updateMutation.mutateAsync({ ...formData, id: editingTx.id });
        toast.success("Transaction updated");
      }
      setIsAdding(false);
      setEditingTx(null);
    } catch {
      toast.error("Failed to save transaction");
    }
  }

  async function handleDelete(id: bigint) {
    try {
      await deleteMutation.mutateAsync(id);
      toast.success("Transaction deleted");
    } catch {
      toast.error("Failed to delete transaction");
    }
  }

  async function handleBulkDelete() {
    try {
      await Promise.all(
        Array.from(selected).map((id) =>
          deleteMutation.mutateAsync(BigInt(id)),
        ),
      );
      setSelected(new Set());
      toast.success(`Deleted ${selected.size} transactions`);
    } catch {
      toast.error("Failed to delete transactions");
    }
  }

  function openEdit(tx: Transaction) {
    setEditingTx(tx);
    setFormData({ ...tx });
    setIsAdding(false);
  }

  function openAdd() {
    setIsAdding(true);
    setEditingTx(null);
    setFormData(emptyTx);
  }

  const dialogOpen = isAdding || editingTx !== null;

  return (
    <TooltipProvider>
      <div className="p-6 space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold font-display text-foreground">
              Transactions
            </h1>
            <p className="text-sm text-muted-foreground mt-0.5">
              {filtered.length} transactions found
            </p>
          </div>
          <div className="flex items-center gap-2">
            <Button
              data-ocid="transactions.import_csv.button"
              variant="outline"
              onClick={() => setCsvImportOpen(true)}
              className="border-border text-foreground hover:bg-secondary"
            >
              <Upload className="w-4 h-4 mr-2" />
              Import CSV
            </Button>
            <Button
              data-ocid="transactions.add_button"
              onClick={openAdd}
              className="bg-primary text-primary-foreground hover:bg-primary/90"
            >
              <Plus className="w-4 h-4 mr-2" />
              Add Transaction
            </Button>
          </div>
        </div>

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-48 max-w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
            <Input
              data-ocid="transactions.search_input"
              placeholder="Search asset, exchange..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setCurrentPage(1);
              }}
              className="pl-9 bg-card border-border text-foreground placeholder:text-muted-foreground"
            />
          </div>
          <Select
            value={typeFilter}
            onValueChange={(v) => {
              setTypeFilter(v);
              setCurrentPage(1);
            }}
          >
            <SelectTrigger
              data-ocid="transactions.type_filter.select"
              className="w-36 bg-card border-border text-foreground"
            >
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {TX_TYPES.map((t) => (
                <SelectItem key={t} value={t}>
                  {t}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <label
            htmlFor="flagged-filter"
            className="flex items-center gap-2 text-sm text-muted-foreground cursor-pointer"
          >
            <Checkbox
              id="flagged-filter"
              checked={showFlagged}
              onCheckedChange={(v) => {
                setShowFlagged(!!v);
                setCurrentPage(1);
              }}
              className="border-border"
            />
            Flagged only
          </label>

          {selected.size > 0 && (
            <div className="flex items-center gap-2 ml-auto">
              <span className="text-xs text-muted-foreground">
                {selected.size} selected
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => toast.info("Bulk tag — coming soon")}
                className="border-border text-foreground"
              >
                <Tag className="w-3.5 h-3.5 mr-1" />
                Tag
              </Button>
              <Button
                variant="destructive"
                size="sm"
                onClick={handleBulkDelete}
              >
                <Trash2 className="w-3.5 h-3.5 mr-1" />
                Delete
              </Button>
            </div>
          )}
        </div>

        {/* Table */}
        <div
          data-ocid="transactions.table"
          className="rounded-lg border border-border bg-card overflow-hidden"
        >
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow className="border-border hover:bg-transparent">
                  <TableHead className="w-10 py-3">
                    <Checkbox
                      checked={
                        selected.size === paginated.length &&
                        paginated.length > 0
                      }
                      onCheckedChange={selectAll}
                      className="border-border"
                    />
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3">
                    Date
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3">
                    Type
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3">
                    Asset
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3">
                    Exchange
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3 text-right">
                    Amount
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3 text-right">
                    Price
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3 text-right">
                    Gain/Loss
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3">
                    Tags
                  </TableHead>
                  <TableHead className="text-xs text-muted-foreground py-3 text-center">
                    Status
                  </TableHead>
                  <TableHead className="w-20 py-3" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading
                  ? (["a", "b", "c", "d", "e", "f", "g", "h"] as const).map(
                      (k) => (
                        <TableRow
                          key={`tx-skeleton-${k}`}
                          className="border-border"
                        >
                          {(
                            [
                              "1",
                              "2",
                              "3",
                              "4",
                              "5",
                              "6",
                              "7",
                              "8",
                              "9",
                              "10",
                              "11",
                            ] as const
                          ).map((j) => (
                            <TableCell key={`cell-${j}`}>
                              <Skeleton className="h-4 w-full" />
                            </TableCell>
                          ))}
                        </TableRow>
                      ),
                    )
                  : paginated.map((tx, idx) => (
                      <TableRow
                        key={tx.id.toString()}
                        data-ocid={`transactions.row.item.${idx + 1}`}
                        className={cn(
                          "border-border table-row-hover cursor-pointer",
                          selected.has(tx.id.toString()) && "bg-primary/5",
                        )}
                        onClick={() => openEdit(tx)}
                      >
                        <TableCell
                          className="py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <Checkbox
                            checked={selected.has(tx.id.toString())}
                            onCheckedChange={() =>
                              toggleSelect(tx.id.toString())
                            }
                            className="border-border"
                          />
                        </TableCell>
                        <TableCell className="py-3 text-xs mono text-muted-foreground">
                          {formatDate(tx.date)}
                        </TableCell>
                        <TableCell className="py-3">
                          <TxTypeBadge type={tx.txType} />
                        </TableCell>
                        <TableCell className="py-3">
                          <span className="text-sm font-semibold text-foreground">
                            {tx.asset}
                          </span>
                          <p className="text-xs text-muted-foreground leading-tight">
                            {tx.assetName}
                          </p>
                        </TableCell>
                        <TableCell className="py-3 text-xs text-muted-foreground">
                          {tx.exchange}
                        </TableCell>
                        <TableCell className="py-3 text-right text-xs mono text-foreground">
                          {formatNumber(tx.amount, 4)}
                        </TableCell>
                        <TableCell className="py-3 text-right text-xs mono text-foreground">
                          {formatCurrency(tx.priceUSD)}
                        </TableCell>
                        <TableCell
                          className={cn(
                            "py-3 text-right text-xs font-medium mono",
                            gainLossClass(tx.gainLossUSD),
                          )}
                        >
                          {tx.gainLossUSD !== 0 ? (
                            `${tx.gainLossUSD >= 0 ? "+" : ""}${formatCurrency(tx.gainLossUSD)}`
                          ) : (
                            <span className="text-muted-foreground">—</span>
                          )}
                        </TableCell>
                        <TableCell className="py-3">
                          <div className="flex flex-wrap gap-1">
                            {tx.tags.slice(0, 2).map((tag) => (
                              <Badge
                                key={tag}
                                variant="secondary"
                                className="text-xs px-1.5 py-0 bg-secondary/50 text-muted-foreground"
                              >
                                {tag}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="py-3 text-center">
                          {tx.isFlagged ? (
                            <Tooltip>
                              <TooltipTrigger>
                                <AlertTriangle className="w-4 h-4 text-yellow-500 mx-auto" />
                              </TooltipTrigger>
                              <TooltipContent>
                                <p className="text-xs">
                                  {tx.flagReason || "Flagged for review"}
                                </p>
                              </TooltipContent>
                            </Tooltip>
                          ) : (
                            <span className="w-4 h-4 block" />
                          )}
                        </TableCell>
                        <TableCell
                          className="py-3"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <div className="flex items-center gap-1">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-secondary"
                              onClick={() => openEdit(tx)}
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 hover:bg-destructive/20 hover:text-destructive"
                              onClick={() => handleDelete(tx.id)}
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
              </TableBody>
            </Table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-border">
              <span className="text-xs text-muted-foreground">
                Page {currentPage} of {totalPages}
              </span>
              <div className="flex gap-2">
                <Button
                  data-ocid="transactions.pagination_prev"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === 1}
                  onClick={() => setCurrentPage((p) => p - 1)}
                  className="border-border text-foreground"
                >
                  Previous
                </Button>
                <Button
                  data-ocid="transactions.pagination_next"
                  variant="outline"
                  size="sm"
                  disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => p + 1)}
                  className="border-border text-foreground"
                >
                  Next
                </Button>
              </div>
            </div>
          )}
        </div>

        {/* CSV Import Dialog */}
        <CsvImportDialog open={csvImportOpen} onOpenChange={setCsvImportOpen} />

        {/* Edit / Add Dialog */}
        <Dialog
          open={dialogOpen}
          onOpenChange={(open) => {
            if (!open) {
              setIsAdding(false);
              setEditingTx(null);
            }
          }}
        >
          <DialogContent
            data-ocid="transactions.edit_modal.dialog"
            className="bg-card border-border text-foreground max-w-lg"
          >
            <DialogHeader>
              <DialogTitle className="font-display">
                {isAdding ? "Add Transaction" : "Edit Transaction"}
              </DialogTitle>
            </DialogHeader>

            <div className="grid grid-cols-2 gap-4 py-4">
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Date</Label>
                <Input
                  type="date"
                  value={formData.date}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, date: e.target.value }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Type</Label>
                <Select
                  value={formData.txType}
                  onValueChange={(v) =>
                    setFormData((p) => ({ ...p, txType: v }))
                  }
                >
                  <SelectTrigger className="bg-secondary border-border text-foreground">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TX_TYPES.filter((t) => t !== "All").map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Asset Symbol
                </Label>
                <Input
                  value={formData.asset}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      asset: e.target.value.toUpperCase(),
                    }))
                  }
                  placeholder="BTC"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Asset Name
                </Label>
                <Input
                  value={formData.assetName}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, assetName: e.target.value }))
                  }
                  placeholder="Bitcoin"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Exchange/Wallet
                </Label>
                <Input
                  value={formData.exchange}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, exchange: e.target.value }))
                  }
                  placeholder="Coinbase"
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Amount</Label>
                <Input
                  type="number"
                  value={formData.amount}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      amount: Number(e.target.value),
                    }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Price (USD)
                </Label>
                <Input
                  type="number"
                  value={formData.priceUSD}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      priceUSD: Number(e.target.value),
                    }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">
                  Cost Basis (USD)
                </Label>
                <Input
                  type="number"
                  value={formData.costBasisUSD}
                  onChange={(e) =>
                    setFormData((p) => ({
                      ...p,
                      costBasisUSD: Number(e.target.value),
                    }))
                  }
                  className="bg-secondary border-border text-foreground"
                />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-xs text-muted-foreground">Notes</Label>
                <Input
                  value={formData.notes}
                  onChange={(e) =>
                    setFormData((p) => ({ ...p, notes: e.target.value }))
                  }
                  placeholder="Optional notes..."
                  className="bg-secondary border-border text-foreground"
                />
              </div>
            </div>

            <DialogFooter>
              <Button
                data-ocid="transactions.edit_modal.cancel_button"
                variant="outline"
                onClick={() => {
                  setIsAdding(false);
                  setEditingTx(null);
                }}
                className="border-border text-foreground"
              >
                Cancel
              </Button>
              <Button
                data-ocid="transactions.edit_modal.save_button"
                onClick={handleSave}
                disabled={addMutation.isPending || updateMutation.isPending}
                className="bg-primary text-primary-foreground hover:bg-primary/90"
              >
                {addMutation.isPending || updateMutation.isPending
                  ? "Saving..."
                  : "Save"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </TooltipProvider>
  );
}
