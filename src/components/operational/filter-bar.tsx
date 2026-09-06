import { ReactNode } from "react";

interface FilterBarProps {
  children: ReactNode;
  resultCount?: { current: number; total: number };
  activeFilterCount?: number;
  onReset?: () => void;
}

export function FilterBar({ children, resultCount, activeFilterCount, onReset }: FilterBarProps) {
  return (
    <div className="space-y-3">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-1 items-center gap-3 flex-wrap">
          {children}
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          {activeFilterCount !== undefined && activeFilterCount > 0 && (
            <span className="inline-flex items-center rounded-full bg-primary/10 px-2.5 py-0.5 text-xs font-medium text-primary">
              {activeFilterCount} filter aktif
            </span>
          )}
          {onReset && (
            <button
              type="button"
              onClick={onReset}
              className="inline-flex items-center gap-1.5 h-8 px-3 rounded-md border border-border bg-surface text-xs font-semibold text-muted hover:text-foreground hover:bg-muted/10 transition-colors"
            >
              Reset
            </button>
          )}
        </div>
      </div>
      {resultCount !== undefined && (
        <p className="text-xs text-muted">
          Menampilkan {resultCount.current} dari {resultCount.total} data
        </p>
      )}
    </div>
  );
}
