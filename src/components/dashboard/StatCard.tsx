"use client";

import { type LucideIcon, Users, Receipt, CreditCard, FileCheck, BarChart3 } from "lucide-react";
import { motion } from "motion/react";

const iconMap: Record<string, LucideIcon> = {
  Users,
  Receipt,
  CreditCard,
  FileCheck,
  BarChart3,
};

const colorMap: Record<string, { bg: string; text: string; iconBg: string }> = {
  green: { bg: "bg-white", text: "text-emerald-600", iconBg: "bg-emerald-600" },
  yellow: { bg: "bg-white", text: "text-amber-600", iconBg: "bg-amber-500" },
  blue: { bg: "bg-white", text: "text-sky-600", iconBg: "bg-sky-500" },
  teal: { bg: "bg-white", text: "text-teal-600", iconBg: "bg-teal-600" },
};

export type StatItem = {
  title: string;
  value: string;
  subtitle: string;
  icon: string;
  trend?: {
    value: string;
    positive: boolean;
  };
  href?: string;
  accent?: boolean;
  colorVariant?: "green" | "yellow" | "blue" | "teal";
};

export function StatCard({ title, value, subtitle, icon, trend, href, accent, colorVariant = "green" }: StatItem) {
  const Icon = iconMap[icon] || Receipt;
  const colors = colorMap[colorVariant] || colorMap.green;
  const Card = href ? motion.a : motion.div;

  return (
    <Card
      href={href}
      whileHover={{ y: -4 }}
      transition={{ type: "spring", stiffness: 300, damping: 20 }}
      className={[
        "group relative overflow-hidden rounded-2xl border border-border bg-white p-5 shadow-sm transition-all hover:shadow-lg",
        accent ? "border-l-4 border-l-gold" : "",
      ].join(" ")}
    >
      <div className="flex items-start justify-between">
        <div className={`flex h-12 w-12 items-center justify-center rounded-xl ${colors.iconBg} text-white shadow-sm`}>
          <Icon className="h-6 w-6" />
        </div>
        {trend && (
          <div className="flex items-center gap-1 text-xs font-medium text-emerald-600">
            <svg className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
            </svg>
            <span>{trend.value}</span>
          </div>
        )}
      </div>
      <div className="mt-4">
        <p className="text-xs text-muted font-medium">{title}</p>
        <p className="text-2xl font-bold text-foreground tracking-tight mt-1">{value}</p>
        <p className="text-xs text-muted mt-1">{subtitle}</p>
      </div>
    </Card>
  );
}
