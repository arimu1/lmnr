"use client";

import { ChartColumn, ChartPie } from "lucide-react";
import { useMemo } from "react";

import { useSignalStoreContext } from "@/components/signal/store.tsx";
import { Button } from "@/components/ui/button";
import { type ClusterStatsDataPoint } from "@/lib/actions/clusters";
import { cn } from "@/lib/utils";

import ClusterStackedChart from "./cluster-stacked-chart";
import Sunburst from "./sunburst";
import { buildSunburstData } from "./sunburst/utils";
import { type ClusterNode } from "./utils";

interface ChartPanelProps {
  chartClusters: ClusterNode[];
  // FULL tree (sunburst always renders the whole hierarchy); selection is opacity-only.
  fullTree: ClusterNode[];
  selectedClusterId: string | null;
  descendantIds: Set<string>;
  statsData: ClusterStatsDataPoint[];
  containerWidth: number | null;
  colorMap: Map<string, string>;
  isPaywall: boolean;
  allClusterCounts: Map<string, number>;
  hasTimeRange: boolean;
  drillDownDepth: number;
  unclusteredCount: number;
  onNavigateToCluster: (id: string) => void;
}

export default function ChartPanel({
  chartClusters,
  fullTree,
  selectedClusterId,
  descendantIds,
  statsData,
  containerWidth,
  colorMap,
  isPaywall,
  allClusterCounts,
  hasTimeRange,
  unclusteredCount,
  onNavigateToCluster,
}: ChartPanelProps) {
  // View preference lives in the store (not URL — reserved for cluster/time state)
  // so it survives ChartPanel remounts during the clusters loading state.
  const chartType = useSignalStoreContext((s) => s.chartType);
  const setChartType = useSignalStoreContext((s) => s.setChartType);

  const sunburstData = useMemo(
    () =>
      buildSunburstData(fullTree, allClusterCounts, hasTimeRange, selectedClusterId, descendantIds, unclusteredCount),
    [fullTree, allClusterCounts, hasTimeRange, selectedClusterId, descendantIds, unclusteredCount]
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute right-1 top-1 z-10 flex gap-0.5 rounded-md border bg-background p-0.5">
        {(
          [
            { type: "frequency", label: "Frequency chart", Icon: ChartColumn },
            { type: "pie", label: "Pie chart", Icon: ChartPie },
          ] as const
        ).map(({ type, label, Icon }) => (
          <Button
            key={type}
            size="icon"
            variant="ghost"
            aria-label={label}
            className={cn("size-8", chartType === type ? "bg-secondary text-foreground" : "text-muted-foreground")}
            onClick={() => setChartType(type)}
          >
            <Icon className="size-5" />
          </Button>
        ))}
      </div>
      {chartType === "frequency" ? (
        <ClusterStackedChart
          clusters={chartClusters}
          statsData={statsData}
          containerWidth={containerWidth}
          colorMap={colorMap}
          showTooltip={!isPaywall}
        />
      ) : (
        <Sunburst data={sunburstData} isPaywall={isPaywall} onNavigateToCluster={onNavigateToCluster} />
      )}
    </div>
  );
}
