"use client";

import { ArrowRight, TrendingDown, TrendingUp } from "lucide-react";

import ClusterIcon, { type IconVariant } from "@/components/signal/clusters-section/cluster-list/cluster-icon";
import { getCurrentNode, useSignalStoreContext } from "@/components/signal/store.tsx";
import SignalSparkline from "@/components/signals/signal-sparkline";
import { type ClusterTopMover, UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getClusterColorById, UNCLUSTERED_COLOR } from "@/lib/clusters/colors";
import { cn } from "@/lib/utils";

// SPEC: frequency increase is bad → red; decrease → green.
const RED_STROKE = "hsl(var(--destructive))";
const GREEN_STROKE = "hsl(var(--success))";

// New clusters (prev=0) have no finite % — surface a "NEW" label instead.
function formatPct(mover: ClusterTopMover): string {
  if (mover.prevCount === 0) return "NEW";
  const pct = Math.round(mover.pctChange * 100);
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
  // Direction from the count delta (sign of z), not pctChange (NaN for new clusters).
  const isIncrease = mover.currCount > mover.prevCount;
  const stroke = isIncrease ? RED_STROKE : GREEN_STROKE;
  const colorClass = isIncrease ? "text-destructive" : "text-success";

  // Icon + color sourced exactly like the breadcrumb (ClusterIcon + getClusterColorById).
  const isUnclustered = mover.clusterId === UNCLUSTERED_ID;
  const node = useSignalStoreContext((s) => getCurrentNode(s, mover.clusterId));
  const iconVariant: IconVariant = isUnclustered ? "circle-dashed" : (node?.children.length ?? 0) > 0 ? "boxes" : "box";
  const iconColor = isUnclustered ? UNCLUSTERED_COLOR : getClusterColorById(mover.clusterId);

  return (
    <button
      onClick={isPaywall ? undefined : onClick}
      className={cn(
        "flex flex-col gap-1 w-[340px] shrink-0 border rounded-md p-2 bg-secondary text-left transition-colors",
        isPaywall ? "cursor-default" : "cursor-pointer hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <ClusterIcon iconVariant={iconVariant} color={iconColor} isPaywall={isPaywall} />
        <span className={cn("truncate text-sm flex-1", isPaywall && "blur-[5px] select-none")}>{name}</span>
        <span className={cn("flex items-center gap-0.5 text-xs font-medium shrink-0", colorClass)}>
          {isIncrease ? <TrendingUp className="size-3" /> : <TrendingDown className="size-3" />}
          {formatPct(mover)}
        </span>
      </div>
      <SignalSparkline data={mover.series} stroke={stroke} />
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {mover.prevCount}
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        {mover.currCount}
      </span>
    </button>
  );
}
