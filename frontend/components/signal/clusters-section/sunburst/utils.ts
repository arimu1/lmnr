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

// Selection-relative opacity for a segment. No selection → full (no dimming).
// selected → 1.0; descendant of selected → 0.65; everything else → 0.2.
function opacityFor(id: string, selectedId: string | null, descendantIds: Set<string>): number {
  if (!selectedId) return 1;
  if (id === selectedId) return 1;
  if (descendantIds.has(id)) return 0.65;
  return 0.2;
}

interface SelectionScope {
  selectedId: string | null;
  descendantIds: Set<string>;
}

// recharts reads each node's own `value` for its arc sweep (it does NOT auto-sum
// children), so every node — leaves AND internal nodes including the root — must
// carry `value` or its arc gets a NaN angle and renders invisibly.
function nodeToSunburst(
  node: ClusterNode,
  counts: Map<string, number>,
  hasTimeRange: boolean,
  scope: SelectionScope
): SunburstData {
  const opacity = opacityFor(node.id, scope.selectedId, scope.descendantIds);
  const fill = withOpacity(getClusterColorById(node.id), opacity);
  if (node.children.length === 0) {
    const value = hasTimeRange ? (counts.get(node.id) ?? 0) : node.numEvents;
    return { name: node.name, value, fill, clusterId: node.id };
  }
  const children = node.children.map((c) => nodeToSunburst(c, counts, hasTimeRange, scope));
  const value = children.reduce((acc, c) => acc + (c.value ?? 0), 0);
  return { name: node.name, value, fill, clusterId: node.id, children };
}

// Build the sunburst from the FULL cluster tree (it always renders the whole
// hierarchy); the current selection is encoded purely via per-segment opacity.
// `unclustered` is appended as a root-level virtual bucket so the pie stays
// complete. Pass `selectedId = null` to render everything at full opacity.
export function buildSunburstData(
  tree: ClusterNode[],
  counts: Map<string, number>,
  hasTimeRange: boolean,
  selectedId: string | null,
  descendantIds: Set<string>,
  unclusteredCount: number
): SunburstData {
  const scope: SelectionScope = { selectedId, descendantIds };
  const children = tree.map((n) => nodeToSunburst(n, counts, hasTimeRange, scope));
  if (unclusteredCount > 0) {
    children.push({
      name: "Unclustered Events",
      value: unclusteredCount,
      fill: withOpacity(UNCLUSTERED_COLOR, opacityFor(UNCLUSTERED_ID, selectedId, descendantIds)),
      clusterId: UNCLUSTERED_ID,
    });
  }
  const value = children.reduce((acc, c) => acc + (c.value ?? 0), 0);
  return { name: "Clusters", value, fill: "transparent", children };
}

export function sunburstHasData(root: SunburstData): boolean {
  return !!root.children && root.children.length > 0;
}
