import { z } from "zod/v4";

import { TimeRangeSchema } from "@/lib/actions/common/types";
import { executeQuery } from "@/lib/actions/sql";

export type EventCluster = {
  id: string;
  name: string;
  parentId: string | null;
  level: number;
  numChildrenClusters: number;
  numEvents: number;
  createdAt: string;
  updatedAt: string;
};

export const UNCLUSTERED_ID = "__unclustered__";

export const GetEventClustersSchema = z.object({
  ...TimeRangeSchema.shape,
  projectId: z.guid(),
  signalId: z.guid(),
});

export async function getEventClusters(
  input: z.infer<typeof GetEventClustersSchema>
): Promise<{ items: EventCluster[]; totalEventCount: number; clusteredEventCount: number }> {
  const { projectId, signalId, pastHours, startDate, endDate } = GetEventClustersSchema.parse(input);

  const { timeClause, params: timeParams } = buildTimeRangeClauses({
    timeColumn: "timestamp",
    pastHours,
    startTime: startDate,
    endTime: endDate,
  });

  const clustersQuery = `
    SELECT
      id,
      name,
      parent_id as parentId,
      level,
      num_children_clusters as numChildrenClusters,
      num_signal_events as numEvents,
      formatDateTime(created_at, '%Y-%m-%dT%H:%i:%S.%fZ') as createdAt,
      formatDateTime(updated_at, '%Y-%m-%dT%H:%i:%S.%fZ') as updatedAt
    FROM clusters
    WHERE signal_id = {signalId: UUID}
      AND level != 0
      AND id IN (
        SELECT DISTINCT cluster_id
        FROM signal_events
        ARRAY JOIN clusters AS cluster_id
        WHERE signal_id = {signalId: UUID}
          ${timeClause}
      )
    ORDER BY num_signal_events DESC, level ASC, created_at ASC
  `;

  const countQuery = `
    SELECT count() as count
    FROM signal_events
    WHERE signal_id = {signalId: UUID}
      ${timeClause}
  `;

  const unclusteredCountQuery = `
    SELECT count() as count
    FROM signal_events
    WHERE signal_id = {signalId: UUID}
      AND empty(clusters)
      ${timeClause}
  `;

  const [rows, countResult, unclusteredCountResult] = await Promise.all([
    executeQuery<{
      id: string;
      name: string;
      parentId: string | null;
      level: number;
      numChildrenClusters: number;
      numEvents: number;
      createdAt: string;
      updatedAt: string;
    }>({
      query: clustersQuery,
      parameters: { signalId, ...timeParams },
      projectId,
    }),
    executeQuery<{ count: number }>({
      query: countQuery,
      parameters: { signalId, ...timeParams },
      projectId,
    }),
    executeQuery<{ count: number }>({
      query: unclusteredCountQuery,
      parameters: { signalId, ...timeParams },
      projectId,
    }),
  ]);

  const items: EventCluster[] = rows.map((row) => ({
    id: row.id,
    name: row.name,
    parentId: row.parentId && row.parentId !== "00000000-0000-0000-0000-000000000000" ? row.parentId : null,
    level: row.level,
    numChildrenClusters: row.numChildrenClusters,
    numEvents: row.numEvents,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  }));

  const totalEventCount = Number(countResult[0]?.count ?? 0);
  const unclusteredEventCount = Number(unclusteredCountResult[0]?.count ?? 0);
  const clusteredEventCount = totalEventCount - unclusteredEventCount;

  return { items, totalEventCount, clusteredEventCount };
}

// --- Cluster event counts (time-series) ---

export interface ClusterStatsDataPoint {
  cluster_id: string;
  timestamp: string;
  count: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  count: number;
}

export const GetClusterEventCountsSchema = z.object({
  ...TimeRangeSchema.shape,
  projectId: z.guid(),
  signalId: z.guid(),
  intervalValue: z.coerce.number().default(1),
  intervalUnit: z.enum(["minute", "hour", "day"]).default("hour"),
});

interface TimeRangeClauseInput {
  timeColumn: string;
  pastHours: string | null | undefined;
  startTime: string | null | undefined;
  endTime: string | null | undefined;
  intervalValue?: number;
  intervalUnit?: "minute" | "hour" | "day";
}

interface TimeRangeClauses {
  timeClause: string;
  withFillClause: string;
  params: Record<string, unknown>;
}

