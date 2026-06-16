"use client";

import { ArrowDownRight, ArrowRight, ArrowUpRight } from "lucide-react";

import ClusterIcon, { type IconVariant } from "@/components/signal/clusters-section/cluster-list/cluster-icon";
import { getCurrentNode, useSignalStoreContext } from "@/components/signal/store.tsx";
import SignalSparkline from "@/components/signals/signal-sparkline";
import { type ClusterTopMover, UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getClusterColorById, UNCLUSTERED_COLOR } from "@/lib/clusters/colors";
import { cn } from "@/lib/utils";

// SPEC: frequency increase is bad → red; decrease → green.
const RED_STROKE = "hsl(var(--destructive-bright))";
const GREEN_STROKE = "hsl(var(--success-bright))";

// New clusters (prev=0) have no finite % — surface a "NEW" label instead.
// Sign is dropped (Math.abs) since the trend arrow already shows direction.
function formatPct(mover: ClusterTopMover): string {
  if (mover.prevCount === 0) return "NEW";
  const pct = Math.abs(Math.round(mover.pctChange * 100));
  return `${pct}%`;
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

  // Icon + color sourced exactly like the breadcrumb (ClusterIcon + getClusterColorById).
  const isUnclustered = mover.clusterId === UNCLUSTERED_ID;
  const node = useSignalStoreContext((s) => getCurrentNode(s, mover.clusterId));
  const iconVariant: IconVariant = isUnclustered ? "circle-dashed" : (node?.children.length ?? 0) > 0 ? "boxes" : "box";
  const iconColor = isUnclustered ? UNCLUSTERED_COLOR : getClusterColorById(mover.clusterId);

  return (
    <button
      onClick={isPaywall ? undefined : onClick}
      className={cn(
        "flex flex-col gap-1 h-full w-[340px] shrink-0 border rounded-md p-2 bg-secondary text-left transition-colors",
        isPaywall ? "cursor-default" : "cursor-pointer hover:bg-muted"
      )}
    >
      <div className="flex items-center gap-1.5 min-w-0">
        <ClusterIcon iconVariant={iconVariant} color={iconColor} isPaywall={isPaywall} />
        <span className={cn("truncate text-sm flex-1", isPaywall && "blur-[5px] select-none")}>{name}</span>
        <span
          className={cn(
            "flex items-center gap-0.5 text-sm font-medium shrink-0",
            isIncrease ? "text-destructive-bright" : "text-success-bright"
          )}
        >
          {isIncrease ? <ArrowUpRight className="size-4" /> : <ArrowDownRight className="size-4" />}
          {formatPct(mover)}
        </span>
      </div>
      <div className="min-h-0 flex-1 w-full">
        <SignalSparkline data={mover.series} stroke={stroke} />
      </div>
      <span className="inline-flex items-center gap-1 text-xs text-muted-foreground shrink-0">
        {mover.prevCount}
        {` events`}
        <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground" />
        {mover.currCount}
        {` events`}
      </span>
    </button>
  );
}
