"use client";

import { AnimatePresence, motion } from "framer-motion";
import { useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { shallow } from "zustand/shallow";

import { useSignalStoreContext } from "@/components/signal/store.tsx";
import { Skeleton } from "@/components/ui/skeleton";
import { useProjectContext } from "@/contexts/project-context";
import { getHasClusteringAccess } from "@/lib/features/clustering";
import { cn } from "@/lib/utils";

import { useNavigateToCluster } from "../use-navigate-to-cluster";
import MoverCard from "./mover-card";

// Resolve the comparison-window duration in whole hours, mirroring
// getClusterTopMovers (Math.max(1, Math.round(...))), then format as Nd/Nh.
function formatComparisonWindow(
  pastHours: string | null,
  startDate: string | null,
  endDate: string | null
): string | null {
  let hoursRaw: number | null = null;
  if (pastHours && !isNaN(parseFloat(pastHours))) hoursRaw = parseInt(pastHours);
  else if (startDate && endDate) {
    const ms = new Date(endDate).getTime() - new Date(startDate).getTime();
    if (!isNaN(ms) && ms > 0) hoursRaw = ms / (1000 * 60 * 60);
  }
  if (hoursRaw === null) return null;
  const hours = Math.max(1, Math.round(hoursRaw));
  return hours % 24 === 0 ? `${hours / 24}d` : `${hours}h`;
}

interface Props {
  className?: string;
}

export default function TopMovers({ className }: Props) {
  const { workspace } = useProjectContext();
  const isPaywall = !getHasClusteringAccess(workspace?.tierName);
  const searchParams = useSearchParams();
  const onNavigateToCluster = useNavigateToCluster();

  const movers = useSignalStoreContext((s) => s.topMovers, shallow);
  const isLoading = useSignalStoreContext((s) => s.isTopMoversLoading);
  const rawClusters = useSignalStoreContext((s) => s.rawClusters);
  const fetchTopMovers = useSignalStoreContext((s) => s.fetchTopMovers);

  const pastHours = searchParams.get("pastHours");
  const startDate = searchParams.get("startDate");
  const endDate = searchParams.get("endDate");

  const comparisonWindow = formatComparisonWindow(pastHours, startDate, endDate);

  // Always fetch when a time range is present; abort superseded requests.
  useEffect(() => {
    const controller = new AbortController();
    fetchTopMovers({ pastHours, startDate, endDate, abortSignal: controller.signal });
    return () => controller.abort();
  }, [fetchTopMovers, pastHours, startDate, endDate]);

  const nameById = useMemo(() => {
    const map = new Map<string, string>();
    for (const c of rawClusters) map.set(c.id, c.name);
    return map;
  }, [rawClusters]);

  // Edge fade gradients: show left when scrolled off the start, right when there's
  // more to scroll. onScroll + ResizeObserver covers the at-ends and fits-entirely
  // cases more reliably than useScroll's progress value.
  const scrollRef = useRef<HTMLDivElement>(null);
  const [showLeftFade, setShowLeftFade] = useState(false);
  const [showRightFade, setShowRightFade] = useState(false);

  const updateFades = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const canScroll = el.scrollWidth - el.clientWidth > 1;
    setShowLeftFade(canScroll && el.scrollLeft > 1);
    setShowRightFade(canScroll && el.scrollLeft < el.scrollWidth - el.clientWidth - 1);
  }, []);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    // ResizeObserver fires its callback immediately on observe(), covering the
    // initial measurement + re-measures when content (movers) changes width.
    const ro = new ResizeObserver(updateFades);
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateFades, movers]);

  const fadeTransition = { duration: 0.15 };

  return (
    <div className={cn("flex flex-col w-full gap-2", className)}>
      <h3 className="px-1 text-sm text-secondary-foreground">
        Top movers
        {comparisonWindow && <span className="text-muted-foreground">{` (vs previous ${comparisonWindow})`}</span>}
      </h3>
      <div className="h-[120px] w-full">
        {isLoading ? (
          <div className="flex flex-row gap-2 overflow-hidden h-full">
            {[0, 1, 2, 3, 4].map((i) => (
              <Skeleton key={i} className="w-[288px] h-full shrink-0 rounded-md" />
            ))}
          </div>
        ) : movers.length === 0 ? (
          <div className="flex items-center justify-center h-full text-muted-foreground text-sm">
            No movement in this period
          </div>
        ) : (
          <div className="relative h-full">
            <AnimatePresence>
              {showLeftFade && (
                <motion.div
                  key="fade-left"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  className="pointer-events-none absolute left-0 top-0 bottom-0 z-10 w-[40px] bg-gradient-to-r from-background to-transparent"
                />
              )}
              {showRightFade && (
                <motion.div
                  key="fade-right"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={fadeTransition}
                  className="pointer-events-none absolute right-0 top-0 bottom-0 z-10 w-[40px] bg-gradient-to-l from-background to-transparent"
                />
              )}
            </AnimatePresence>
            <div
              ref={scrollRef}
              onScroll={updateFades}
              className="no-scrollbar flex flex-row gap-2 overflow-x-auto overflow-y-hidden h-full"
            >
              {movers.map((mover) => (
                <MoverCard
                  key={mover.clusterId}
                  mover={mover}
                  name={mover.name || nameById.get(mover.clusterId) || mover.clusterId}
                  isPaywall={isPaywall}
                  onClick={() => onNavigateToCluster(mover.clusterId)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
