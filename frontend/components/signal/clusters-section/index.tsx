"use client";

import { Circle } from "lucide-react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallow } from "zustand/shallow";

import { useTimeSeriesStatsUrl } from "@/components/charts/time-series-chart/use-time-series-stats-url";
import { useClusterId } from "@/components/signal/hooks/use-cluster-id";
import { useEmergingClusterId } from "@/components/signal/hooks/use-emerging-cluster-id";
import {
  getCurrentNode,
  getIsLeaf,
  selectAllClusterCounts,
  selectFlatClusters,
  selectTree,
  selectUnclusteredCount,
  useSignalStoreContext,
} from "@/components/signal/store.tsx";
import { Button } from "@/components/ui/button";
import { TooltipProvider } from "@/components/ui/tooltip";
import { useProjectContext } from "@/contexts/project-context";
import { UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getHasClusteringAccess } from "@/lib/features/clustering";
import { track } from "@/lib/posthog";

import ActivityMonitor from "./activity-monitor";
import ControlPanel from "./control-panel";
import { ClustersViewProvider, useClustersViewStore } from "./control-panel/store";
import Sunburst from "./sunburst";
import { buildSunburstData } from "./sunburst/utils";
import TopMovers from "./top-movers";

interface TimeRange {
  pastHours: string | null;
  startDate: string | null;
  endDate: string | null;
}

function ClustersDashboard({
  isPaywall,
  onNavigateToCluster,
  timeRange,
}: {
  isPaywall: boolean;
  onNavigateToCluster: (id: string) => void;
  timeRange: TimeRange;
}) {
  const { pastHours, startDate, endDate } = timeRange;
  const hasTimeRange = !!(pastHours || (startDate && endDate));
  const showTopMovers = useClustersViewStore((s) => s.showTopMovers);

  const tree = useSignalStoreContext(selectTree, shallow);
  const flatClusters = useSignalStoreContext(selectFlatClusters, shallow);
  const counts = useSignalStoreContext(selectAllClusterCounts, shallow);
  const unclusteredCount = useSignalStoreContext(selectUnclusteredCount);
  const signal = useSignalStoreContext((s) => s.signal);
  const rawClusters = useSignalStoreContext((s) => s.rawClusters);
  const fetchClusterStats = useSignalStoreContext((s) => s.fetchClusterStats);
  const topMovers = useSignalStoreContext((s) => s.topMovers, shallow);
  const isTopMoversLoading = useSignalStoreContext((s) => s.isTopMoversLoading);
  const fetchTopMovers = useSignalStoreContext((s) => s.fetchTopMovers);

  // Measure for the stats interval; sunburst sizes itself off its own panel.
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState<number | null>(null);
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) setWidth(entry.contentRect.width);
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  const statsUrl = useTimeSeriesStatsUrl({
    baseUrl: `/api/projects/${signal.projectId}/signals/${signal.id}/events/clusters/stats`,
    chartContainerWidth: width,
    pastHours,
    startDate,
    endDate,
  });

  useEffect(() => {
    const controller = new AbortController();
    fetchClusterStats({ statsUrl, abortSignal: controller.signal });
    return () => controller.abort();
  }, [statsUrl, fetchClusterStats, rawClusters]);

  // Top movers: only fetch when the toggle is on; abort superseded requests.
  useEffect(() => {
    if (!showTopMovers) return;
    const controller = new AbortController();
    fetchTopMovers({ pastHours, startDate, endDate, abortSignal: controller.signal });
    return () => controller.abort();
  }, [showTopMovers, fetchTopMovers, pastHours, startDate, endDate]);

  const sunburstData = useMemo(
    () => buildSunburstData(tree, counts, hasTimeRange, unclusteredCount),
    [tree, counts, hasTimeRange, unclusteredCount]
  );

  return (
    <div ref={containerRef} className="relative flex flex-col gap-2 w-full">
      {showTopMovers && (
        <div className="h-[120px] w-full">
          <TopMovers
            movers={topMovers}
            rawClusters={rawClusters}
            isLoading={isTopMoversLoading}
            isPaywall={isPaywall}
            onNavigateToCluster={onNavigateToCluster}
          />
        </div>
      )}
      <div className="flex flex-row border rounded-lg overflow-hidden h-[260px] w-full bg-secondary">
        <div className="flex-1 min-w-0 border-r p-2">
          <Sunburst data={sunburstData} isPaywall={isPaywall} onNavigateToCluster={onNavigateToCluster} />
        </div>
        <div className="w-[320px] shrink-0">
          <ActivityMonitor clusters={flatClusters} isPaywall={isPaywall} onNavigateToCluster={onNavigateToCluster} />
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
          <ClustersDashboard
            isPaywall={isPaywall}
            onNavigateToCluster={navigateToCluster}
            timeRange={{ pastHours, startDate, endDate }}
          />
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
