"use client";

import { type LucideIcon, Users, Receipt, CreditCard, FileCheck, BarChart3, Bell } from "lucide-react";
import { motion } from "motion/react";

const iconMap: Record<string, LucideIcon> = {
  Users,
  Receipt,
  CreditCard,
  FileCheck,
  BarChart3,
  Bell,
};

export type QuickAction = {
  label: string;
  href: string;
  icon: string;
};

export function QuickActions({ title, actions }: { title: string; actions: QuickAction[] }) {
  if (actions.length === 0) return null;

  return (
    <div className="rounded-2xl border border-border bg-white p-4 shadow-sm">
      <h3 className="text-sm font-semibold text-foreground mb-2">{title}</h3>
      <div className="grid grid-cols-4 gap-2.5">
        {actions.map((action) => {
          const Icon = iconMap[action.icon] || Receipt;
          return (
            <motion.a
              key={action.href}
              href={action.href}
              whileHover={{ y: -2 }}
              transition={{ type: "spring", stiffness: 300, damping: 20 }}
              className="flex flex-col items-center justify-center gap-1.5 rounded-xl border border-border bg-surface/50 p-2.5 text-center transition-all hover:shadow-md active:scale-[0.98]"
            >
              <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <Icon className="h-4 w-4" />
              </div>
              <span className="text-[11px] font-medium text-foreground leading-tight">{action.label}</span>
            </motion.a>
          );
        })}
      </div>
    </div>
  );
}
