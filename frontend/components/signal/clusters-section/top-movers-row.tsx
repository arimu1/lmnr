"use client";

import { useSearchParams } from "next/navigation";
import { useEffect } from "react";
import { shallow } from "zustand/shallow";

import { useSignalStoreContext } from "@/components/signal/store.tsx";
import { useProjectContext } from "@/contexts/project-context";
import { getHasClusteringAccess } from "@/lib/features/clustering";

import TopMovers from "./top-movers";
import { useNavigateToCluster } from "./use-navigate-to-cluster";

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

  // Always fetch when a time range is present; abort superseded requests.
  useEffect(() => {
    const controller = new AbortController();
    fetchTopMovers({ pastHours, startDate, endDate, abortSignal: controller.signal });
    return () => controller.abort();
  }, [fetchTopMovers, pastHours, startDate, endDate]);

  return (
    <div className="h-[120px] w-full">
      <TopMovers
        movers={topMovers}
        rawClusters={rawClusters}
        isLoading={isTopMoversLoading}
        isPaywall={isPaywall}
        onNavigateToCluster={navigateToCluster}
      />
    </div>
  );
}
