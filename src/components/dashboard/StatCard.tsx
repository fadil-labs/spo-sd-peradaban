"use client";

import React from "react";
import { Receipt, Users, FileCheck, CreditCard } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string;
  subtitle?: string;
  icon: "Receipt" | "Users" | "FileCheck" | "CreditCard";
  colorVariant?: "green" | "yellow" | "blue" | "teal";
  trend?: {
    value: string;
    positive: boolean;
  };
  accent?: boolean;
}

const iconMap = {
  Receipt,
  Users,
  FileCheck,
  CreditCard,
};

const colorStyles = {
  green: {
    bgIcon: "bg-[#0C3B2E]/10 text-[#0C3B2E]",
    trendText: "text-[#0C3B2E]",
    stroke: "#0C3B2E",
  },
  yellow: {
    bgIcon: "bg-[#C28E38]/15 text-[#C28E38]",
    trendText: "text-[#C28E38]",
    stroke: "#C28E38",
  },
  blue: {
    bgIcon: "bg-blue-500/10 text-blue-600",
    trendText: "text-blue-600",
    stroke: "#2563EB",
  },
  teal: {
    bgIcon: "bg-teal-500/10 text-teal-600",
    trendText: "text-teal-600",
    stroke: "#0D9488",
  },
};

export function StatCard({
  title,
  value,
  subtitle,
  icon,
  colorVariant = "green",
  trend,
  accent = false,
}: StatCardProps) {
  const IconComponent = iconMap[icon] || Receipt;
  const style = colorStyles[colorVariant];

  return (
    <div
      className={`rounded-[20px] border border-[#E5E0D8] bg-white p-4 sm:p-5 shadow-[0_2px_10px_rgba(0,0,0,0.02)] transition-all hover:shadow-md h-full flex flex-col justify-between ${
        accent ? "border-l-4 border-l-[#0C3B2E]" : ""
      }`}
    >
      {/* Baris Atas: Icon & Sparkline / Trend */}
      <div className="flex items-start justify-between mb-3">
        <div className={`p-2.5 rounded-xl ${style.bgIcon}`}>
          <IconComponent className="h-5 w-5 stroke-[2.2]" />
        </div>

        <div className="flex items-center gap-2">
          {/* Sparkline Graphic Mini */}
          <svg className="w-12 h-6" viewBox="0 0 50 20" fill="none">
            <path
              d={
                trend?.positive ?? true
                  ? "M2 16 Q 15 4, 25 12 T 48 4"
                  : "M2 4 Q 15 16, 25 8 T 48 16"
              }
              fill="none"
              stroke={style.stroke}
              strokeWidth="2.5"
              strokeLinecap="round"
            />
          </svg>

          {trend && (
            <span
              className={`text-xs font-bold flex items-center gap-0.5 ${style.trendText}`}
            >
              {trend.positive ? "↗" : "↘"} {trend.value}
            </span>
          )}
        </div>
      </div>

      {/* Baris Bawah: Titile, Value, Subtitle */}
      <div>
        <p className="text-xs font-medium text-[#7A7A7A] mb-0.5">{title}</p>
        <h3 className="text-xl sm:text-2xl font-extrabold text-[#1A1A1A] tracking-tight">
          {value}
        </h3>
        {subtitle && (
          <p className="text-[11px] font-medium text-[#A0A0A0] mt-1">
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}