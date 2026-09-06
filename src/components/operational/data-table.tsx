"use client";

import { cn } from "@/lib/utils";
import { useState } from "react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/ui/empty-state";
import { ArrowUpDown, ArrowUp, ArrowDown } from "lucide-react";

type SortDirection = "asc" | "desc" | null;

interface Column<T> {
  key: string;
  header: string;
  className?: string;
  render?: (item: T) => React.ReactNode;
  sortable?: boolean;
  mobileHide?: boolean;
}

interface DataTableProps<T> {
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
}: DataTableProps<T>) {
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDirection, setSortDirection] = useState<SortDirection>(null);

  const handleSort = (key: string) => {
    if (sortKey === key) {
      if (sortDirection === "asc") {
        setSortDirection("desc");
      } else if (sortDirection === "desc") {
        setSortKey(null);
        setSortDirection(null);
      } else {
        setSortDirection("asc");
      }
    } else {
      setSortKey(key);
      setSortDirection("asc");
    }
  };

  const sortedData = [...data].sort((a, b) => {
    if (!sortKey || !sortDirection) return 0;
    const aVal = (a as unknown as Record<string, unknown>)[sortKey];
    const bVal = (b as unknown as Record<string, unknown>)[sortKey];
    if (aVal == null && bVal == null) return 0;
    if (aVal == null) return sortDirection === "asc" ? -1 : 1;
    if (bVal == null) return sortDirection === "asc" ? 1 : -1;
    if (aVal < bVal) return sortDirection === "asc" ? -1 : 1;
    if (aVal > bVal) return sortDirection === "asc" ? 1 : -1;
    return 0;
  });

  const isInteractiveTarget = (target: EventTarget | null): boolean => {
    if (!target || !(target instanceof HTMLElement)) return false;
    const selector = "a, button, input, textarea, select, [role='button'], [data-no-row-click]";
    return target.closest(selector) !== null;
  };

  const handleRowClick = (item: T, e: React.MouseEvent) => {
    if (isInteractiveTarget(e.target)) return;
    onRowClick?.(item);
  };

  if (isLoading) {
    return (
      <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="sticky top-0 z-10 border-b border-border bg-muted/5">
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
      {/* Desktop table */}
      <div className="hidden md:block overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="sticky top-0 z-10 border-b border-border bg-muted/20">
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

      {/* Mobile card mode */}
      <div className="md:hidden divide-y divide-border">
        {sortedData.map((item) => (
          <div
            key={keyExtractor(item)}
            className={cn("p-4 space-y-2", onRowClick ? "cursor-pointer" : "")}
            onClick={(e) => handleRowClick(item, e)}
          >
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