const buildTimeRangeClauses = ({
  timeColumn,
  pastHours,
  startTime,
  endTime,
  intervalValue,
  intervalUnit,
}: TimeRangeClauseInput): TimeRangeClauses => {
  const timeConditions: string[] = [];
  const params: Record<string, unknown> = {};
  const withFill = intervalValue !== undefined && intervalUnit !== undefined;
  if (withFill) {
    params.intervalValue = intervalValue;
    params.intervalUnit = intervalUnit;
  }

  let fillFrom: string | null = null;
  let fillTo: string | null = null;

  if (pastHours && !isNaN(parseFloat(pastHours))) {
    timeConditions.push(`${timeColumn} >= now() - INTERVAL {pastHours: UInt32} HOUR`);
    params.pastHours = parseInt(pastHours);
    if (withFill) {
      fillFrom = `toStartOfInterval(now() - INTERVAL {pastHours:UInt32} HOUR, toInterval({intervalValue:UInt32}, {intervalUnit:String}))`;
      fillTo = `toStartOfInterval(now(), toInterval({intervalValue:UInt32}, {intervalUnit:String}))`;
    }
  } else {
    if (startTime) {
      timeConditions.push(`${timeColumn} >= {startTime: String}`);
      params.startTime = startTime.replace("Z", "");
      if (withFill) {
        fillFrom = `toStartOfInterval(toDateTime64({startTime:String}, 9), toInterval({intervalValue:UInt32}, {intervalUnit:String}))`;
      }
    }
    if (endTime) {
      timeConditions.push(`${timeColumn} <= {endTime: String}`);
      params.endTime = endTime.replace("Z", "");
      if (withFill) {
        fillTo = `toStartOfInterval(toDateTime64({endTime:String}, 9), toInterval({intervalValue:UInt32}, {intervalUnit:String}))`;
      }
    }
  }

  const timeClause = timeConditions.length > 0 ? "AND " + timeConditions.join(" AND ") : "";

  const withFillClause =
    fillFrom && fillTo
      ? `WITH FILL
    FROM ${fillFrom}
    TO ${fillTo}
    STEP toInterval({intervalValue:UInt32}, {intervalUnit:String})`
      : "";

  return { timeClause, withFillClause, params };
};

export async function getClusterEventCounts(
  input: z.infer<typeof GetClusterEventCountsSchema>
): Promise<{ items: ClusterStatsDataPoint[]; unclusteredCounts: TimeSeriesDataPoint[] }> {
  const {
    projectId,
    signalId,
    pastHours,
    startDate: startTime,
    endDate: endTime,
    intervalValue,
    intervalUnit,
  } = GetClusterEventCountsSchema.parse(input);

  const {
    timeClause,
    withFillClause,
    params: timeParams,
  } = buildTimeRangeClauses({
    timeColumn: "timestamp",
    pastHours,
    startTime,
    endTime,
    intervalValue,
    intervalUnit,
  });

  const queryParams: Record<string, unknown> = {
    signalId,
    ...timeParams,
  };

  const clusterQuery = `
    SELECT
      cluster_id,
      toStartOfInterval(timestamp, toInterval({intervalValue: UInt32}, {intervalUnit: String})) as timestamp,
      count() as count
    FROM signal_events
    ARRAY JOIN clusters AS cluster_id
    WHERE signal_id = {signalId: UUID}
      ${timeClause}
    GROUP BY cluster_id, timestamp
    ORDER BY cluster_id, timestamp ASC ${withFillClause}
  `;

  const unclusteredQuery = `
    SELECT
      toStartOfInterval(timestamp, toInterval({intervalValue: UInt32}, {intervalUnit: String})) as timestamp,
      count() as count
    FROM signal_events
    WHERE signal_id = {signalId: UUID}
      AND empty(clusters)
      ${timeClause}
    GROUP BY timestamp
    ORDER BY timestamp ASC
    ${withFillClause}
  `;

  const [clusterRows, unclusteredCounts] = await Promise.all([
    executeQuery<{ cluster_id: string; timestamp: string; count: number }>({
      query: clusterQuery,
      parameters: queryParams,
      projectId,
    }),
    executeQuery<{ timestamp: string; count: number }>({
      query: unclusteredQuery,
      parameters: queryParams,
      projectId,
    }),
  ]);

  return { items: clusterRows, unclusteredCounts };
}

// --- New L1+ cluster counts (time-series, by created_at) ---

export const GetNewClusterStatsSchema = z.object({
  ...TimeRangeSchema.shape,
  projectId: z.guid(),
  signalId: z.guid(),
  intervalValue: z.coerce.number().default(1),
  intervalUnit: z.enum(["minute", "hour", "day"]).default("hour"),
});

