"use client";

import { forwardRef } from "react";
import { cn } from "@/lib/utils";
import { FormSelect } from "./select";
import { FormTextarea } from "./textarea";

type AsElement = "input" | "select" | "textarea";

interface BaseFormFieldProps {
  label: string;
  error?: string;
  helperText?: string;
  as?: AsElement;
}

interface FormFieldInputProps extends BaseFormFieldProps, React.InputHTMLAttributes<HTMLInputElement> {
  as?: "input";
  children?: undefined;
}

interface FormFieldSelectProps extends BaseFormFieldProps, React.SelectHTMLAttributes<HTMLSelectElement> {
  as: "select";
  children: React.ReactNode;
}

interface FormFieldTextareaProps extends BaseFormFieldProps, React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  as: "textarea";
  children?: undefined;
}

type FormFieldProps = FormFieldInputProps | FormFieldSelectProps | FormFieldTextareaProps;

export const FormField = forwardRef<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement, FormFieldProps>(
  ({ label, error, helperText, className, id, name, as = "input", children, ...props }, ref) => {
    const inputId = id || name;
    const errorId = error ? `${inputId}-error` : undefined;
    const helperId = helperText && !error ? `${inputId}-helper` : undefined;
    const describedBy = [errorId, helperId].filter(Boolean).join(" ") || undefined;

    const sharedLabel = (
      <label htmlFor={inputId} className="block text-sm font-medium text-foreground">
        {label}
      </label>
    );

    const sharedError = error && (
      <p id={errorId} className="text-xs text-danger" role="alert">
        {error}
      </p>
    );
    const sharedHelper = helperText && !error && (
      <p id={helperId} className="text-xs text-muted">
        {helperText}
      </p>
    );

    const errorBorder = error ? "border-danger/50 focus:ring-danger/20" : undefined;
    const disabledClass = "disabled" in props && props.disabled ? "opacity-50 cursor-not-allowed" : undefined;

    if (as === "select") {
      const selectProps = props as React.SelectHTMLAttributes<HTMLSelectElement>;
      return (
        <div className="space-y-1.5">
          {sharedLabel}
          <select
            ref={ref as React.Ref<HTMLSelectElement>}
            id={inputId}
            name={name}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            className={cn(
              "h-10 w-full rounded-md border border-border bg-background px-3 text-sm text-foreground focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
              errorBorder,
              disabledClass,
              className
            )}
            {...selectProps}
          >
            {children}
          </select>
          {sharedError}
          {sharedHelper}
        </div>
      );
    }

    if (as === "textarea") {
      const textareaProps = props as React.TextareaHTMLAttributes<HTMLTextAreaElement>;
      return (
        <div className="space-y-1.5">
          {sharedLabel}
          <textarea
            ref={ref as React.Ref<HTMLTextAreaElement>}
            id={inputId}
            name={name}
            aria-describedby={describedBy}
            aria-invalid={!!error}
            rows={textareaProps.rows ?? 4}
            className={cn(
              "w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
              errorBorder,
              disabledClass,
              className
            )}
            {...textareaProps}
          />
          {sharedError}
          {sharedHelper}
        </div>
      );
    }

    const inputProps = props as React.InputHTMLAttributes<HTMLInputElement>;
    return (
      <div className="space-y-1.5">
        {sharedLabel}
        <input
          ref={ref as React.Ref<HTMLInputElement>}
          id={inputId}
          name={name}
          aria-describedby={describedBy}
          aria-invalid={!!error}
          className={cn(
            "h-10 w-full rounded-md border bg-background px-3 text-sm text-foreground placeholder:text-muted focus:outline-none focus:ring-2 focus:ring-primary focus:border-transparent transition-all",
            errorBorder,
            "border-border",
            disabledClass,
            className
          )}
          {...inputProps}
        />
        {sharedError}
        {sharedHelper}
      </div>
    );
  }
);

FormField.displayName = "FormField";

export { FormSelect, FormTextarea };
