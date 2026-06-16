"use client";

import { Line, LineChart, ResponsiveContainer, YAxis } from "recharts";

import { Skeleton } from "@/components/ui/skeleton";

interface SignalSparklineProps {
  data: { timestamp: string; count: number }[];
  maxCount?: number;
  isLoading?: boolean;
  stroke?: string;
}

export default function SignalSparkline({
  data,
  maxCount,
  isLoading,
  stroke = "hsl(var(--primary))",
}: SignalSparklineProps) {
  if (isLoading) {
    return (
      <div className="w-full h-full">
        <Skeleton className="w-full h-full rounded-sm" />
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div className="w-full h-full flex items-center">
        <span className="text-muted-foreground text-xs">No data</span>
      </div>
    );
  }

  return (
    <div className="w-full h-full">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={data} margin={{ top: 4, right: 4, bottom: 4, left: 4 }}>
          <YAxis domain={[0, Math.max(maxCount ?? 1, 1)]} hide />
          <Line type="linear" dataKey="count" stroke={stroke} strokeWidth={1.5} dot={false} isAnimationActive={false} />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
