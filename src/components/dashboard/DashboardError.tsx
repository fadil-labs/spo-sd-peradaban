import { Button } from "@/components/ui/button";

export function DashboardError({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <div className="rounded-2xl border border-danger/20 bg-danger/5 p-6 text-center">
      <p className="text-sm text-danger font-medium mb-1">Data belum dapat dimuat</p>
      <p className="text-xs text-muted mb-4">{message}</p>
      {onRetry && (
        <Button variant="outline" size="sm" onClick={onRetry}>
          Coba Lagi
        </Button>
      )}
    </div>
  );
}
