"use client";

import { useStats } from "@/hooks/use-stats";
import { useRef, useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { Skeleton } from "@/components/ui/skeleton";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";

function formatWeekLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

export function ResponseTrend() {
  const { data: stats, isLoading } = useStats();
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new ResizeObserver(([entry]) => {
      const { width, height } = entry.contentRect;
      if (width > 0 && height > 0) {
        setSize({ width, height });
      }
    });
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="flex-1 min-h-[160px] rounded-lg" />
      </div>
    );
  }

  const trend = stats?.response_trend;

  if (!trend || trend.length === 0) {
    return (
      <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
        <span className="text-sm font-semibold text-text-primary">
          Response Rate Trend
        </span>
        <div className="flex items-center justify-center min-h-[160px]">
          <p className="text-sm text-text-muted">
            Apply to jobs to see response trends
          </p>
        </div>
      </div>
    );
  }

  const chartData = trend.map((w) => ({
    week: w.week_start ?? "",
    rate: Math.round(w.rate ?? 0),
  }));

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
      <div className="flex items-center">
        <span className="flex-1 text-sm font-semibold text-text-primary">
          Response Rate Trend
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-surface px-2.5 py-1">
          <span className="text-[11px] font-medium text-text-muted">
            Last 8 weeks
          </span>
        </div>
      </div>

      <div ref={ref} className="flex-1 min-h-[160px]">
        {size.width > 0 && size.height > 0 && (
          <AreaChart width={size.width} height={size.height} data={chartData}>
            <defs>
              <linearGradient id="responseGradient" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3B82F6" stopOpacity={0.2} />
                <stop offset="95%" stopColor="#3B82F6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid
              strokeDasharray="3 3"
              stroke={isDark ? "#232638" : "#EBEBEF"}
              vertical={false}
            />
            <XAxis
              dataKey="week"
              tickFormatter={formatWeekLabel}
              tick={{ fontSize: 11, fill: isDark ? "#8B90A5" : "#8B8FA3" }}
              axisLine={false}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 11, fill: isDark ? "#8B90A5" : "#8B8FA3" }}
              axisLine={false}
              tickLine={false}
              width={30}
              domain={[0, 100]}
              tickFormatter={(v: number) => `${v}%`}
            />
            <Tooltip
              labelFormatter={(label) => formatWeekLabel(String(label))}
              formatter={(value) => [`${value}%`, "Response Rate"]}
              contentStyle={{
                borderRadius: 8,
                border: isDark ? "1px solid #232638" : "1px solid #EBEBEF",
                backgroundColor: isDark ? "#171923" : "#FFFFFF",
                color: isDark ? "#F0F1F5" : "#1A1A2E",
                fontSize: 13,
              }}
            />
            <Area
              type="monotone"
              dataKey="rate"
              stroke="#3B82F6"
              strokeWidth={2}
              fill="url(#responseGradient)"
              dot={false}
              activeDot={{ r: 4, fill: "#3B82F6" }}
            />
          </AreaChart>
        )}
      </div>
    </div>
  );
}
