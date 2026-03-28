"use client";

import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

export function StageFunnel() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return <Skeleton className="h-full min-h-[200px] rounded-xl" />;
  }

  const funnel = stats?.stage_funnel;

  if (!funnel || funnel.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-card border border-border-subtle p-5 h-full">
        <p className="text-sm text-text-muted">No stage data yet</p>
      </div>
    );
  }

  const maxCount = Math.max(...funnel.map((s) => s.count ?? 0), 1);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
      <span className="text-sm font-semibold text-text-primary">
        Pipeline Funnel
      </span>

      <div className="flex flex-col gap-2.5">
        {funnel.map((stage) => {
          const count = stage.count ?? 0;
          const width = Math.max((count / maxCount) * 100, 4);
          const color = stage.color || "#6B7280";

          return (
            <div key={stage.name} className="flex items-center gap-3">
              <span className="text-xs text-text-muted w-24 truncate text-right">
                {stage.name}
              </span>
              <div className="flex-1 h-6 bg-surface-hover rounded-md overflow-hidden">
                <div
                  className="h-full rounded-md transition-all duration-500 ease-out flex items-center px-2"
                  style={{ width: `${width}%`, backgroundColor: color }}
                >
                  {count > 0 && (
                    <span className="text-[11px] font-semibold text-white drop-shadow-sm">
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
