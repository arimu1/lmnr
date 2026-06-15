"use client";

import { useEffect, useRef, useState } from "react";
import { SunburstChart } from "recharts";

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

  const dim = Math.min(size.width, size.height);

  return (
    <div ref={containerRef} className="h-full w-full flex items-center justify-center overflow-hidden">
      {dim > 0 && (
        <div className={isPaywall ? "blur-[5px] pointer-events-none" : undefined}>
          <SunburstChart
            data={data}
            width={dim}
            height={dim}
            dataKey="value"
            stroke="var(--color-background)"
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
