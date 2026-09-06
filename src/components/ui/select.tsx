import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label: string;
  error?: string;
  helperText?: string;
  children: React.ReactNode;
}

export const FormSelect = forwardRef<HTMLSelectElement, FormSelectProps>(
  ({ label, error, helperText, children, className, id, name, ...props }, ref) => {
    const inputId = id || name;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <select
          ref={ref}
          id={inputId}
          name={name}
          className={cn(
            "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            error
              ? "border-danger/50 focus:ring-danger/20"
              : undefined,
            props.disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          {...props}
        >
          {children}
        </select>
        {error && <p className="text-xs text-danger">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
      </div>
    );
  }
);

FormSelect.displayName = "FormSelect";
