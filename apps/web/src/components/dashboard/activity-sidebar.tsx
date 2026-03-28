"use client";

import { useStats } from "@/hooks/use-stats";
import { useJobs } from "@/hooks/use-jobs";
import { useMemo } from "react";
import { CalendarIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24) return `${diffHours} hour${diffHours > 1 ? "s" : ""} ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays} days ago`;
  return date.toLocaleDateString();
}

function formatUpcomingTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0) return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (diffDays === 1) return `Tomorrow, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

const activityDotColors: Record<string, string> = {
  applied: "#2A85FF",
  interviewing: "#83BF6E",
  screening: "#8E59FF",
  offer: "#FF8400",
  saved: "#8B8FA3",
  "yet to apply": "#8B8FA3",
};

export function ActivitySidebar() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: jobsData, isLoading: jobsLoading } = useJobs();

  const byStatus = stats?.by_status ?? {};
  const appliedCount = byStatus["applied"] ?? byStatus["Applied"] ?? 0;
  const interviewCount =
    (byStatus["interviewing"] ?? byStatus["Interviewing"] ?? 0) +
    (byStatus["screening"] ?? byStatus["Screening"] ?? 0);
  const offerCount = byStatus["offer"] ?? byStatus["Offer"] ?? 0;

  const recentActivity = useMemo(() => {
    if (!jobsData?.data) return [];
    return [...jobsData.data]
      .sort(
        (a, b) =>
          new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
      )
      .slice(0, 4)
      .map((job) => {
        const stageName = job.stage_name?.toLowerCase() ?? "applied";
        const action =
          stageName === "saved" || stageName === "yet to apply"
            ? `Saved ${job.title} at ${job.company_name ?? "Unknown"}`
            : stageName === "interviewing"
              ? `Interview scheduled with ${job.company_name ?? "Unknown"}`
              : `Applied to ${job.title} at ${job.company_name ?? "Unknown"}`;
        return {
          id: job.id,
          text: action,
          time: formatRelativeTime(job.updated_at),
          dotColor: activityDotColors[stageName] ?? "#8B8FA3",
        };
      });
  }, [jobsData]);

  const upcoming = useMemo(() => {
    if (!jobsData?.data) return [];
    const now = new Date();
    return jobsData.data
      .filter((job) => job.follow_up_at && new Date(job.follow_up_at) > now)
      .sort(
        (a, b) =>
          new Date(a.follow_up_at!).getTime() -
          new Date(b.follow_up_at!).getTime()
      )
      .slice(0, 2)
      .map((job) => ({
        id: job.id,
        title: `${job.company_name ?? "Unknown"} — Follow-up`,
        time: formatUpcomingTime(job.follow_up_at!),
        color: "#FF8400",
      }));
  }, [jobsData]);

  if (statsLoading || jobsLoading) {
    return (
      <div className="flex flex-col gap-6 border-l border-border-subtle p-6 w-[380px] shrink-0">
        <Skeleton className="h-5 w-20" />
        <div className="flex gap-3">
          {Array.from({ length: 3 }).map((_, i) => (
            <Skeleton key={i} className="flex-1 h-16 rounded-xl" />
          ))}
        </div>
        <Skeleton className="h-48 w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 border-l border-border-subtle p-6 w-[380px] shrink-0 bg-background">
      {/* Panel Header */}
      <span className="text-base font-semibold text-text-primary">Activity</span>

      {/* Quick Stats */}
      <div className="flex gap-3">
        <div className="flex-1 flex flex-col gap-1 rounded-xl bg-surface p-4">
          <span className="text-2xl font-bold text-text-primary">
            {appliedCount}
          </span>
          <span className="text-xs text-text-muted">Applied</span>
        </div>
        <div className="flex-1 flex flex-col gap-1 rounded-xl bg-surface p-4">
          <span className="text-2xl font-bold text-text-primary">
            {interviewCount}
          </span>
          <span className="text-xs text-text-muted">Interviews</span>
        </div>
        <div className="flex-1 flex flex-col gap-1 rounded-xl bg-surface p-4">
          <span className="text-2xl font-bold text-brand-green">
            {offerCount}
          </span>
          <span className="text-xs text-text-muted">Offers</span>
        </div>
      </div>

      {/* Recent Activity */}
      <div className="flex flex-col gap-4 flex-1 min-h-0 overflow-hidden">
        <div className="flex items-center">
          <span className="flex-1 text-[13px] font-semibold text-text-muted">
            Recent
          </span>
          <span className="text-xs font-medium text-brand cursor-pointer hover:underline">
            View all
          </span>
        </div>
        <div className="flex flex-col">
          {recentActivity.length === 0 ? (
            <p className="text-[13px] text-text-muted py-3">
              No recent activity.
            </p>
          ) : (
            recentActivity.map((item) => (
              <div
                key={item.id}
                className="flex gap-3 py-3"
              >
                <div
                  className="w-2 h-2 rounded-full mt-1.5 shrink-0"
                  style={{ backgroundColor: item.dotColor }}
                />
                <div className="flex flex-col gap-0.5 min-w-0">
                  <span className="text-[13px] text-text-primary leading-snug">
                    {item.text}
                  </span>
                  <span className="text-[11px] text-text-muted">
                    {item.time}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Upcoming */}
      <div className="flex flex-col gap-3">
        <span className="text-[13px] font-semibold text-text-muted">
          Upcoming
        </span>
        {upcoming.length === 0 ? (
          <p className="text-[13px] text-text-muted rounded-xl bg-surface p-3">
            No upcoming events.
          </p>
        ) : (
          upcoming.map((item) => (
            <div
              key={item.id}
              className="flex items-center gap-3 rounded-xl bg-surface p-3"
            >
              <CalendarIcon
                className="w-4 h-4 shrink-0"
                style={{ color: item.color }}
              />
              <div className="flex flex-col gap-0.5 min-w-0">
                <span className="text-[13px] font-medium text-text-primary">
                  {item.title}
                </span>
                <span className="text-[11px] text-text-muted">
                  {item.time}
                </span>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
