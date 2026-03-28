"use client";

import Link from "next/link";
import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

function ProgressRing({
  progress,
  size = 80,
  strokeWidth = 6,
}: {
  progress: number;
  size?: number;
  strokeWidth?: number;
}) {
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const clampedProgress = Math.min(progress, 100);
  const offset = circumference - (clampedProgress / 100) * circumference;
  const isComplete = progress >= 100;

  return (
    <svg width={size} height={size} className="shrink-0 -rotate-90">
      {/* Background track */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke="currentColor"
        strokeWidth={strokeWidth}
        className="text-surface-hover"
      />
      {/* Progress arc */}
      <circle
        cx={size / 2}
        cy={size / 2}
        r={radius}
        fill="none"
        stroke={isComplete ? "#10B981" : "#FF8400"}
        strokeWidth={strokeWidth}
        strokeDasharray={circumference}
        strokeDashoffset={offset}
        strokeLinecap="round"
        className="transition-all duration-700 ease-out"
      />
    </svg>
  );
}

export function WeeklyGoalWidget() {
  const { data: stats, isLoading } = useStats();

  if (isLoading) {
    return <Skeleton className="h-[140px] rounded-xl" />;
  }

  const goal = stats?.weekly_goal;
  const progress = stats?.weekly_progress ?? 0;
  const streak = stats?.weekly_streak ?? 0;

  if (!goal || goal <= 0) {
    return (
      <div className="flex flex-col items-center justify-center gap-3 rounded-xl bg-card border border-border-subtle p-5 h-full">
        <p className="text-sm text-text-muted text-center">
          Set a weekly application goal to track your consistency.
        </p>
        <Link
          href="/settings"
          className="text-sm font-medium text-brand hover:underline"
        >
          Set a goal
        </Link>
      </div>
    );
  }

  const percentage = Math.round((progress / goal) * 100);

  return (
    <div className="flex flex-col gap-4 rounded-xl bg-card border border-border-subtle p-5">
      <span className="text-sm font-semibold text-text-primary">
        Weekly Goal
      </span>

      <div className="flex items-center gap-5">
        <div className="relative">
          <ProgressRing progress={percentage} />
          <div className="absolute inset-0 flex items-center justify-center">
            <span className="text-lg font-bold text-text-primary">
              {percentage}%
            </span>
          </div>
        </div>

        <div className="flex flex-col gap-1">
          <span className="text-[22px] font-bold text-text-primary leading-tight">
            {progress}
            <span className="text-text-muted font-normal text-base">
              /{goal}
            </span>
          </span>
          <span className="text-xs text-text-muted">applications this week</span>

          {streak > 0 && (
            <div className="flex items-center gap-1 mt-1">
              <span className="text-sm">&#128293;</span>
              <span className="text-xs font-medium text-text-primary">
                {streak}-week streak
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
