"use client";

import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

export function StageFunnel() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return <Skeleton className="h-[220px] rounded-xl" />;
  }

  const funnel = stats?.stage_funnel;

  if (!funnel || funnel.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-card border border-border-subtle p-5 h-[220px]">
        <p className="text-sm text-text-muted">No pipeline data yet</p>
      </div>
    );
  }

  // Only show stages that have jobs — no empty rows
  const activeStages = funnel.filter((s) => (s.count ?? 0) > 0);
  const maxCount = Math.max(...activeStages.map((s) => s.count ?? 0), 1);
  const totalCount = activeStages.reduce((sum, s) => sum + (s.count ?? 0), 0);

  return (
    <div className="flex flex-col gap-5 rounded-xl bg-card border border-border-subtle p-5">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">
          Your Pipeline
        </span>
        <span className="text-xs text-text-muted tabular-nums">
          {totalCount} total
        </span>
      </div>

      <div className="flex flex-col gap-3">
        {activeStages.map((stage, i) => {
          const count = stage.count ?? 0;
          const width = count > 0 ? Math.max((count / maxCount) * 100, 6) : 0;
          const color = stage.color || "#6B7280";

          return (
            <div
              key={stage.name}
              className="flex items-center gap-3"
              style={{
                animationDelay: `${i * 80}ms`,
              }}
            >
              <span className="text-xs text-text-muted w-24 truncate text-right">
                {stage.name}
              </span>
              <div className="flex-1 h-8 bg-surface-hover rounded-lg overflow-hidden">
                <div
                  className="h-full rounded-lg transition-all duration-700 ease-out flex items-center px-3"
                  style={{ width: `${width}%`, backgroundColor: color }}
                >
                  {count > 0 && (
                    <span className="text-xs font-semibold text-white drop-shadow-sm">
                      {count}
                    </span>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
