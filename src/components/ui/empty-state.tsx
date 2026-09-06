"use client";

import React, { type ComponentType } from "react";
import { FadeIn } from "@/components/animations/FadeIn";

export function EmptyState({
  title,
  description,
  action,
  icon: Icon,
}: {
  title: string;
  description: string;
  action?: React.ReactNode;
  icon?: React.ReactNode | ComponentType<{ className?: string }>;
}) {
  const iconContent =
    typeof Icon === "function" && !React.isValidElement(Icon)
      ? React.createElement(Icon as ComponentType<{ className?: string }>, { className: "h-6 w-6" })
      : Icon;

  return (
    <FadeIn>
      <div className="flex flex-col items-center justify-center rounded-2xl border border-border bg-surface p-8 text-center">
        <div className="flex h-12 w-12 items-center justify-center rounded-full bg-muted/10 text-muted mb-3">
          {iconContent}
        </div>
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted mt-1 max-w-sm">{description}</p>
        {action && <div className="mt-4">{action}</div>}
      </div>
    </FadeIn>
  );
}
