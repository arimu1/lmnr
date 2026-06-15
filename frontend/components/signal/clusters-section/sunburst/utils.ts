import { UNCLUSTERED_ID } from "@/lib/actions/clusters";
import { getClusterColorById, UNCLUSTERED_COLOR, withOpacity } from "@/lib/clusters/colors";

import { type ClusterNode } from "../utils";

// recharts v2 doesn't re-export SunburstData from its root; mirror its shape.
export interface SunburstData {
  name: string;
  value?: number;
  fill?: string;
  children?: SunburstData[];
  clusterId?: string;
}

// recharts sums children, so only leaves carry `value` to avoid double-counting.
function nodeToSunburst(node: ClusterNode, counts: Map<string, number>, hasTimeRange: boolean): SunburstData {
  const fill = withOpacity(getClusterColorById(node.id), 0.8);
  if (node.children.length === 0) {
    const value = hasTimeRange ? (counts.get(node.id) ?? 0) : node.numEvents;
    return { name: node.name, value, fill, clusterId: node.id };
  }
  return {
    name: node.name,
    fill,
    clusterId: node.id,
    children: node.children.map((c) => nodeToSunburst(c, counts, hasTimeRange)),
  };
}

export function buildSunburstData(
  tree: ClusterNode[],
  counts: Map<string, number>,
  hasTimeRange: boolean,
  unclusteredCount: number
): SunburstData {
  const children = tree.map((n) => nodeToSunburst(n, counts, hasTimeRange));
  if (unclusteredCount > 0) {
    children.push({
      name: "Unclustered Events",
      value: unclusteredCount,
      fill: withOpacity(UNCLUSTERED_COLOR, 0.8),
      clusterId: UNCLUSTERED_ID,
    });
  }
  return { name: "Clusters", fill: "transparent", children };
}

export function sunburstHasData(root: SunburstData): boolean {
  return !!root.children && root.children.length > 0;
}
