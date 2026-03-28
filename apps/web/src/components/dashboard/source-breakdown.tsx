"use client";

import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

const SOURCE_COLORS = [
  "#FF8400",
  "#3B82F6",
  "#10B981",
  "#8B5CF6",
  "#F59E0B",
  "#EF4444",
  "#06B6D4",
  "#EC4899",
];

function formatSourceName(source: string): string {
  if (source === "unknown") return "Unknown";
  return source
    .split(/[_-]/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
    .join(" ");
}

export function SourceBreakdown() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return <Skeleton className="h-full min-h-[200px] rounded-xl" />;
  }

  const sources = stats?.source_breakdown;

  if (!sources || sources.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-card border border-border-subtle p-5 h-full">
        <p className="text-sm text-text-muted">No source data yet</p>
      </div>
    );
  }

  const total = sources.reduce((sum, s) => sum + (s.count ?? 0), 0);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
      <span className="text-sm font-semibold text-text-primary">
        Application Sources
      </span>

      <div className="flex flex-col gap-3">
        {sources.slice(0, 6).map((source, i) => {
          const count = source.count ?? 0;
          const pct = total > 0 ? Math.round((count / total) * 100) : 0;
          const color = SOURCE_COLORS[i % SOURCE_COLORS.length];

          return (
            <div key={source.source} className="flex items-center gap-3">
              <div
                className="size-2.5 rounded-full shrink-0"
                style={{ backgroundColor: color }}
              />
              <span className="text-xs text-text-primary flex-1 truncate">
                {formatSourceName(source.source ?? "unknown")}
              </span>
              <span className="text-xs font-medium text-text-muted tabular-nums">
                {count}
              </span>
              <span className="text-xs text-text-muted w-10 text-right tabular-nums">
                {pct}%
              </span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
