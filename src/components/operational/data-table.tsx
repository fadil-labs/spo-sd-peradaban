"use client";

import { cn } from "@/lib/utils";
import { useState, useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

interface Column<T> {
  key: string;
  header: React.ReactNode;
  className?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  mobileHide?: boolean;
}

export interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  keyExtractor: (item: T) => string;
  emptyState?: React.ReactNode;
  isLoading?: boolean;
  emptyIcon?: React.ReactNode | React.ElementType;
  emptyTitle?: string;
  emptyDescription?: string;
  emptyAction?: React.ReactNode;
  onRowClick?: (item: T) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (selectedIds: Set<string>) => void;
  getSelectableId?: (item: T) => string | null;
}

export function DataTable<T>({
  columns,
  data,
  keyExtractor,
  emptyState,
  isLoading,
  emptyIcon,
  emptyTitle,
  emptyDescription,
  emptyAction,
  onRowClick,
  selectedIds,
  onSelectionChange,
  getSelectableId,
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);
  const [selectAll, setSelectAll] = useState(false);

  const sortedData = useMemo(() => {
    if (!sortKey || !sortDirection) return data;
    return [...data].sort((a, b) => {
      const aVal = (a as unknown as Record<string, unknown>)[sortKey];
      const bVal = (b as unknown as Record<string, unknown>)[sortKey];
      if (aVal == null && bVal == null) return 0;
      if (aVal == null) return sortDirection === "asc" ? -1 : 1;
      if (bVal == null) return sortDirection === "asc" ? 1 : -1;
      if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
      if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
      return 0;
    });
  }, [data, sortKey, sortDirection]);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") setSortDirection("desc");
      else if (sortDirection === "desc") { setSortKey(null); setSortDirection(null); }
      else setSortDirection("asc");
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const selector = "a, button, input, textarea, select, [role='button'], [data-no-row-click]";
    return target.closest(selector) !== null;
  };

  const toggleSelection = (id: string) => {
    const next = new Set(selectedIds || []);
    if (next.has(id)) next.delete(id); else next.add(id);
    onSelectionChange?.(next);
  };

  const toggleSelectAll = () => {
    if (!getSelectableId) return;
    const next = new Set<string>();
    if (!selectAll) {
      data.forEach((item) => {
        const id = getSelectableId(item);
        if (id) next.add(id);
      });
    }
    setSelectAll(!selectAll);
    onSelectionChange?.(next);
  };

  const getItemId = (item: T) => getSelectableId?.(item) ?? null;

  const isChecked = (item: T) => {
    const id = getItemId(item);
    return id ? selectedIds?.has(id) ?? false : false;
  };

  const handleItemToggle = (item: T) => {
    const id = getItemId(item);
    if (id) toggleSelection(id);
  };

  const handleRowClick = (item: T, e: React.MouseEvent) => {
    if (isInteractiveTarget(e.target)) return;
    if (getSelectableId && (e.target as HTMLElement).closest("input[type='checkbox']")) return;
    onRowClick?.(item);
  };

  const checkboxColumn = getSelectableId ? 1 : 0;

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border bg-muted/5">
                {checkboxColumn > 0 && <th className="w-10 py-3 px-4"><Skeleton className="h-4 w-4" /></th>}
                {columns.map((col) => (
                  <th key={col.key} className={`text-left py-3 px-4 font-medium text-muted ${col.className || ""}`}>
                    <Skeleton className="h-4 w-24" />
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {Array.from({ length: 5 }).map((_, i) => (
                <tr key={i}>
                  {checkboxColumn > 0 && <td className="py-3 px-4"><Skeleton className="h-4 w-4" /></td>}
                  {columns.map((col) => (
                    <td key={col.key} className={`py-3 px-4 ${col.className || ""}`}>
                      <Skeleton className="h-4 w-full" />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    );
  }

  if (data.length === 0) {
    if (emptyState) return <>{emptyState}</>;
    const IconComponent = emptyIcon as React.ElementType | undefined;
    return (
      <EmptyState
        icon={IconComponent ? IconComponent : undefined}
        title={emptyTitle || "Belum ada data"}
        description={emptyDescription || "Tidak ada data yang dapat ditampilkan saat ini."}
        action={emptyAction}
      />
    );
  }

  const SortIcon = ({ columnKey }: { columnKey: string }) => {
    if (sortKey !== columnKey) return <ArrowUpDown className="h-3 w-3 opacity-40" />;
    if (sortDirection === "asc") return <ArrowUp className="h-3 w-3 text-primary" />;
    return <ArrowDown className="h-3 w-3 text-primary" />;
  };

  return (
    <div className="rounded-2xl border border-border bg-white shadow-sm overflow-hidden">
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border bg-muted/20">
              {checkboxColumn > 0 && (
                <th className="w-10 py-3 px-4">
                  <input
                    type="checkbox"
                    checked={selectAll}
                    onChange={toggleSelectAll}
                    className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                  />
                </th>
              )}
              {columns.map((col) => (
                <th
                  key={col.key}
                  className={`text-left py-3 px-4 font-semibold text-muted ${col.sortable ? "cursor-pointer select-none hover:text-foreground transition-colors" : ""} ${col.className || ""}`}
                  onClick={() => col.sortable && handleSort(col.key)}
                >
                  <span className="inline-flex items-center gap-1.5">
                    {col.header}
                    {col.sortable && <SortIcon columnKey={col.key} />}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {sortedData.map((item, idx) => (
              <tr
                key={keyExtractor(item)}
                className={cn(
                  "transition-colors",
                  idx % 2 === 1 ? "bg-muted/[0.02]" : "bg-surface",
                  "hover:bg-muted/5",
                  onRowClick ? "cursor-pointer" : ""
                )}
                onClick={(e) => handleRowClick(item, e)}
              >
                {checkboxColumn > 0 && (
                  <td className="py-3 px-4">
                    <input
                      type="checkbox"
                      checked={isChecked(item)}
                      onChange={() => handleItemToggle(item)}
                      className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                    />
                  </td>
                )}
                {columns.map((col) => (
                  <td key={col.key} className={`py-3 px-4 transition-all ${col.className || ""}`}>
                    {col.render ? col.render(item) : (item as unknown as Record<string, unknown>)[col.key] as React.ReactNode}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="md:hidden divide-y divide-border">
        {sortedData.map((item) => (
          <div
            key={keyExtractor(item)}
            className={cn("p-4 space-y-2", onRowClick ? "cursor-pointer" : "")}
            onClick={(e) => handleRowClick(item, e)}
          >
            {checkboxColumn > 0 && (
              <div className="flex justify-end">
                <input
                  type="checkbox"
                  checked={isChecked(item)}
                  onChange={() => handleItemToggle(item)}
                  className="h-4 w-4 rounded border-border text-primary focus:ring-primary"
                />
              </div>
            )}
            {columns.filter((col) => !col.mobileHide).map((col) => (
              <div key={col.key} className="flex items-start justify-between gap-3">
                <span className="text-xs font-medium text-muted shrink-0">{col.header}</span>
                <div className={`text-sm text-foreground ${col.className || ""}`}>
                  {col.render ? col.render(item) : (item as unknown as Record<string, unknown>)[col.key] as React.ReactNode}
                </div>
              </div>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}
