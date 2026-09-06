import { forwardRef } from "react";
import { cn } from "@/lib/utils";

interface FormTextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  label: string;
  error?: string;
  helperText?: string;
}

export const FormTextarea = forwardRef<HTMLTextAreaElement, FormTextareaProps>(
  ({ label, error, helperText, className, id, name, rows = 4, ...props }, ref) => {
    const inputId = id || name;

    return (
      <div className="space-y-1.5">
        <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
          {label}
        </label>
        <textarea
          ref={ref}
          id={inputId}
          name={name}
          rows={rows}
          className={cn(
            "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            error
              ? "border-danger/50 focus:ring-danger/20"
              : undefined,
            props.disabled && "opacity-50 cursor-not-allowed",
            className
          )}
          {...props}
        />
        {error && <p className="text-xs text-danger">{error}</p>}
        {helperText && !error && <p className="text-xs text-muted">{helperText}</p>}
      </div>
    );
  }
);

FormTextarea.displayName = "FormTextarea";
