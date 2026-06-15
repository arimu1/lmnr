"use client";

import { useEffect, useRef, useState } from "react";
import { SunburstChart } from "recharts";

import { cn } from "@/lib/utils";

import ClusterListEmptyState from "../cluster-list/empty-state";
import { type SunburstData, sunburstHasData } from "./utils";

export default function Sunburst({
  data,
  isPaywall,
  onNavigateToCluster,
}: {
  data: SunburstData;
  isPaywall: boolean;
  onNavigateToCluster: (id: string) => void;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new ResizeObserver((entries) => {
      for (const entry of entries) {
        const { width, height } = entry.contentRect;
        if (width > 0 && height > 0) setSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (!sunburstHasData(data)) {
    return (
      <div className="h-full w-full">
        <ClusterListEmptyState title="No clusters during this period" />
      </div>
    );
  }

  // Semicircle is 2:1 (width 2r × height r). Cap by both axes so the dome fills
  // the wide space without overflowing vertically (radius = dim/2 ≤ height).
  const dim = Math.min(size.width, size.height * 2);

  return (
    <div ref={containerRef} className="relative h-full w-full overflow-hidden">
      {dim > 0 && (
        // Square chart whose center sits on the container bottom edge; the empty
        // lower half is clipped, leaving only the top dome (flat edge on bottom).
        <div
          className={cn(
            "absolute left-1/2 bottom-0 -translate-x-1/2 translate-y-1/2",
            isPaywall && "blur-[5px] pointer-events-none"
          )}
        >
          <SunburstChart
            data={data}
            width={dim}
            height={dim}
            dataKey="value"
            stroke="var(--color-background)"
            startAngle={0}
            endAngle={180}
            textOptions={{ fill: "transparent", stroke: "transparent", pointerEvents: "none" }}
            onClick={(node) => {
              const id = (node as SunburstData).clusterId as string | undefined;
              if (id) onNavigateToCluster(id);
            }}
          />
        </div>
      )}
    </div>
  );
}
