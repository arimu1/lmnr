"use client";

import { SlidersHorizontal } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Switch } from "@/components/ui/switch";

import { useClustersViewStore } from "./store";

export default function ControlPanel() {
  const showTopMovers = useClustersViewStore((s) => s.showTopMovers);
  const setShowTopMovers = useClustersViewStore((s) => s.setShowTopMovers);

  return (
    <div className="absolute bottom-3 right-3 z-20">
      <Popover>
        <PopoverTrigger asChild>
          <Button
            size="icon"
            variant="outline"
            className="rounded-full size-9 shadow-md bg-background"
            aria-label="Cluster view options"
          >
            <SlidersHorizontal className="size-4" />
          </Button>
        </PopoverTrigger>
        <PopoverContent align="end" side="top" className="w-56">
          <div className="flex flex-col gap-3">
            <span className="text-xs font-medium text-muted-foreground">View options</span>
            <label className="flex items-center justify-between gap-2 cursor-pointer">
              <span className="text-sm">Show top movers</span>
              <Switch checked={showTopMovers} onCheckedChange={setShowTopMovers} />
            </label>
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
}
