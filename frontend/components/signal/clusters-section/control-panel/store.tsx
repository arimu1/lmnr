"use client";

import { createContext, type PropsWithChildren, useContext, useState } from "react";
import { createStore } from "zustand";
import { useStoreWithEqualityFn } from "zustand/traditional";

// Ephemeral view-config for the clusters dashboard. Not persisted to URL — these
// are experiment toggles, distinct from clusterId / time-range (nuqs-owned).
export type ClustersViewState = {
  showTopMovers: boolean;
};

export type ClustersViewActions = {
  setShowTopMovers: (value: boolean) => void;
};

export type ClustersViewStore = ClustersViewState & ClustersViewActions;

export type ClustersViewStoreApi = ReturnType<typeof createClustersViewStore>;

const createClustersViewStore = () =>
  createStore<ClustersViewStore>()((set) => ({
    showTopMovers: true,
    setShowTopMovers: (showTopMovers) => set({ showTopMovers }),
  }));

const ClustersViewContext = createContext<ClustersViewStoreApi | null>(null);

export const useClustersViewStore = <T,>(
  selector: (state: ClustersViewStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => {
  const store = useContext(ClustersViewContext);
  if (!store) throw new Error("Missing ClustersViewProvider in the tree");
  return useStoreWithEqualityFn(store, selector, equalityFn);
};

export const ClustersViewProvider = ({ children }: PropsWithChildren) => {
  const [store] = useState(() => createClustersViewStore());
  return <ClustersViewContext.Provider value={store}>{children}</ClustersViewContext.Provider>;
};
