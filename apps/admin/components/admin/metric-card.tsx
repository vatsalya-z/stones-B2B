import Link from "next/link";
import type { ReactNode } from "react";
import { cn } from "@stone/ui";

export interface MetricCardProps {
  title: string;
  value: string | number;
  deltaText?: string;
  deltaType?: "positive" | "negative" | "neutral";
  subtitle?: string;
  icon?: ReactNode;
  href?: string;
  accent?: "amber" | "emerald" | "blue" | "rose" | "purple" | "stone";
}

export function MetricCard({
  title,
  value,
  deltaText,
  deltaType = "neutral",
  subtitle,
  icon,
  href,
  accent = "stone",
}: MetricCardProps) {
  const accentBorder: Record<string, string> = {
    amber: "hover:border-amber-500/50",
    emerald: "hover:border-emerald-500/50",
    blue: "hover:border-blue-500/50",
    rose: "hover:border-rose-500/50",
    purple: "hover:border-purple-500/50",
    stone: "hover:border-stone-600",
  };

  const iconBg: Record<string, string> = {
    amber: "bg-amber-500/10 text-amber-400",
    emerald: "bg-emerald-500/10 text-emerald-400",
    blue: "bg-blue-500/10 text-blue-400",
    rose: "bg-rose-500/10 text-rose-400",
    purple: "bg-purple-500/10 text-purple-400",
    stone: "bg-stone-800 text-stone-300",
  };

  const content = (
    <div
      className={cn(
        "relative rounded-xl border border-stone-800 bg-stone-900/80 p-5 backdrop-blur-sm transition-all duration-150",
        href ? `cursor-pointer ${accentBorder[accent]}` : "",
      )}
    >
      <div className="flex items-start justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-stone-400">{title}</p>
          <p className="mt-2 text-2xl font-bold tracking-tight text-white">{value}</p>
        </div>
        {icon && (
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-lg", iconBg[accent])}>
            {icon}
          </div>
        )}
      </div>

      {(deltaText || subtitle) && (
        <div className="mt-3 flex items-center gap-2 text-xs">
          {deltaText && (
            <span
              className={cn(
                "font-medium",
                deltaType === "positive" && "text-emerald-400",
                deltaType === "negative" && "text-rose-400",
                deltaType === "neutral" && "text-stone-400",
              )}
            >
              {deltaText}
            </span>
          )}
          {subtitle && <span className="text-stone-500">{subtitle}</span>}
        </div>
      )}
    </div>
  );

  if (href) {
    return <Link href={href} className="block">{content}</Link>;
  }

  return content;
}

