"use client";

import { useScrapeRuns } from "@/hooks/use-discover";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { MagnifyingGlassIcon, MapPinIcon } from "@phosphor-icons/react";

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

function StatusDot({ status }: { status: string | null }) {
  if (status === "completed") {
    return <span className="inline-flex h-2 w-2 rounded-full bg-brand-green" />;
  }
  if (status === "running" || status === "pending") {
    return (
      <span className="relative flex h-2 w-2">
        <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-brand opacity-75" />
        <span className="relative inline-flex h-2 w-2 rounded-full bg-brand" />
      </span>
    );
  }
  if (status === "failed") {
    return <span className="inline-flex h-2 w-2 rounded-full bg-brand-red" />;
  }
  return <span className="inline-flex h-2 w-2 rounded-full bg-text-muted" />;
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
      <div className="flex gap-3 pb-2">
        {Array.from({ length: 3 }).map((_, i) => (
          <Skeleton
            key={i}
            className="h-[120px] min-w-[280px] flex-1 rounded-xl"
          />
        ))}
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
          className="flex min-w-[280px] max-w-[320px] shrink-0 snap-start flex-col justify-between rounded-xl border border-border-subtle bg-card p-4"
        >
          {/* Keywords as chips */}
          <div>
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

          {/* Status + Results */}
          <div className="mt-3 flex items-center justify-between border-t border-border-subtle pt-3">
            <div className="flex items-center gap-1.5">
              <StatusDot status={run.status} />
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
            <div className="flex items-center gap-2 text-xs text-text-muted">
              {run.status === "completed" && (
                <span>
                  {run.jobs_new ?? 0} new / {run.jobs_found ?? 0} found
                </span>
              )}
              <span>{relativeTime(run.created_at)}</span>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
