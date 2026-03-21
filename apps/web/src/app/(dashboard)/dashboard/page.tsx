"use client";

import { StatsRow } from "@/components/dashboard/stats-row";
import { ApplicationPipeline } from "@/components/dashboard/application-pipeline";
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
    <div className="flex h-full bg-white">
      {/* Main Content */}
      <div className="flex-1 flex flex-col gap-6 p-7 pt-7 overflow-y-auto">
        {/* Page Header */}
        <div>
          <h1 className="text-4xl font-bold text-[#1A1A2E] tracking-tight" style={{ letterSpacing: -1 }}>
            Dashboard
          </h1>
          <p className="text-sm text-[#8B8FA3] mt-1.5">
            Welcome back, {firstName}. Here is your job search overview.
          </p>
        </div>

        {/* Stats Row */}
        <StatsRow />

        {/* Bottom Row: Pipeline + Recent Applications */}
        <div className="flex gap-4 flex-1 min-h-0">
          <ApplicationPipeline />
          <RecentApplications />
        </div>
      </div>

      {/* Activity Sidebar */}
      <ActivitySidebar />
    </div>
  );
}
