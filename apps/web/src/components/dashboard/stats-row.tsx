"use client";

import { useStats } from "@/hooks/use-stats";
import { useJobs } from "@/hooks/use-jobs";
import { useStages } from "@/hooks/use-stages";
import { useMemo } from "react";
import { Skeleton } from "@/components/ui/skeleton";

function StatCard({
  label,
  value,
  change,
  changeColor = "#83BF6E",
}: {
  label: string;
  value: string;
  change?: string;
  changeColor?: string;
}) {
  return (
    <div className="flex-1 flex flex-col gap-2 rounded-xl bg-card border border-border-subtle p-5">
      <span className="text-[13px] font-medium text-text-muted">{label}</span>
      <div className="flex items-end gap-2">
        <span className="text-[28px] font-bold leading-none text-text-primary">
          {value}
        </span>
        {change && (
          <span className="text-xs font-medium" style={{ color: changeColor }}>
            {change}
          </span>
        )}
      </div>
    </div>
  );
}

export function StatsRow() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: jobsData, isLoading: jobsLoading } = useJobs();
  const { data: stages } = useStages();

  const responseRate = useMemo(() => {
    if (!jobsData?.data || !stages || jobsData.data.length === 0) return null;

    const terminalStageNames = new Set(
      stages
        .filter((s) => s.mapped_status && s.mapped_status !== "open")
        .map((s) => s.name.toLowerCase())
    );
    const advancedStageNames = new Set(
      stages
        .filter((s) => s.position > 1)
        .map((s) => s.name.toLowerCase())
    );

    const responded = jobsData.data.filter((job) => {
      const stageName = job.stage_name?.toLowerCase();
      return (
        stageName &&
        (advancedStageNames.has(stageName) || terminalStageNames.has(stageName))
      );
    });

    const rate = Math.round((responded.length / jobsData.data.length) * 100);
    return `${rate}%`;
  }, [jobsData, stages]);

  if (statsLoading || jobsLoading) {
    return (
      <div className="flex gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Skeleton key={i} className="flex-1 h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-4">
      <StatCard
        label="Total Applications"
        value={String(stats?.total_jobs ?? 0)}
      />
      <StatCard
        label="Response Rate"
        value={responseRate ?? "--"}
      />
      <StatCard
        label="Active Interviews"
        value={String(stats?.by_status?.["interviewing"] ?? 0)}
      />
      <StatCard
        label="Follow-ups Due"
        value={String(stats?.follow_ups_due ?? 0)}
      />
    </div>
  );
}