export async function getNewClusterStats(
  input: z.infer<typeof GetNewClusterStatsSchema>
): Promise<{ items: TimeSeriesDataPoint[] }> {
  const {
    projectId,
    signalId,
    pastHours,
    startDate: startTime,
    endDate: endTime,
    intervalValue,
    intervalUnit,
  } = GetNewClusterStatsSchema.parse(input);

  const {
    timeClause,
    withFillClause,
    params: timeParams,
  } = buildTimeRangeClauses({
    timeColumn: "created_at",
    pastHours,
    startTime,
    endTime,
    intervalValue,
    intervalUnit,
  });

  const queryParams: Record<string, unknown> = {
    signalId,
    ...timeParams,
  };

  const query = `
    SELECT
      toStartOfInterval(created_at, toInterval({intervalValue:UInt32}, {intervalUnit:String})) AS timestamp,
      count() AS count
    FROM clusters
    WHERE signal_id = {signalId: UUID}
      AND level >= 1
      ${timeClause}
    GROUP BY timestamp
    ORDER BY timestamp ASC
    ${withFillClause}
  `;

  const items = await executeQuery<TimeSeriesDataPoint>({
    query,
    parameters: queryParams,
    projectId,
  });

  return { items };
}

// --- Top movers (current vs preceding equal-duration window) ---

// Exclude clusters below this combined count so trivial low-count movers
// (0→1, 1→2) never surface even when their z-score is technically large.
const TOP_MOVERS_MIN_COMBINED_COUNT = 5;

export interface ClusterTopMover {
  clusterId: string;
  name: string; // resolved server-side; decreasing movers may be absent from current-window rawClusters
  prevCount: number;
  currCount: number;
  zScore: number; // Poisson rate-change z = (cur - prev) / sqrt(cur + prev); drives ranking
  pctChange: number; // signed; for display only (NaN when prev=0 — render as "NEW")
  series: TimeSeriesDataPoint[]; // current period, bucketed
}

export const GetClusterTopMoversSchema = z.object({
  ...TimeRangeSchema.shape,
  projectId: z.guid(),
  signalId: z.guid(),
  intervalValue: z.coerce.number().default(1),
  intervalUnit: z.enum(["minute", "hour", "day"]).default("hour"),
});

// Resolve the selected window duration in hours from the time-range inputs.
function resolveDurationHours(
  pastHours: string | null | undefined,
  startDate: string | null | undefined,
  endDate: string | null | undefined
): number | null {
  if (pastHours && !isNaN(parseFloat(pastHours))) return parseInt(pastHours);
  if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (!isNaN(ms) && ms > 0) return ms / (1000 * 60 * 60);
  }
  return null;
}

