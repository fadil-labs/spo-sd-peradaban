import Link from "next/link";
import { Plus } from "lucide-react";

interface PageHeaderProps {
  title: string;
  description?: string;
  primaryAction?: {
    label: string;
    href?: string;
    onClick?: () => void;
    icon?: React.ReactNode;
  };
  secondaryActions?: Array<{
    label: string;
    onClick?: () => void;
    icon?: React.ReactNode;
    disabled?: boolean;
  }>;
}

export function PageHeader({ title, description, primaryAction, secondaryActions }: PageHeaderProps) {
  return (
    <div className="flex flex-col gap-1 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <h2 className="text-xl font-semibold text-foreground">{title}</h2>
        {description && <p className="text-sm text-muted mt-0.5">{description}</p>}
      </div>
      <div className="flex items-center gap-2">
        {secondaryActions?.map((action, index) => (
          <button
            key={index}
            onClick={action.onClick}
            disabled={action.disabled}
            className="inline-flex items-center gap-2 h-10 px-4 rounded-md border border-border bg-surface text-sm font-semibold hover:bg-muted/10 transition-colors active:scale-[0.98] min-h-[44px]"
          >
            {action.icon}
            {action.label}
          </button>
        ))}
        {primaryAction && (
          <div>
            {primaryAction.href ? (
                <Link
                  href={primaryAction.href}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                 {primaryAction.icon || <Plus className="h-4 w-4" />}
                 {primaryAction.label}
               </Link>
             ) : (
                <button
                  onClick={primaryAction.onClick}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-md bg-primary text-white text-sm font-semibold hover:bg-primary-dark active:scale-[0.98] transition-all focus:ring-2 focus:ring-primary focus:ring-offset-2 min-h-[44px]"
                >
                 {primaryAction.icon || <Plus className="h-4 w-4" />}
                 {primaryAction.label}
                </button>
              )}
           </div>
        )}
      </div>
    </div>
  );
}
