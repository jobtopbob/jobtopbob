"use client";

import { useMemo } from "react";
import { useJobs } from "@/hooks/use-jobs";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import { useRef, useState, useEffect } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function getLast30DaysData(
  jobs: { created_at: string }[]
): { date: string; count: number }[] {
  const now = new Date();
  const days: { date: string; count: number }[] = [];

  for (let i = 29; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().slice(0, 10);
    days.push({ date: key, count: 0 });
  }

  const dateMap = new Map(days.map((d) => [d.date, d]));
  for (const job of jobs) {
    const key = new Date(job.created_at).toISOString().slice(0, 10);
    const entry = dateMap.get(key);
    if (entry) entry.count++;
  }

  // Accumulate for a cumulative line
  let total = 0;
  return days.map((d) => {
    total += d.count;
    return { date: d.date, count: total };
  });
}

function formatDateLabel(dateStr: string): string {
  const d = new Date(dateStr);
  return d.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function ChartContainer({
  chartData,
}: {
  chartData: { date: string; count: number }[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [size, setSize] = useState({ width: 0, height: 0 });

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

  return (
    <div ref={ref} className="flex-1 min-h-[180px]">
      {size.width > 0 && size.height > 0 && (
        <LineChart width={size.width} height={size.height} data={chartData}>
          <CartesianGrid
            strokeDasharray="3 3"
            stroke="#EBEBEF"
            vertical={false}
          />
          <XAxis
            dataKey="date"
            tickFormatter={formatDateLabel}
            tick={{ fontSize: 11, fill: "#8B8FA3" }}
            axisLine={false}
            tickLine={false}
            interval="preserveStartEnd"
          />
          <YAxis
            tick={{ fontSize: 11, fill: "#8B8FA3" }}
            axisLine={false}
            tickLine={false}
            width={30}
            allowDecimals={false}
          />
          <Tooltip
            labelFormatter={(label) => formatDateLabel(String(label))}
            contentStyle={{
              borderRadius: 8,
              border: "1px solid #EBEBEF",
              fontSize: 13,
            }}
          />
          <Line
            type="monotone"
            dataKey="count"
            stroke="#FF8400"
            strokeWidth={2}
            dot={false}
            activeDot={{ r: 4, fill: "#FF8400" }}
          />
        </LineChart>
      )}
    </div>
  );
}

export function ApplicationPipeline() {
  const { data: jobsData, isLoading } = useJobs();

  const chartData = useMemo(() => {
    if (!jobsData?.data) return [];
    return getLast30DaysData(jobsData.data);
  }, [jobsData]);

  if (isLoading) {
    return (
      <div className="flex-1 flex flex-col gap-4 rounded-xl bg-white border border-[#EBEBEF] p-5">
        <Skeleton className="h-5 w-40" />
        <Skeleton className="flex-1 min-h-[180px] rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col gap-4 rounded-xl bg-white border border-[#EBEBEF] p-5">
      {/* Header */}
      <div className="flex items-center">
        <span className="flex-1 text-sm font-semibold text-[#1A1A2E]">
          Application Pipeline
        </span>
        <div className="flex items-center gap-1 rounded-lg bg-[#F5F5F7] px-2.5 py-1">
          <span className="text-[11px] font-medium text-[#8B8FA3]">
            Last 30 days
          </span>
        </div>
      </div>

      {/* Chart */}
      <ChartContainer chartData={chartData} />
    </div>
  );
}
