"use client";

import { useScrapeRuns } from "@/hooks/use-discover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import {
  MagnifyingGlassIcon,
  MapPinIcon,
  CheckCircleIcon,
  SpinnerGapIcon,
  XCircleIcon,
  ClockIcon,
} from "@phosphor-icons/react";

function relativeTime(dateStr: string) {
  const now = Date.now();
  const then = new Date(dateStr).getTime();
  const diff = Math.floor((now - then) / 1000);

  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 604800) return `${Math.floor(diff / 86400)}d ago`;
  return new Date(dateStr).toLocaleDateString();
}

function StatusIcon({ status }: { status: string | null }) {
  if (status === "completed") {
    return <CheckCircleIcon weight="fill" className="h-4 w-4 text-brand-green" />;
  }
  if (status === "running" || status === "pending") {
    return <SpinnerGapIcon weight="bold" className="h-4 w-4 animate-spin text-brand" />;
  }
  if (status === "failed") {
    return <XCircleIcon weight="fill" className="h-4 w-4 text-brand-red" />;
  }
  return <ClockIcon className="h-4 w-4 text-text-muted" />;
}

function statusLabel(status: string | null) {
  switch (status) {
    case "completed":
      return "Completed";
    case "running":
    case "pending":
      return "In progress...";
    case "failed":
      return "Failed";
    default:
      return "Unknown";
  }
}

export function ScrapeRunList() {
  const { data, isLoading } = useScrapeRuns();

  if (isLoading) {
    return (
      <div className="relative overflow-hidden rounded-2xl">
        <div className="p-5">
          <div className="flex gap-3 pb-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <Skeleton
                key={i}
                className="h-[130px] min-w-[280px] flex-1 rounded-xl"
              />
            ))}
          </div>
        </div>
      </div>
    );
  }

  const runs = data?.data ?? [];

  if (runs.length === 0) {
    return (
      <div className="flex items-center justify-center rounded-xl bg-muted/50 p-8">
        <div className="text-center">
          <MagnifyingGlassIcon className="mx-auto h-8 w-8 text-text-muted" />
          <p className="mt-2 text-sm font-medium text-text-secondary">
            No searches yet
          </p>
          <p className="mt-1 text-xs text-text-muted">
            Run your first search above to start discovering jobs.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory scrollbar-none">
      {runs.map((run) => (
        <div
          key={run.id}
          className="relative flex min-w-[280px] max-w-[320px] shrink-0 snap-start flex-col justify-between overflow-hidden rounded-xl border border-border-subtle p-4 transition-shadow duration-200 hover:shadow-md"
        >
          <img
            src="/recent-searches-bg-light.jpg"
            alt=""
            className="absolute inset-0 h-full w-full object-cover dark:hidden"
          />
          <img
            src="/recent-searches-bg-dark.jpg"
            alt=""
            className="absolute inset-0 hidden h-full w-full object-cover dark:block"
          />
          <div className="absolute inset-0 bg-card/88" />

          {/* Keywords as chips */}
          <div className="relative z-10">
            <div className="flex flex-wrap gap-1.5">
              {run.keywords?.map((kw, i) => (
                <Badge key={i} variant="outline" className="text-xs">
                  {kw}
                </Badge>
              )) ?? (
                <Badge variant="outline" className="text-xs">
                  Search
                </Badge>
              )}
            </div>

            {/* Source + Location */}
            <div className="mt-2 flex items-center gap-2 text-xs text-text-muted">
              {run.sources && (
                <span className="capitalize">{run.sources.join(", ")}</span>
              )}
              {run.location && (
                <span className="flex items-center gap-0.5">
                  <MapPinIcon className="h-3 w-3" />
                  {run.location}
                </span>
              )}
            </div>
          </div>

          {/* Status + Time */}
          <div className="relative z-10 mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <div className="flex items-center gap-1.5">
              <StatusIcon status={run.status} />
              <span
                className={`text-xs font-medium ${
                  run.status === "completed"
                    ? "text-brand-green"
                    : run.status === "failed"
                      ? "text-brand-red"
                      : "text-text-muted"
                }`}
              >
                {statusLabel(run.status)}
              </span>
            </div>
            <span className="text-xs text-text-muted">
              {relativeTime(run.created_at)}
            </span>
          </div>
        </div>
      ))}
    </div>
  );
}
