"use client";

import { ChartColumn, ChartPie } from "lucide-react";
import { useMemo, useState } from "react";

import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { type ClusterStatsDataPoint } from "@/lib/actions/clusters";

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
      <Tabs
        value={chartType}
        onValueChange={(v) => setChartType(v as ChartType)}
        className="absolute right-1 top-1 z-10"
      >
        <TabsList className="h-7 p-0.5">
          <TabsTrigger value="frequency" aria-label="Frequency chart" className="h-6 px-2">
            <ChartColumn className="size-3.5" />
          </TabsTrigger>
          <TabsTrigger value="pie" aria-label="Pie chart" className="h-6 px-2">
            <ChartPie className="size-3.5" />
          </TabsTrigger>
        </TabsList>
      </Tabs>
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
