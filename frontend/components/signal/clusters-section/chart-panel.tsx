"use client";

import { useMemo, useState } from "react";

import { Button } from "@/components/ui/button";
import { type ClusterStatsDataPoint } from "@/lib/actions/clusters";
import { cn } from "@/lib/utils";

import ClusterStackedChart from "./cluster-stacked-chart";
import Sunburst from "./sunburst";
import { buildSunburstData } from "./sunburst/utils";
import { type ClusterNode } from "./utils";

type ChartType = "frequency" | "pie";

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
  // View preference — not persisted to URL (URL is reserved for cluster/time state).
  const [chartType, setChartType] = useState<ChartType>("frequency");

  const sunburstData = useMemo(
    () =>
      buildSunburstData(fullTree, allClusterCounts, hasTimeRange, selectedClusterId, descendantIds, unclusteredCount),
    [fullTree, allClusterCounts, hasTimeRange, selectedClusterId, descendantIds, unclusteredCount]
  );

  return (
    <div className="relative flex h-full flex-col">
      <div className="absolute right-1 top-1 z-10 flex rounded-md border bg-background p-0.5">
        {(["frequency", "pie"] as const).map((type) => (
          <Button
            key={type}
            size="sm"
            variant="ghost"
            className={cn(
              "h-6 px-2 text-xs capitalize",
              chartType === type ? "bg-secondary text-foreground" : "text-muted-foreground"
            )}
            onClick={() => setChartType(type)}
          >
            {type}
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
