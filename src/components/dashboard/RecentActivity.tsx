import { MoreHorizontal } from "lucide-react";
import Link from "next/link";

export type RecentActivityItem = {
  id: string;
  title: string;
  description: string;
  amount?: string;
  status?: string;
  timestamp: string;
  href?: string;
};

function getStatusColor(status: string) {
  switch (status) {
    case "completed": return "bg-success/10 text-success";
    case "pending": return "bg-primary/10 text-primary";
    case "failed": return "bg-danger/10 text-danger";
    case "cancelled": return "bg-muted/20 text-muted";
    default: return "bg-muted/20 text-muted";
  }
}

function getStatusLabel(status: string) {
  switch (status) {
    case "completed": return "Berhasil";
    case "pending": return "Menunggu";
    case "failed": return "Gagal";
    case "cancelled": return "Dibatalkan";
    default: return status;
  }
}

export function RecentActivity({ title, description, items }: { title: string; description?: string; items: RecentActivityItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-surface shadow-sm overflow-hidden">
      <div className="px-5 py-4 border-b border-border">
        <h3 className="text-sm font-semibold text-foreground inline-block border-b-2 border-gold/20 pb-0.5">{title}</h3>
        {description && <p className="text-xs text-muted mt-0.5">{description}</p>}
      </div>
      <div className="divide-y divide-border">
        {items.map((item) => (
          <div key={item.id} className="flex items-center justify-between gap-4 px-5 py-3 hover:bg-muted/5 transition-colors">
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-foreground truncate">{item.title}</p>
              <p className="text-xs text-muted truncate">{item.description}</p>
            </div>
            <div className="flex items-center gap-3 shrink-0">
              {item.amount && <span className="text-sm font-medium text-foreground">{item.amount}</span>}
              {item.status && (
                <span className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${getStatusColor(item.status)}`}>
                  {getStatusLabel(item.status)}
                </span>
              )}
              <span className="text-xs text-muted whitespace-nowrap">{item.timestamp}</span>
              {item.href && (
                <Link href={item.href} className="text-primary hover:text-primary-dark">
                  <MoreHorizontal className="h-4 w-4" />
                </Link>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
