"use client";

import { useMemo } from "react";

import ClusterListEmptyState from "../cluster-list/empty-state";
import { type ClusterNode } from "../utils";
import ActivityItem from "./activity-item";

export default function ActivityMonitor({
  clusters,
  selectedClusterId,
  isPaywall,
  onNavigateToCluster,
}: {
  clusters: ClusterNode[];
  selectedClusterId: string | null;
  isPaywall: boolean;
  onNavigateToCluster: (id: string) => void;
}) {
  // Newest clusters first — an "activity monitor" of fresh developments.
  const ordered = useMemo(
    () =>
      [...clusters]
        .filter((c) => c.level !== 0)
        .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()),
    [clusters]
  );

  return (
    <div className="flex flex-col h-full min-w-0">
      <div className="px-3 pt-2 pb-1 text-xs font-medium text-muted-foreground shrink-0">Recent clusters</div>
      {ordered.length === 0 ? (
        <ClusterListEmptyState title="No clusters during this period" />
      ) : (
        <div className="flex flex-col gap-0.5 px-2 pb-2 overflow-y-auto overflow-x-hidden min-w-0">
          {ordered.map((cluster) => (
            <ActivityItem
              key={cluster.id}
              cluster={cluster}
              isSelected={selectedClusterId === cluster.id}
              isPaywall={isPaywall}
              onClick={() => onNavigateToCluster(cluster.id)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
