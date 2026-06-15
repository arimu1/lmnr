"use client";

import { useMemo } from "react";

import { formatShortRelativeTime } from "@/components/client-timestamp-formatter";
import { getClusterColorById } from "@/lib/clusters/colors";
import { cn } from "@/lib/utils";

import ClusterIcon from "../cluster-list/cluster-icon";
import { type ClusterNode } from "../utils";

export default function ActivityItem({
  cluster,
  isSelected,
  isPaywall,
  onClick,
}: {
  cluster: ClusterNode;
  isSelected: boolean;
  isPaywall?: boolean;
  onClick: () => void;
}) {
  const createdAgo = useMemo(() => {
    const d = new Date(cluster.createdAt);
    return isNaN(d.getTime()) ? null : formatShortRelativeTime(d);
  }, [cluster.createdAt]);

  return (
    <button
      onClick={isPaywall ? undefined : onClick}
      className={cn(
        "flex items-center gap-2 px-2 py-1.5 rounded text-sm text-left w-full min-w-0 transition-colors text-secondary-foreground",
        isPaywall ? "cursor-default" : "cursor-pointer hover:bg-muted",
        isSelected && "bg-sidebar-accent font-medium text-primary-foreground"
      )}
    >
      <ClusterIcon
        iconVariant={cluster.children.length > 0 ? "boxes" : "box"}
        color={getClusterColorById(cluster.id)}
        isSelected={isSelected}
        isPaywall={isPaywall}
      />
      <span className={cn("truncate flex-1", isPaywall && "blur-[5px] select-none")}>{cluster.name}</span>
      {createdAgo && <span className="text-muted-foreground text-xs shrink-0">{createdAgo}</span>}
    </button>
  );
}
