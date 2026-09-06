import Link from "next/link";

export type AttentionItem = {
  label: string;
  count: number;
  href: string;
  tone: "warning" | "danger" | "info";
};

const toneClasses: Record<AttentionItem["tone"], string> = {
  warning: "border-warning/20 bg-warning/10 text-warning",
  danger: "border-danger/20 bg-danger/10 text-danger",
  info: "border-primary/20 bg-primary/10 text-primary",
};

export function AttentionSection({ title, items }: { title: string; items: AttentionItem[] }) {
  if (items.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="flex items-center justify-between rounded-xl border border-border bg-surface/50 px-3 py-2.5 hover:bg-muted/5 transition-colors"
          >
            <span className="text-sm text-foreground">{item.label}</span>
            <span className={`inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-medium ${toneClasses[item.tone]}`}>
              {item.count}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}
