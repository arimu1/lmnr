"use client";

import { useMemo } from "react";

import { Skeleton } from "@/components/ui/skeleton";
import { type ClusterTopMover, type EventCluster } from "@/lib/actions/clusters";

import MoverCard from "./mover-card";

export default function TopMovers({
  movers,
  rawClusters,
  isLoading,
  isPaywall,
  onNavigateToCluster,
}: {
  movers: ClusterTopMover[];
  rawClusters: EventCluster[];
  isLoading: boolean;
  isPaywall: boolean;
  onNavigateToCluster: (id: string) => void;
}) {
  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of rawClusters) map.set(c.id, c.name);
    return map;
  }, [rawClusters]);

  if (isLoading) {
    return (
      <div className="flex flex-row gap-2 overflow-hidden p-2">
        {[0, 1, 2, 3, 4].map((i) => (
          <Skeleton key={i} className="w-[180px] h-[88px] shrink-0 rounded-md" />
        ))}
      </div>
    );
  }

  if (movers.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
        No movement in this period
      </div>
    );
  }

  return (
    <div className="flex flex-row gap-2 overflow-x-auto overflow-y-hidden p-2 h-full">
      {movers.map((mover) => (
        <MoverCard
          key={mover.clusterId}
          mover={mover}
          name={nameById.get(mover.clusterId) ?? mover.clusterId}
          isPaywall={isPaywall}
          onClick={() => onNavigateToCluster(mover.clusterId)}
        />
      ))}
    </div>
  );
}
