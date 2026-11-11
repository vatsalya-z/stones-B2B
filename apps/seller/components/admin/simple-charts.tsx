"use client";

import { useId, useState } from "react";
import { cn } from "@stone/ui";

// ---------------------------------------------------------------------------
// 1. Line / Area Chart
// ---------------------------------------------------------------------------

export interface LineChartPoint {
  label: string; // e.g. "2026-10-01" or "Oct 01"
  value: number;
}

export interface SvgLineAreaChartProps {
  title?: string;
  subtitle?: string;
  data: LineChartPoint[];
  height?: number;
  accent?: "amber" | "emerald" | "blue" | "purple";
  valueFormatter?: (v: number) => string;
}

export function SvgLineAreaChart({
  title,
  subtitle,
  data,
  height = 200,
  accent = "amber",
  valueFormatter = (v) => v.toLocaleString("en-IN"),
}: SvgLineAreaChartProps) {
  const gradientId = useId();
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        {title && <h3 className="text-sm font-semibold text-stone-200">{title}</h3>}
        <div className="flex h-40 items-center justify-center text-xs text-stone-500">
          No data available
        </div>
      </div>
    );
  }

  const values = data.map((d) => d.value);
  const maxValue = Math.max(...values, 1);
  const minValue = 0;
  const range = maxValue - minValue;

  const width = 600;
  const paddingX = 20;
  const paddingY = 25;
  const innerWidth = width - paddingX * 2;
  const innerHeight = height - paddingY * 2;

  const points = data.map((d, i) => {
    const x = paddingX + (i / Math.max(data.length - 1, 1)) * innerWidth;
    const y = paddingY + innerHeight - ((d.value - minValue) / range) * innerHeight;
    return { x, y, ...d };
  });

  const pathD = points.reduce((acc, p, i) => {
    return i === 0 ? `M ${p.x} ${p.y}` : `${acc} L ${p.x} ${p.y}`;
  }, "");

  const areaD = `${pathD} L ${points[points.length - 1]?.x} ${height - paddingY} L ${points[0]?.x} ${height - paddingY} Z`;

  const colors = {
    amber: {
      stroke: "#f59e0b",
      fillStart: "#f59e0b",
      dot: "bg-amber-400",
    },
    emerald: {
      stroke: "#10b981",
      fillStart: "#10b981",
      dot: "bg-emerald-400",
    },
    blue: {
      stroke: "#3b82f6",
      fillStart: "#3b82f6",
      dot: "bg-blue-400",
    },
    purple: {
      stroke: "#a855f7",
      fillStart: "#a855f7",
      dot: "bg-purple-400",
    },
  }[accent];

  const hoveredPoint = hoveredIdx !== null ? points[hoveredIdx] : null;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="text-sm font-semibold text-stone-200">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
        </div>
        {hoveredPoint ? (
          <div className="text-right">
            <span className="text-xs font-semibold text-white">
              {valueFormatter(hoveredPoint.value)}
            </span>
            <span className="ml-1 text-[11px] text-stone-400">({hoveredPoint.label})</span>
          </div>
        ) : (
          <div className="text-right text-xs text-stone-500">
            Peak: {valueFormatter(maxValue)}
          </div>
        )}
      </div>

      <div className="mt-4 relative w-full">
        <svg
          viewBox={`0 0 ${width} ${height}`}
          className="w-full h-auto overflow-visible"
          preserveAspectRatio="none"
        >
          <defs>
            <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={colors.fillStart} stopOpacity="0.28" />
              <stop offset="100%" stopColor={colors.fillStart} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* Horizontal grid lines */}
          {[0, 0.5, 1].map((pct) => {
            const y = paddingY + innerHeight * (1 - pct);
            return (
              <line
                key={pct}
                x1={paddingX}
                y1={y}
                x2={width - paddingX}
                y2={y}
                stroke="#292524"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
            );
          })}

          {/* Area fill */}
          <path d={areaD} fill={`url(#${gradientId})`} />

          {/* Line stroke */}
          <path
            d={pathD}
            fill="none"
            stroke={colors.stroke}
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Points & Interactive circles */}
          {points.map((p, i) => (
            <g key={i}>
              <circle
                cx={p.x}
                cy={p.y}
                r={hoveredIdx === i ? 5 : 2.5}
                fill={hoveredIdx === i ? "#ffffff" : colors.stroke}
                stroke="#1c1917"
                strokeWidth="1.5"
                className="transition-all"
              />
              {/* Invisible larger hover hit area */}
              <rect
                x={p.x - 12}
                y={0}
                width={24}
                height={height}
                fill="transparent"
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels (first, middle, last) */}
        <div className="mt-2 flex justify-between text-[11px] text-stone-500 font-mono">
          <span>{data[0]?.label}</span>
          {data.length > 2 && <span>{data[Math.floor(data.length / 2)]?.label}</span>}
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 2. Bar Chart
// ---------------------------------------------------------------------------

export interface SvgBarChartProps {
  title?: string;
  subtitle?: string;
  data: { label: string; value: number }[];
  height?: number;
  barColor?: string;
  valueFormatter?: (v: number) => string;
}

export function SvgBarChart({
  title,
  subtitle,
  data,
  height = 180,
  barColor = "fill-amber-500",
  valueFormatter = (v) => v.toLocaleString("en-IN"),
}: SvgBarChartProps) {
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  if (!data || data.length === 0) {
    return (
      <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
        {title && <h3 className="text-sm font-semibold text-stone-200">{title}</h3>}
        <div className="flex h-36 items-center justify-center text-xs text-stone-500">
          No data
        </div>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((d) => d.value), 1);
  const width = 500;
  const paddingX = 15;
  const paddingY = 20;
  const barWidth = Math.max(4, Math.min(24, (width - paddingX * 2) / data.length - 6));
  const innerHeight = height - paddingY * 2;

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div className="flex items-start justify-between">
        <div>
          {title && <h3 className="text-sm font-semibold text-stone-200">{title}</h3>}
          {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
        </div>
        {hoveredIdx !== null && (
          <div className="text-xs text-stone-300">
            <span className="font-semibold text-white">
              {valueFormatter(data[hoveredIdx]?.value ?? 0)}
            </span>{" "}
            ({data[hoveredIdx]?.label})
          </div>
        )}
      </div>

      <div className="mt-4">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto" preserveAspectRatio="none">
          {data.map((item, i) => {
            const barHeight = (item.value / maxValue) * innerHeight;
            const x =
              paddingX +
              (i / Math.max(data.length, 1)) * (width - paddingX * 2) +
              (width - paddingX * 2) / (data.length * 2) -
              barWidth / 2;
            const y = paddingY + innerHeight - barHeight;

            return (
              <g
                key={i}
                className="cursor-pointer"
                onMouseEnter={() => setHoveredIdx(i)}
                onMouseLeave={() => setHoveredIdx(null)}
              >
                <rect
                  x={x}
                  y={y}
                  width={barWidth}
                  height={barHeight}
                  rx="3"
                  className={cn(
                    barColor,
                    hoveredIdx === i ? "opacity-100" : "opacity-80 hover:opacity-100",
                    "transition-opacity",
                  )}
                />
              </g>
            );
          })}
        </svg>

        <div className="mt-1 flex justify-between text-[11px] text-stone-500 font-mono">
          <span>{data[0]?.label}</span>
          <span>{data[data.length - 1]?.label}</span>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// 3. Donut / Distribution Chart
// ---------------------------------------------------------------------------

export interface DonutSegment {
  label: string;
  total: number;
  color?: string;
}

export interface SvgDonutChartProps {
  title: string;
  subtitle?: string;
  data: DonutSegment[];
  totalLabel?: string;
}

const DEFAULT_DONUT_COLORS = [
  "#f59e0b", // amber
  "#10b981", // emerald
  "#3b82f6", // blue
  "#8b5cf6", // purple
  "#ec4899", // pink
  "#64748b", // slate
  "#e11d48", // rose
  "#06b6d4", // cyan
];

export function SvgDonutChart({
  title,
  subtitle,
  data,
  totalLabel = "Total",
}: SvgDonutChartProps) {
  const sum = data.reduce((acc, curr) => acc + curr.total, 0);

  // SVG parameters
  const size = 160;
  const strokeWidth = 18;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulated = 0;
  const segments = data.map((item, idx) => {
    const fraction = sum > 0 ? item.total / sum : 0;
    const strokeDasharray = `${fraction * circumference} ${circumference}`;
    const strokeDashoffset = -accumulated * circumference;
    accumulated += fraction;
    return {
      ...item,
      color: item.color ?? DEFAULT_DONUT_COLORS[idx % DEFAULT_DONUT_COLORS.length],
      strokeDasharray,
      strokeDashoffset,
      fraction,
    };
  });

  return (
    <div className="rounded-xl border border-stone-800 bg-stone-900/60 p-5">
      <div>
        <h3 className="text-sm font-semibold text-stone-200">{title}</h3>
        {subtitle && <p className="mt-0.5 text-xs text-stone-400">{subtitle}</p>}
      </div>

      <div className="mt-4 flex flex-col items-center sm:flex-row sm:items-center sm:justify-between gap-4">
        {/* Donut SVG */}
        <div className="relative flex items-center justify-center" style={{ width: size, height: size }}>
          <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="-rotate-90">
            {/* Background ring */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              fill="transparent"
              stroke="#292524"
              strokeWidth={strokeWidth}
            />
            {/* Value arcs */}
            {segments.map((seg, i) => (
              <circle
                key={i}
                cx={size / 2}
                cy={size / 2}
                r={radius}
                fill="transparent"
                stroke={seg.color}
                strokeWidth={strokeWidth}
                strokeDasharray={seg.strokeDasharray}
                strokeDashoffset={seg.strokeDashoffset}
                strokeLinecap="round"
                className="transition-all duration-300"
              />
            ))}
          </svg>

          {/* Centered Total */}
          <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
            <span className="text-xl font-bold tracking-tight text-white">{sum.toLocaleString("en-IN")}</span>
            <span className="text-[10px] uppercase tracking-wider text-stone-400">{totalLabel}</span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex-1 space-y-2">
          {segments.map((seg, i) => (
            <div key={i} className="flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <span
                  className="h-2.5 w-2.5 rounded-full"
                  style={{ backgroundColor: seg.color }}
                />
                <span className="text-stone-300 capitalize">{seg.label.replace(/_/g, " ")}</span>
              </div>
              <div className="flex items-center gap-2 font-mono">
                <span className="font-medium text-stone-100">{seg.total.toLocaleString("en-IN")}</span>
                <span className="text-[11px] text-stone-500">
                  ({sum > 0 ? ((seg.total / sum) * 100).toFixed(0) : 0}%)
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

