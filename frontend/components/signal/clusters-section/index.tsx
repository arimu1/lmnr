"use client";

import { Circle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect } from "react";

import { useClusterId } from "@/components/signal/hooks/use-cluster-id";
import { useEmergingClusterId } from "@/components/signal/hooks/use-emerging-cluster-id";
import { getCurrentNode, getIsLeaf, useSignalStoreContext } from "@/components/signal/store.tsx";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProjectContext } from "@/contexts/project-context";
import { UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getHasClusteringAccess } from "@/lib/features/clustering";
import { track } from "@/lib/posthog";

import ControlPanel from "./control-panel";
import { ClustersViewProvider, useClustersViewStore } from "./control-panel/store";

function ClustersDashboard({
  isPaywall,
  onNavigateToCluster,
}: {
  isPaywall: boolean;
  onNavigateToCluster: (id: string) => void;
}) {
  const showTopMovers = useClustersViewStore((s) => s.showTopMovers);

  return (
    <div className="relative flex flex-col gap-2 w-full">
      {showTopMovers && (
        <div className="flex flex-row border rounded-lg overflow-hidden h-[120px] w-full bg-secondary items-center justify-center text-muted-foreground text-sm">
          Top movers
        </div>
      )}
      <div className="flex flex-row border rounded-lg overflow-hidden h-[260px] w-full bg-secondary">
        <div className="flex-1 flex items-center justify-center text-muted-foreground text-sm border-r">Sunburst</div>
        <div className="w-[320px] shrink-0 flex items-center justify-center text-muted-foreground text-sm">
          Recent clusters
        </div>
      </div>
      <ControlPanel />
    </div>
  );
}

export default function ClustersSection() {
  const { workspace } = useProjectContext();
  const isPaywall = !getHasClusteringAccess(workspace?.tierName);
  const billingHref = workspace ? `/workspace/${workspace.id}?tab=billing` : "/";
  const searchParams = useSearchParams();
  const [clusterId, setClusterId] = useClusterId();
  const [, setEmergingClusterId] = useEmergingClusterId();

  // For leaf nodes, stay at the parent's navigation level.
  const isLeaf = useSignalStoreContext((state) => getIsLeaf(state, clusterId));
  const currentNode = useSignalStoreContext((state) => getCurrentNode(state, clusterId));
  const displayId = isLeaf ? (currentNode?.parentId ?? null) : clusterId;

  const isClustersLoading = useSignalStoreContext((state) => state.isClustersLoading);
  const fetchClusters = useSignalStoreContext((state) => state.fetchClusters);

  const pastHours = searchParams.get("pastHours");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  useEffect(() => {
    if (!pastHours && !(startDate && endDate)) return;
    fetchClusters({ pastHours, startDate, endDate });
  }, [fetchClusters, pastHours, startDate, endDate]);

  // No-op when paywalled — drilling is a Pro feature.
  const navigateToCluster = useCallback(
    (id: string) => {
      if (isPaywall) return;
      track("signals", "cluster_clicked", { clusterId: id === UNCLUSTERED_ID ? "-" : id });
      // Picking anything in the cluster tree exits the emerging-cluster view.
      setEmergingClusterId(null);
      if (id === clusterId && isLeaf) {
        setClusterId(displayId);
      } else {
        setClusterId(id);
      }
    },
    [isPaywall, setClusterId, setEmergingClusterId, clusterId, isLeaf, displayId]
  );

  if (isClustersLoading) {
    return (
      <div className="flex flex-col gap-2 w-full">
        <div className="border rounded-lg overflow-hidden h-[260px] w-full bg-secondary flex items-center justify-center">
          <div className="flex items-center gap-2 text-muted-foreground text-sm shimmer duration-[2s]">
            <Circle className="size-4 shrink-0 fill-muted stroke-none animate-pulse" />
            Loading clusters
          </div>
        </div>
      </div>
    );
  }

  return (
    <TooltipProvider delayDuration={200}>
      <ClustersViewProvider>
        <div className="relative w-full">
          <ClustersDashboard isPaywall={isPaywall} onNavigateToCluster={navigateToCluster} />
          {isPaywall && (
            <div className="absolute bottom-3 left-3 flex items-center gap-2 px-3 py-2 rounded-md border bg-background">
              <span className="text-xs text-muted-foreground flex-1 min-w-0">
                Event clusters for high-level insights
              </span>
              <Link href={billingHref}>
                <Button size="sm">Upgrade to Pro</Button>
              </Link>
            </div>
          )}
        </div>
      </ClustersViewProvider>
    </TooltipProvider>
  );
}
