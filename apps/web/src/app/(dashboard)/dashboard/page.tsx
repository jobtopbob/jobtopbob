"use client";

import { useMemo } from "react";
import Image from "next/image";
import { ActionStrip } from "@/components/dashboard/action-strip";
import { StageFunnel } from "@/components/dashboard/stage-funnel";
import { ActivityFeed } from "@/components/dashboard/activity-feed";
import { authClient } from "@/lib/auth-client";
import { useStats } from "@/hooks/use-stats";
import { Skeleton } from "@/components/ui/skeleton";

function HeroMetrics() {
  const { data: stats, isLoading: statsLoading } = useStats();

  // Derive response rate from the stage funnel (server-side, covers all jobs).
  // Stages at position > 1 (Screening, Interviewing, Offer, etc.) indicate a response.
  const responseRate = useMemo(() => {
    const funnel = stats?.stage_funnel;
    if (!funnel || funnel.length === 0) return null;

    const total = funnel.reduce((sum, s) => sum + (s.count ?? 0), 0);
    if (total === 0) return null;

    // Stages beyond position 1 ("Applied") mean the company responded
    const responded = funnel
      .filter((s) => s.position > 1)
      .reduce((sum, s) => sum + (s.count ?? 0), 0);

    return Math.round((responded / total) * 100);
  }, [stats]);

  const isLoading = statsLoading;

  const byStatus = stats?.by_status ?? {};
  const offerCount = byStatus["offer"] ?? byStatus["Offer"] ?? 0;

  const metrics = [
    { label: "Total Jobs", value: String(stats?.total_jobs ?? 0) },
    { label: "Response Rate", value: responseRate != null ? `${responseRate}%` : "--" },
    { label: "Offers", value: String(offerCount) },
  ];

  if (isLoading) {
    return (
      <div className="flex gap-8">
        {Array.from({ length: 3 }).map((_, i) => (
          <div key={i} className="flex flex-col gap-1">
            <Skeleton className="h-8 w-12" />
            <Skeleton className="h-3 w-16" />
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className="flex gap-8 sm:gap-10">
      {metrics.map((m) => (
        <div key={m.label} className="flex flex-col">
          <span className="text-2xl sm:text-3xl font-bold text-text-primary tabular-nums tracking-tight">
            {m.value}
          </span>
          <span className="text-xs text-text-muted mt-0.5">{m.label}</span>
        </div>
      ))}
    </div>
  );
}

export default function DashboardPage() {
  const { data: session } = authClient.useSession();
  const firstName =
    session?.user?.name?.split(" ")[0] ??
    session?.user?.email?.split("@")[0] ??
    "there";

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
            <HeroMetrics />
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

        {/* Action Strip: Weekly Goal + Follow-ups */}
        <ActionStrip />

        {/* Pipeline Funnel */}
        <StageFunnel />

        {/* Recent Activity Feed */}
        <ActivityFeed />
      </div>
    </div>
  );
}
