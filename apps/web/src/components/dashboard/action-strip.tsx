"use client";

import Link from "next/link";
import { useStats } from "@/hooks/use-stats";
import { useJobs } from "@/hooks/use-jobs";
import {
  useGmailStatus,
  useUnconfirmedEmailEvents,
  useUnconfirmedCount,
} from "@/hooks/use-email";
import { useMemo } from "react";
import {
  CalendarIcon,
  EnvelopeSimpleIcon,
  ArrowRightIcon,
} from "@phosphor-icons/react";
import { Skeleton } from "@/components/ui/skeleton";

function formatUpcomingTime(dateStr: string): string {
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffDays === 0)
    return `Today, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  if (diffDays === 1)
    return `Tomorrow, ${date.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}`;
  return date.toLocaleDateString(undefined, {
    month: "short",
    day: "numeric",
  });
}

function formatRelativeTime(dateStr: string): string {
  const now = new Date();
  const date = new Date(dateStr);
  const diffMs = now.getTime() - date.getTime();
  const diffMinutes = Math.floor(diffMs / 60000);
  const diffHours = Math.floor(diffMs / 3600000);
  const diffDays = Math.floor(diffMs / 86400000);

  if (diffMinutes < 1) return "Just now";
  if (diffMinutes < 60) return `${diffMinutes}m ago`;
  if (diffHours < 24)
    return `${diffHours}h ago`;
  if (diffDays === 1) return "Yesterday";
  if (diffDays < 30) return `${diffDays}d ago`;
  return date.toLocaleDateString();
}

const intentStyles: Record<string, { label: string; color: string }> = {
  interview_invite: {
    label: "Interview",
    color: "bg-blue-100 text-blue-700 dark:bg-blue-900/50 dark:text-blue-300",
  },
  rejection: {
    label: "Rejection",
    color: "bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-300",
  },
  offer: {
    label: "Offer",
    color:
      "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/50 dark:text-emerald-300",
  },
  assessment: {
    label: "Assessment",
    color:
      "bg-purple-100 text-purple-700 dark:bg-purple-900/50 dark:text-purple-300",
  },
  follow_up: {
    label: "Follow-up",
    color:
      "bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-300",
  },
  other: {
    label: "Other",
    color: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  },
};

function EmailActivity() {
  const { data: gmail, isLoading: gmailLoading } = useGmailStatus();
  const { data: unconfirmedCount } = useUnconfirmedCount();
  const { data: events, isLoading: eventsLoading } =
    useUnconfirmedEmailEvents(1, 3);

  if (gmailLoading) {
    return <Skeleton className="h-full min-h-[120px] rounded-xl" />;
  }

  if (!gmail?.connected) {
    return (
      <div className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-5 h-full">
        <span className="text-sm font-semibold text-text-primary">
          Email Activity
        </span>
        <div className="flex flex-col items-center justify-center gap-2 flex-1 py-2">
          <EnvelopeSimpleIcon className="w-6 h-6 text-text-muted" />
          <p className="text-sm text-text-muted text-center">
            Connect Gmail to track responses automatically.
          </p>
          <Link
            href="/email-integration"
            className="text-sm font-medium text-brand hover:underline"
          >
            Connect Gmail
          </Link>
        </div>
      </div>
    );
  }

  const count = unconfirmedCount?.count ?? 0;
  const items = events?.data ?? [];

  return (
    <div className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-5 h-full">
      <div className="flex items-center justify-between">
        <span className="text-sm font-semibold text-text-primary">
          Email Activity
        </span>
        {count > 0 && (
          <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-blue-500/15 px-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400 tabular-nums">
            {count}
          </span>
        )}
      </div>

      {eventsLoading ? (
        <div className="flex flex-col gap-2">
          {Array.from({ length: 2 }).map((_, i) => (
            <Skeleton key={i} className="h-12 rounded-lg" />
          ))}
        </div>
      ) : items.length > 0 ? (
        <div className="flex flex-col gap-2">
          {items.map((event) => {
            const intent =
              intentStyles[event.detected_type ?? "other"] ??
              intentStyles.other;
            return (
              <Link
                key={event.id}
                href="/email-integration"
                className="flex items-center gap-3 rounded-lg bg-surface p-3 hover:bg-surface-hover transition-colors"
              >
                <EnvelopeSimpleIcon className="w-4 h-4 shrink-0 text-text-muted" />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    {event.company_name ?? event.from_email ?? "Unknown"}
                  </span>
                  <span className="text-[11px] text-text-muted truncate">
                    {event.raw_snippet}
                  </span>
                </div>
                <span
                  className={`shrink-0 rounded-md px-1.5 py-0.5 text-[10px] font-semibold ${intent.color}`}
                >
                  {intent.label}
                </span>
                <span className="text-[11px] text-text-muted shrink-0 hidden sm:block">
                  {formatRelativeTime(event.created_at)}
                </span>
              </Link>
            );
          })}
        </div>
      ) : (
        <p className="text-sm text-text-muted py-2">
          No pending emails to review.
        </p>
      )}

      {count > items.length && (
        <Link
          href="/email-integration"
          className="inline-flex items-center gap-1 text-xs font-medium text-brand hover:underline self-start"
        >
          View all {count} pending
          <ArrowRightIcon className="w-3 h-3" />
        </Link>
      )}
    </div>
  );
}

export function ActionStrip() {
  const { data: stats, isLoading: statsLoading } = useStats();
  const { data: jobsData, isLoading: jobsLoading } = useJobs();

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
        company: job.company_name ?? "Unknown",
        title: job.title,
        time: formatUpcomingTime(job.follow_up_at!),
      }));
  }, [jobsData]);

  const followUpsDue = stats?.follow_ups_due ?? 0;

  if (statsLoading || jobsLoading) {
    return <Skeleton className="h-[120px] rounded-xl" />;
  }

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {/* Email Activity */}
      <EmailActivity />

      {/* Follow-ups Due */}
      <div className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-5">
        <div className="flex items-center justify-between">
          <span className="text-sm font-semibold text-text-primary">
            Follow-ups Due
          </span>
          {followUpsDue > 0 && (
            <span className="inline-flex items-center justify-center min-w-5 h-5 rounded-full bg-amber-500/15 px-1.5 text-xs font-semibold text-amber-600 dark:text-amber-400 tabular-nums">
              {followUpsDue}
            </span>
          )}
        </div>

        {upcoming.length > 0 ? (
          <div className="flex flex-col gap-2">
            {upcoming.map((item) => (
              <Link
                key={item.id}
                href={`/applications?job=${item.id}`}
                className="flex items-center gap-3 rounded-lg bg-surface p-3 hover:bg-surface-hover transition-colors"
              >
                <CalendarIcon className="w-4 h-4 shrink-0 text-amber-500" />
                <div className="flex flex-col gap-0.5 min-w-0 flex-1">
                  <span className="text-[13px] font-medium text-text-primary truncate">
                    {item.company}
                  </span>
                  <span className="text-[11px] text-text-muted truncate">
                    {item.time}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        ) : (
          <p className="text-sm text-text-muted py-2">
            {followUpsDue > 0
              ? `${followUpsDue} overdue — check your applications`
              : "No follow-ups scheduled."}
          </p>
        )}
      </div>
    </div>
  );
}
