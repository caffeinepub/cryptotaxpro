import { cn } from "@/lib/utils";

const typeStyles: Record<string, string> = {
  Trade: "bg-blue-500/15 text-blue-400 border-blue-500/30",
  Staking: "bg-purple-500/15 text-purple-400 border-purple-500/30",
  Airdrop: "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  DeFi: "bg-teal-500/15 text-teal-400 border-teal-500/30",
  NFT: "bg-pink-500/15 text-pink-400 border-pink-500/30",
  Transfer: "bg-gray-500/15 text-gray-400 border-gray-500/30",
};

interface TxTypeBadgeProps {
  type: string;
  className?: string;
}

export function TxTypeBadge({ type, className }: TxTypeBadgeProps) {
  const style =
    typeStyles[type] ?? "bg-gray-500/15 text-gray-400 border-gray-500/30";
  return (
    <span
      className={cn(
        "inline-flex items-center px-2 py-0.5 rounded text-xs font-medium border",
        style,
        className,
      )}
    >
      {type}
    </span>
  );
}
