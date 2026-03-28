"use client";

import Image from "next/image";
import { ActionStrip } from "@/components/dashboard/action-strip";
import { StageFunnel } from "@/components/dashboard/stage-funnel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { authClient } from "@/lib/auth-client";
import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const { data: stats, isLoading } = useStats();
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  // Derive interviewing count from the stage funnel (consistent with the pipeline widget).
  const funnel = stats?.stage_funnel ?? [];
  const interviewingCount = funnel
    .filter(
      (s) =>
        s.name?.toLowerCase() === "interviewing" ||
        s.name?.toLowerCase() === "screening"
    )
    .reduce((sum, s) => sum + (s.count ?? 0), 0);

  return (
    <div className="flex-1 overflow-y-auto">
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

            {/* Hero metrics */}
            {isLoading ? (
              <div className="flex gap-8">
                <Skeleton className="h-8 w-12" />
                <Skeleton className="h-8 w-12" />
              </div>
            ) : (
              <div className="flex gap-8 sm:gap-10">
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums tracking-tight">
                    {stats?.total_jobs ?? 0}
                  </span>
                  <span className="text-xs text-text-muted mt-0.5">
                    Total Jobs
                  </span>
                </div>
                <div className="flex flex-col">
                  <span className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums tracking-tight">
                    {interviewingCount}
                  </span>
                  <span className="text-xs text-text-muted mt-0.5">
                    Interviewing
                  </span>
                </div>
              </div>
            )}
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