export async function getClusterTopMovers(
  input: z.infer<typeof GetClusterTopMoversSchema>
): Promise<{ items: ClusterTopMover[] }> {
  const { projectId, signalId, pastHours, startDate, endDate, intervalValue, intervalUnit } =
    GetClusterTopMoversSchema.parse(input);

  const durationHoursRaw = resolveDurationHours(pastHours, startDate, endDate);
  // No time range → no notion of a "preceding period"; nothing to compare.
  if (durationHoursRaw === null) return { items: [] };
  // CH INTERVAL only accepts integers; round to whole hours (min 1).
  const durationHours = Math.max(1, Math.round(durationHoursRaw));

  // Current-window clause + WITH FILL for a smooth sparkline.
  const {
    timeClause: currClause,
    withFillClause,
    params: currParams,
  } = buildTimeRangeClauses({
    timeColumn: "timestamp",
    pastHours,
    startTime: startDate,
    endTime: endDate,
    intervalValue,
    intervalUnit,
  });

  // Previous window = the equal-duration period immediately before the current one.
  // buildTimeRangeClauses can't express an offset window, so build it inline.
  const prevParams: Record<string, unknown> = { durationHours, doubleDurationHours: durationHours * 2 };
  let prevClause: string;
  if (pastHours && !isNaN(parseFloat(pastHours))) {
    prevClause = `AND timestamp >= now() - INTERVAL {doubleDurationHours:UInt32} HOUR
      AND timestamp < now() - INTERVAL {durationHours:UInt32} HOUR`;
  } else {
    prevParams.startTime = String(startDate).replace("Z", "");
    prevClause = `AND timestamp >= toDateTime64({startTime:String}, 9) - INTERVAL {durationHours:UInt32} HOUR
      AND timestamp < toDateTime64({startTime:String}, 9)`;
  }

  // Restrict candidacy to named (level>0) clusters; level-0 "emerging" clusters
  // have no name and aren't in clusters_v0, so they'd surface as nameless movers.
  const namedClustersClause = `AND cluster_id IN (
    SELECT id FROM clusters WHERE signal_id = {signalId: UUID} AND level > 0
  )`;

  const currTotalsQuery = `
    SELECT cluster_id, count() AS count
    FROM signal_events
    ARRAY JOIN clusters AS cluster_id
    WHERE signal_id = {signalId: UUID}
      ${currClause}
      ${namedClustersClause}
    GROUP BY cluster_id
  `;

  const prevTotalsQuery = `
    SELECT cluster_id, count() AS count
    FROM signal_events
    ARRAY JOIN clusters AS cluster_id
    WHERE signal_id = {signalId: UUID}
      ${prevClause}
      ${namedClustersClause}
    GROUP BY cluster_id
  `;

  const seriesQuery = `
    SELECT
      cluster_id,
      toStartOfInterval(timestamp, toInterval({intervalValue: UInt32}, {intervalUnit: String})) AS timestamp,
      count() AS count
    FROM signal_events
    ARRAY JOIN clusters AS cluster_id
    WHERE signal_id = {signalId: UUID}
      ${currClause}
      ${namedClustersClause}
    GROUP BY cluster_id, timestamp
    ORDER BY cluster_id, timestamp ASC ${withFillClause}
  `;

  // Resolve names server-side. Decreasing movers (e.g. 20→0) drop out of the
  // current-window rawClusters the client uses, so their name can only come from here.
  const namesQuery = `
    SELECT id, name FROM clusters WHERE signal_id = {signalId: UUID} AND level > 0
  `;

  const [currRows, prevRows, seriesRows, nameRows] = await Promise.all([
    executeQuery<{ cluster_id: string; count: number }>({
      query: currTotalsQuery,
      parameters: { signalId, ...currParams },
      projectId,
    }),
    executeQuery<{ cluster_id: string; count: number }>({
      query: prevTotalsQuery,
      parameters: { signalId, ...prevParams },
      projectId,
    }),
    executeQuery<{ cluster_id: string; timestamp: string; count: number }>({
      query: seriesQuery,
      parameters: { signalId, ...currParams },
      projectId,
    }),
    executeQuery<{ id: string; name: string }>({
      query: namesQuery,
      parameters: { signalId },
      projectId,
    }),
  ]);

  const nameMap = new Map<string, string>();
  for (const r of nameRows) nameMap.set(r.id, r.name);

  const currMap = new Map<string, number>();
  for (const r of currRows) currMap.set(r.cluster_id, Number(r.count));
  const prevMap = new Map<string, number>();
  for (const r of prevRows) prevMap.set(r.cluster_id, Number(r.count));
  const seriesMap = new Map<string, TimeSeriesDataPoint[]>();
  for (const r of seriesRows) {
    const list = seriesMap.get(r.cluster_id) ?? [];
    list.push({ timestamp: r.timestamp, count: Number(r.count) });
    seriesMap.set(r.cluster_id, list);
  }

  const clusterIds = new Set<string>([...currMap.keys(), ...prevMap.keys()]);
  const movers: ClusterTopMover[] = [];
  for (const clusterId of clusterIds) {
    const currCount = currMap.get(clusterId) ?? 0;
    const prevCount = prevMap.get(clusterId) ?? 0;
    const combined = currCount + prevCount;
    // Soft floor: skip statistically-real-but-trivial movers.
    if (combined < TOP_MOVERS_MIN_COMBINED_COUNT) continue;
    // Poisson rate-change z-score: scale-aware, so 1000→1500 outranks 1→2.
    // combined >= floor (>0 here) so sqrt is always defined.
    const zScore = (currCount - prevCount) / Math.sqrt(combined);
    // pctChange is display-only; NaN for new clusters (rendered as "NEW").
    const pctChange = prevCount === 0 ? NaN : (currCount - prevCount) / prevCount;
    movers.push({
      clusterId,
      name: nameMap.get(clusterId) ?? clusterId,
      prevCount,
      currCount,
      zScore,
      pctChange,
      series: seriesMap.get(clusterId) ?? [],
    });
  }

  // Rank by |z| descending; sign of z (= sign of cur - prev) drives direction/color in the UI.
  movers.sort((a, b) => Math.abs(b.zScore) - Math.abs(a.zScore));
  return { items: movers.slice(0, 10) };
}
