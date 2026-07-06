"use client";

import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  icon: LucideIcon;
  variant?: "gradient" | "white";
  badge?: {
    label: string;
    type: "positive" | "negative" | "neutral";
  };
  subtitle?: string;
}

export function StatCard({
  title,
  value,
  icon: Icon,
  variant = "white",
  badge,
  subtitle,
}: StatCardProps) {
  const isGradient = variant === "gradient";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl p-6 transition-all duration-300",
        "hover:shadow-lg hover:-translate-y-0.5",
        isGradient
          ? "gradient-card text-white shadow-lg shadow-brand-600/20"
          : "bg-surface-card border border-border-subtle shadow-sm"
      )}
    >
      {/* Background decoration for gradient card */}
      {isGradient && (
        <div className="absolute -right-8 -top-8 h-32 w-32 rounded-full bg-white/5" />
      )}

      <div className="relative">
        {/* Top row: icon + badge */}
        <div className="flex items-start justify-between mb-4">
          <div
            className={cn(
              "flex h-11 w-11 items-center justify-center rounded-xl",
              isGradient ? "bg-white/15" : "bg-brand-50"
            )}
          >
            <Icon
              className={cn(
                "h-5 w-5",
                isGradient ? "text-white" : "text-brand-600"
              )}
            />
          </div>

          {badge && (
            <span
              className={cn(
                "rounded-full px-2.5 py-1 text-xs font-semibold",
                isGradient
                  ? "bg-white/20 text-white"
                  : badge.type === "positive"
                  ? "bg-green-100 text-green-700"
                  : badge.type === "negative"
                  ? "bg-red-100 text-red-700"
                  : "bg-slate-100 text-slate-600"
              )}
            >
              {badge.label}
            </span>
          )}
        </div>

        {/* Label */}
        <p
          className={cn(
            "text-[13px] font-semibold uppercase tracking-wider mb-1",
            isGradient ? "text-blue-100" : "text-text-secondary"
          )}
        >
          {title}
        </p>

        {/* Value */}
        <p
          className={cn(
            "text-3xl font-bold tracking-tight",
            isGradient ? "text-white" : "text-text-primary"
          )}
        >
          {value}
        </p>

        {/* Subtitle */}
        {subtitle && (
          <p
            className={cn(
              "text-sm mt-1",
              isGradient ? "text-blue-200" : "text-text-secondary"
            )}
          >
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
