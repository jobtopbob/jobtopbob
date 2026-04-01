"use client";

import { useState } from "react";
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
  CaretLeftIcon,
  CaretRightIcon,
  BriefcaseIcon,
} from "@phosphor-icons/react";

const PER_PAGE = 6;

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
    return <CheckCircleIcon weight="fill" className="h-3.5 w-3.5 text-brand-green" />;
  }
  if (status === "running" || status === "pending") {
    return <SpinnerGapIcon weight="bold" className="h-3.5 w-3.5 animate-spin text-brand" />;
  }
  if (status === "failed") {
    return <XCircleIcon weight="fill" className="h-3.5 w-3.5 text-brand-red" />;
  }
  return <ClockIcon className="h-3.5 w-3.5 text-text-muted" />;
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
  const [page, setPage] = useState(1);
  const { data, isLoading } = useScrapeRuns(page, PER_PAGE);

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton key={i} className="h-[88px] rounded-xl" />
        ))}
      </div>
    );
  }

  const runs = data?.data ?? [];
  const total = data?.total ?? 0;
  const totalPages = Math.ceil(total / PER_PAGE);

  if (runs.length === 0 && page === 1) {
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
    <div className="space-y-3">
      <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2 lg:grid-cols-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="group relative overflow-hidden rounded-xl border border-border-subtle bg-card p-3.5 transition-all duration-200 hover:border-border hover:shadow-sm"
          >
            {/* Background images */}
            <img
              src="/recent-searches-bg-light.jpg"
              alt=""
              className="pointer-events-none absolute inset-0 h-full w-full object-cover opacity-40 dark:hidden"
            />
            <img
              src="/recent-searches-bg-dark.jpg"
              alt=""
              className="pointer-events-none absolute inset-0 hidden h-full w-full object-cover opacity-40 dark:block"
            />
            <div className="absolute inset-0 bg-card/90" />

            {/* Content */}
            <div className="relative z-10 flex min-w-0 flex-col gap-2">
              {/* Keywords — displayed as text title, not badges */}
              <p className="text-sm font-medium leading-snug text-text-primary">
                {run.keywords?.join(", ") || "Search"}
              </p>

              {/* Meta row: source, location, jobs found */}
              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
                {run.sources && (
                  <Badge variant="outline" className="text-[11px] capitalize">
                    {run.sources.join(", ")}
                  </Badge>
                )}
                {run.location && (
                  <span className="flex items-center gap-0.5">
                    <MapPinIcon className="h-3 w-3 shrink-0" />
                    <span className="truncate">{run.location}</span>
                  </span>
                )}
                {run.status === "completed" && run.jobs_new != null && (
                  <span className="flex items-center gap-0.5">
                    <BriefcaseIcon className="h-3 w-3 shrink-0" />
                    {run.jobs_new} new
                  </span>
                )}
              </div>

              {/* Error message */}
              {run.status === "failed" && run.error_message && (
                <p className="truncate text-xs text-brand-red/80">
                  {run.error_message}
                </p>
              )}

              {/* Status row */}
              <div className="flex items-center justify-between">
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
          </div>
        ))}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-1">
          <span className="text-xs text-text-muted">
            Page {page} of {totalPages}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text-secondary disabled:pointer-events-none disabled:opacity-40"
            >
              <CaretLeftIcon className="h-4 w-4" />
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
              className="inline-flex h-7 w-7 items-center justify-center rounded-md text-text-muted transition-colors hover:bg-muted hover:text-text-secondary disabled:pointer-events-none disabled:opacity-40"
            >
              <CaretRightIcon className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
