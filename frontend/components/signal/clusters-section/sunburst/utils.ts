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

// recharts reads each node's own `value` for its arc sweep (it does NOT auto-sum
// children), so every node — leaves AND internal nodes including the root — must
// carry `value` or its arc gets a NaN angle and renders invisibly.
function nodeToSunburst(node: ClusterNode, counts: Map<string, number>, hasTimeRange: boolean): SunburstData {
  const fill = withOpacity(getClusterColorById(node.id), 0.8);
  if (node.children.length === 0) {
    const value = hasTimeRange ? (counts.get(node.id) ?? 0) : node.numEvents;
    return { name: node.name, value, fill, clusterId: node.id };
  }
  const children = node.children.map((c) => nodeToSunburst(c, counts, hasTimeRange));
  const value = children.reduce((acc, c) => acc + (c.value ?? 0), 0);
  return { name: node.name, value, fill, clusterId: node.id, children };
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
  const value = children.reduce((acc, c) => acc + (c.value ?? 0), 0);
  return { name: "Clusters", value, fill: "transparent", children };
}

export function sunburstHasData(root: SunburstData): boolean {
  return !!root.children && root.children.length > 0;
}
