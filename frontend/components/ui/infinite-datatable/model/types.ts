import { type Row, type RowData, type Table, type TableOptions } from "@tanstack/react-table";
import { type VirtualItem, type Virtualizer } from "@tanstack/react-virtual";
import { type ReactNode, type RefObject } from "react";

export interface LoadMoreButtonProps {
  onClick: () => void;
  isFetching: boolean;
  hasMore: boolean;
}

export interface InfiniteDataTableProps<TData extends RowData> extends Omit<
  Partial<TableOptions<TData>>,
  "data" | "columns"
> {
  data: TData[];
  columns: TableOptions<TData>["columns"];

  hasMore: boolean;
  isFetching: boolean;
  isLoading: boolean;
  fetchNextPage: () => void;
  totalItemsCount?: number;

  sortBy?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnId: string, direction: "asc" | "desc") => void;

  estimatedRowHeight?: number;
  overscan?: number;

  /** Optional ids forced to the front of the column order at render time. */
  pinnedColumns?: string[];

  onRowClick?: (row: Row<TData>) => void;
  focusedRowId?: string | null;

  selectionPanel?: (selectedRowIds: string[]) => ReactNode;

  className?: string;
  childrenClassName?: string;
  scrollContentClassName?: string;

  emptyRow?: ReactNode;
  loadingRow?: ReactNode;
  error?: Error | null;
  getRowHref?: (row: Row<TData>) => string;
  loadMoreButton?: boolean | ((props: LoadMoreButtonProps) => ReactNode);
  hideSelectionPanel?: boolean;
  /**
   * Opt in to virtualizing against the window/page scroll instead of an internal
   * `overflow-auto` container, so the whole page scrolls and the table renders
   * at its natural height. Defaults to false — all other consumers keep the
   * internal-scroll behavior unchanged.
   */
  windowScroll?: boolean;
  /**
   * windowScroll only. Extra elements above the table whose height changes
   * should re-trigger the scrollMargin measurement (e.g. content lifted out of
   * `children` into a page sibling). The table already observes its own
   * `children`; pass refs to anything sitting above it but outside `children`.
   * Defaults to none, so consumers that keep their dynamic content inside
   * `children` are unaffected.
   */
  aboveTableRefs?: RefObject<HTMLElement | null>[];
}

export interface InfiniteDataTableHeaderProps<TData extends RowData> {
  table: Table<TData>;
}

export interface InfiniteDataTableBodyProps<TData extends RowData> {
  table: Table<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  virtualItems: VirtualItem[];
  isLoading: boolean;
  isFetching: boolean;
  hasMore: boolean;
  onRowClick?: (row: Row<TData>) => void;
  focusedRowId?: string | null;
  loadMoreRef: RefObject<HTMLTableRowElement | null>;
  emptyRow?: ReactNode;
  loadingRow?: ReactNode;
  getRowHref?: (row: Row<TData>) => string;
  loadMoreButton?: boolean | ((props: LoadMoreButtonProps) => ReactNode);
  fetchNextPage: () => void;
}

export interface InfiniteDataTableRowProps<TData extends RowData> {
  virtualRow: VirtualItem;
  row: Row<TData>;
  rowVirtualizer: Virtualizer<HTMLDivElement, Element>;
  onRowClick?: (row: Row<TData>) => void;
  href?: string;
  focusedRowId?: string | null;
}

export interface SelectionPanelProps {
  selectedRowIds: string[];
  onClearSelection: () => void;
  selectionPanel?: (selectedRowIds: string[]) => ReactNode;
}

export interface CheckboxColumnOptions {
  onDeselectAll?: () => void;
}
