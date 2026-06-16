import { z } from "zod/v4";

import { executeQuery } from "@/lib/actions/sql";

export const GetSignalsStatsSchema = z.object({
  projectId: z.guid(),
  signalIds: z.array(z.string()).min(1),
  pastHours: z.coerce.number().positive(),
});

export interface SignalStatsDataPoint {
  signal_id: string;
  timestamp: string;
  count: string;
}

export interface SignalSparklineData {
  [signalId: string]: { timestamp: string; count: number }[];
}

export type SparklineInterval = {
  intervalValue: number;
  intervalUnit: "minute" | "hour" | "day";
  interval: string; // CH "<n> <UNIT>" string, derived from the structured value
  intervalMs: number;
};

const UNIT_MS: Record<SparklineInterval["intervalUnit"], number> = {
  minute: 60_000,
  hour: 3_600_000,
  day: 86_400_000,
};

function makeInterval(intervalValue: number, intervalUnit: SparklineInterval["intervalUnit"]): SparklineInterval {
  return {
    intervalValue,
    intervalUnit,
    interval: `${intervalValue} ${intervalUnit.toUpperCase()}`,
    intervalMs: intervalValue * UNIT_MS[intervalUnit],
  };
}

// Sparkline bin size by window length — shared by signal-card and top-movers sparklines.
export function getIntervalForHours(hours: number): SparklineInterval {
  if (hours <= 1) return makeInterval(1, "minute");
  if (hours <= 3) return makeInterval(5, "minute");
  if (hours <= 24) return makeInterval(1, "hour");
  if (hours <= 72) return makeInterval(3, "hour");
  if (hours <= 168) return makeInterval(6, "hour");
  if (hours <= 336) return makeInterval(12, "hour");
  return makeInterval(1, "day");
}

function floorToInterval(ts: number, intervalMs: number): number {
  return Math.floor(ts / intervalMs) * intervalMs;
}

export async function getSignalsStats(input: z.infer<typeof GetSignalsStatsSchema>): Promise<SignalSparklineData> {
  const { projectId, signalIds, pastHours } = GetSignalsStatsSchema.parse(input);
  const { interval, intervalMs } = getIntervalForHours(pastHours);
  const rangeMs = pastHours * 3_600_000;

  const rows = await executeQuery<SignalStatsDataPoint>({
    projectId,
    query: `
      SELECT
        signal_id,
        toStartOfInterval(timestamp, INTERVAL ${interval}) as timestamp,
        count() as count
      FROM signal_events
      WHERE signal_id IN ({signalIds: Array(UUID)})
        AND timestamp >= now() - INTERVAL ${pastHours} HOUR
      GROUP BY signal_id, timestamp
      ORDER BY signal_id, timestamp ASC
    `,
    parameters: { signalIds },
  });

  const countsBySignal = new Map<string, Map<number, number>>();
  for (const row of rows) {
    if (!countsBySignal.has(row.signal_id)) {
      countsBySignal.set(row.signal_id, new Map());
    }
    const epochMs = new Date(row.timestamp.replace(" ", "T") + "Z").getTime();
    countsBySignal.get(row.signal_id)!.set(epochMs, parseInt(row.count, 10));
  }

  const now = Date.now();
  const fillFrom = floorToInterval(now - rangeMs, intervalMs);
  const fillTo = floorToInterval(now, intervalMs);

  const data: SignalSparklineData = {};
  for (const signalId of signalIds) {
    const signalCounts = countsBySignal.get(signalId);
    const points: { timestamp: string; count: number }[] = [];

    for (let ts = fillFrom; ts <= fillTo; ts += intervalMs) {
      const count = signalCounts?.get(ts) ?? 0;
      points.push({ timestamp: new Date(ts).toISOString(), count });
    }

    data[signalId] = points;
  }

  return data;
}
