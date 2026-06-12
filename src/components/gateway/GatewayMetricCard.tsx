import type { LucideIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatGatewayNumber } from "@/components/gateway/format";

interface GatewayMetricCardProps {
  title: string;
  value?: number;
  icon: LucideIcon;
  tone: "cyan" | "emerald" | "amber" | "rose";
  detail?: string;
  loading?: boolean;
}

const toneClass: Record<GatewayMetricCardProps["tone"], string> = {
  cyan: "border-cyan-500/25 bg-cyan-500/10 text-cyan-500 dark:text-cyan-300",
  emerald:
    "border-emerald-500/25 bg-emerald-500/10 text-emerald-500 dark:text-emerald-300",
  amber:
    "border-amber-500/25 bg-amber-500/10 text-amber-500 dark:text-amber-300",
  rose: "border-rose-500/25 bg-rose-500/10 text-rose-500 dark:text-rose-300",
};

export function GatewayMetricCard({
  title,
  value,
  icon: Icon,
  tone,
  detail,
  loading,
}: GatewayMetricCardProps) {
  return (
    <div className="min-h-[118px] rounded-lg border border-border-default bg-card/95 p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">{title}</p>
          {loading ? (
            <div className="mt-3 h-8 w-28 animate-pulse rounded bg-muted" />
          ) : (
            <p className="mt-2 truncate text-2xl font-semibold tabular-nums text-foreground">
              {formatGatewayNumber(value)}
            </p>
          )}
        </div>
        <div className={cn("rounded-md border p-2", toneClass[tone])}>
          <Icon className="h-4 w-4" />
        </div>
      </div>
      {detail && <p className="mt-3 text-xs text-muted-foreground">{detail}</p>}
    </div>
  );
}
