"use client";

import Image from "next/image";
import Link from "next/link";
import { useMemo } from "react";
import { ActionStrip } from "@/components/dashboard/action-strip";
import { StageFunnel } from "@/components/dashboard/stage-funnel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { authClient } from "@/lib/auth-client";
import { useJobs } from "@/hooks/use-jobs";
import { ClockIcon } from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

function formatDeadline(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays < 0) return "Overdue";
  if (diffDays === 0) return "Today";
  if (diffDays === 1) return "Tomorrow";
  if (diffDays <= 7) return `${diffDays} days left`;
  return date.toLocaleDateString(undefined, { month: "short", day: "numeric" });
}

function getUrgencyColor(dateStr: string): string {
  const diffDays = Math.floor(
    (new Date(dateStr).getTime() - Date.now()) / 86400000
  );
  if (diffDays < 0) return "text-red-500";
  if (diffDays <= 3) return "text-amber-500";
  return "text-text-muted";
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const { data: jobsData, isLoading } = useJobs({
    sortBy: "deadline",
    sortOrder: "asc",
    perPage: 25,
  });
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  const deadlines = useMemo(() => {
    if (!jobsData?.data) return [];
    const now = new Date();
    // Show deadlines within the next 30 days (and overdue ones from the last 7 days)
    const cutoffPast = new Date(now.getTime() - 7 * 86400000);
    return jobsData.data
      .filter(
        (job) =>
          job.deadline &&
          new Date(job.deadline) > cutoffPast &&
          new Date(job.deadline) < new Date(now.getTime() + 30 * 86400000)
      )
      .sort(
        (a, b) =>
          new Date(a.deadline!).getTime() - new Date(b.deadline!).getTime()
      )
      .slice(0, 3)
      .map((job) => ({
        id: job.id,
        title: job.title,
        company: job.company_name ?? "Unknown",
        deadline: job.deadline!,
      }));
  }, [jobsData]);

  return (
    <div className="h-full overflow-y-auto">
      <div className="flex flex-col gap-6 sm:gap-8 p-4 sm:p-8 max-w-[960px] mx-auto">
        {/* Hero Header */}
        <div className="flex items-start justify-between gap-6">
          <div className="flex flex-col gap-4">
            <div>
              <h1
                className="text-2xl sm:text-4xl font-bold text-text-primary tracking-tight"
                style={{ letterSpacing: -1 }}
              >
                Dashboard
              </h1>
              <p className="text-sm text-text-muted mt-1.5">
                Welcome back, {firstName}. Here&apos;s your job search overview.
              </p>
            </div>

            {/* Upcoming deadlines */}
            {isLoading ? (
              <Skeleton className="h-5 w-48" />
            ) : deadlines.length > 0 ? (
              <div className="flex flex-col gap-1.5">
                {deadlines.map((d) => (
                  <Link
                    key={d.id}
                    href={`/applications?job=${d.id}`}
                    className="flex items-center gap-2 group"
                  >
                    <ClockIcon
                      className={`w-3.5 h-3.5 shrink-0 ${getUrgencyColor(d.deadline)}`}
                    />
                    <span className="text-xs text-text-muted group-hover:text-text-primary transition-colors truncate">
                      <span className="font-medium text-text-primary">
                        {d.company}
                      </span>
                      {" — "}
                      <span className={getUrgencyColor(d.deadline)}>
                        {formatDeadline(d.deadline)}
                      </span>
                    </span>
                  </Link>
                ))}
              </div>
            ) : null}
          </div>

          {/* Hero illustration */}
          <div className="hidden md:flex items-center justify-center w-48 h-32 shrink-0 rounded-2xl bg-white/80 dark:bg-white/90 p-3">
            <Image
              src="/dashboard-hero.svg"
              alt=""
              width={192}
              height={128}
              priority
              className="w-full h-full object-contain"
            />
          </div>
        </div>

        {/* Action Strip: Email Activity + Follow-ups */}
        <ActionStrip />

        {/* Pipeline Funnel */}
        <StageFunnel />

        {/* Recent Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}
