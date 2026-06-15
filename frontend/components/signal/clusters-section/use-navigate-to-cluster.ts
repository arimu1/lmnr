"use client";

import { useCallback } from "react";

import { useClusterId } from "@/components/signal/hooks/use-cluster-id";
import { useEmergingClusterId } from "@/components/signal/hooks/use-emerging-cluster-id";
import { getCurrentNode, getIsLeaf, useSignalStoreContext } from "@/components/signal/store.tsx";
import { useProjectContext } from "@/contexts/project-context";
import { UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getHasClusteringAccess } from "@/lib/features/clustering";
import { track } from "@/lib/posthog";

// Shared cluster-selection callback used by the cluster list, chart wedges, and
// top-movers. No-op when paywalled — drilling is a Pro feature.
export function useNavigateToCluster() {
  const { workspace } = useProjectContext();
  const isPaywall = !getHasClusteringAccess(workspace?.tierName);
  const [clusterId, setClusterId] = useClusterId();
  const [, setEmergingClusterId] = useEmergingClusterId();

  const isLeaf = useSignalStoreContext((state) => getIsLeaf(state, clusterId));
  const currentNode = useSignalStoreContext((state) => getCurrentNode(state, clusterId));
  const displayId = isLeaf ? (currentNode?.parentId ?? null) : clusterId;

  return useCallback(
    (id: string) => {
      if (isPaywall) return;
      track("signals", "cluster_clicked", { clusterId: id === UNCLUSTERED_ID ? "-" : id });
      // Picking anything in the cluster tree exits the emerging-cluster view —
      // otherwise the events fetcher would keep filtering to the L0 cluster
      // (it prioritizes emergingClusterId over clusterId/unclustered).
      setEmergingClusterId(null);
      // Toggle off if clicking the already-selected leaf/unclustered — go back to parent.
      if (id === clusterId && isLeaf) {
        setClusterId(displayId);
      } else {
        setClusterId(id);
      }
    },
    [isPaywall, setClusterId, setEmergingClusterId, clusterId, isLeaf, displayId]
  );
}
