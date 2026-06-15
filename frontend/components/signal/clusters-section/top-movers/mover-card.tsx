"use client";

import { TrendingDown, TrendingUp } from "lucide-react";

import SignalSparkline from "@/components/signals/signal-sparkline";
import { type ClusterTopMover } from "@/lib/actions/clusters";
import { cn } from "@/lib/utils";

// SPEC: frequency increase is bad → red; decrease → green.
const RED_STROKE = "hsl(var(--destructive))";
const GREEN_STROKE = "hsl(var(--success))";

function formatPct(pctChange: number): string {
  const pct = Math.round(pctChange * 100);
  return `${pct > 0 ? "+" : ""}${pct}%`;
}

export default function MoverCard({
  mover,
  name,
  isPaywall,
  onClick,
}: {
  mover: ClusterTopMover;
  name: string;
  isPaywall?: boolean;
  onClick: () => void;
}) {
  const isIncrease = mover.pctChange > 0;
  const stroke = isIncrease ? RED_STROKE : GREEN_STROKE;
  const colorClass = isIncrease ? "text-destructive" : "text-success";

  return (
    <button
      onClick={isPaywall ? undefined : onClick}
      className={cn(
        "flex flex-col gap-1 w-[180px] shrink-0 border rounded-md p-2 bg-background text-left transition-colors",
        isPaywall ? "cursor-default" : "cursor-pointer hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-1 min-w-0">
        <span className={cn("truncate text-sm flex-1", isPaywall && "blur-[5px] select-none")}>{name}</span>
        <span className={cn("flex items-center gap-0.5 text-xs font-medium shrink-0", colorClass)}>
          {isIncrease ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {formatPct(mover.pctChange)}
        </span>
      </div>
      <SignalSparkline data={mover.series} stroke={stroke} />
      <span className="text-xs text-muted-foreground shrink-0">
        {mover.prevCount} → {mover.currCount}
      </span>
    </button>
  );
}
