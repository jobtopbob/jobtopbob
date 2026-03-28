"use client";

import { StatsRow } from "@/components/dashboard/stats-row";
import { WeeklyGoalWidget } from "@/components/dashboard/weekly-goal-widget";
import { StageFunnel } from "@/components/dashboard/stage-funnel";
import { ApplicationPipeline } from "@/components/dashboard/application-pipeline";
import { SourceBreakdown } from "@/components/dashboard/source-breakdown";
import { ResponseTrend } from "@/components/dashboard/response-trend";
import { RecentApplications } from "@/components/dashboard/recent-applications";
import { ActivitySidebar } from "@/components/dashboard/activity-sidebar";
import { authClient } from "@/lib/auth-client";

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

  return (
    <div className="flex h-full bg-background">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-4 sm:gap-5 p-4 sm:p-7 overflow-y-auto">
        {/* Page Header */}
        <div>
          <h1
            className="text-2xl sm:text-4xl font-bold text-text-primary tracking-tight"
            style={{ letterSpacing: -1 }}
          >
            Dashboard
          </h1>
          <p className="text-sm text-text-muted mt-1.5">
            Welcome back, {firstName}. Here is your job search overview.
          </p>
        </div>

        {/* Stats Row */}
        <StatsRow />

        {/* Middle Row: Weekly Goal + Stage Funnel */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <WeeklyGoalWidget />
          <StageFunnel />
        </div>

        {/* Charts Row: Application Pipeline + Response Trend */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <ApplicationPipeline />
          <ResponseTrend />
        </div>

        {/* Bottom Row: Recent Applications + Source Breakdown */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <RecentApplications />
          <SourceBreakdown />
        </div>
      </div>

      {/* Activity Sidebar — hidden on mobile */}
      <div className="hidden xl:block">
        <ActivitySidebar />
      </div>
    </div>
  );
}
