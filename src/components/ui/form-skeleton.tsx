import { Skeleton } from "@/components/ui/skeleton";

export function FormSkeleton({ fields = 4 }: { fields?: number }) {
  return (
    <div className="rounded-2xl border border-border bg-surface p-6 shadow-sm space-y-4">
      <Skeleton className="h-5 w-40" />
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: fields }).map((_, i) => (
          <div key={i} className="space-y-1.5">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-10 w-full" />
          </div>
        ))}
      </div>
      <div className="flex items-center gap-3 pt-2">
        <Skeleton className="h-10 w-24" />
        <Skeleton className="h-10 w-24" />
      </div>
    </div>
  );
}
