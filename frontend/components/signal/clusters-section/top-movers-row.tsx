"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";

import { useSignalStoreContext } from "@/components/signal/store.tsx";
import { useProjectContext } from "@/contexts/project-context";
import { getHasClusteringAccess } from "@/lib/features/clustering";

import TopMovers from "./top-movers";
import { useNavigateToCluster } from "./use-navigate-to-cluster";

// Resolve the comparison-window duration in whole hours, mirroring
// getClusterTopMovers (Math.max(1, Math.round(...))), then format as Nd/Nh.
function formatComparisonWindow(
  pastHours: string | null,
  startDate: string | null,
  endDate: string | null
): string | null {
  let hoursRaw: number | null = null;
  if (pastHours && !isNaN(parseFloat(pastHours))) hoursRaw = parseInt(pastHours);
  else if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (!isNaN(ms) && ms > 0) hoursRaw = ms / (1000 * 60 * 60);
  }
  if (hoursRaw === null) return null;
  const hours = Math.max(1, Math.round(hoursRaw));
  return hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;
}

export default function TopMoversRow() {
  const { workspace } = useProjectContext();
  const isPaywall = !getHasClusteringAccess(workspace?.tierName);
  const searchParams = useSearchParams();
  const navigateToCluster = useNavigateToCluster();

  const topMovers = useSignalStoreContext((s) => s.topMovers, shallow);
  const isTopMoversLoading = useSignalStoreContext((s) => s.isTopMoversLoading);
  const rawClusters = useSignalStoreContext((s) => s.rawClusters);
  const fetchTopMovers = useSignalStoreContext((s) => s.fetchTopMovers);

  const pastHours = searchParams.get("pastHours");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const comparisonWindow = formatComparisonWindow(pastHours, startDate, endDate);

  // Always fetch when a time range is present; abort superseded requests.
  useEffect(() => {
    const controller = new AbortController();
    fetchTopMovers({ pastHours, startDate, endDate, abortSignal: controller.signal });
    return () => controller.abort();
  }, [fetchTopMovers, pastHours, startDate, endDate]);

  return (
    <div className="flex flex-col w-full">
      <h3 className="px-2 pt-2 text-xs font-medium text-muted-foreground">
        {comparisonWindow ? `Top movers (vs previous ${comparisonWindow})` : "Top movers"}
      </h3>
      <div className="h-[120px] w-full">
        <TopMovers
          movers={topMovers}
          rawClusters={rawClusters}
          isLoading={isTopMoversLoading}
          isPaywall={isPaywall}
          onNavigateToCluster={navigateToCluster}
        />
      </div>
    </div>
  );
}
