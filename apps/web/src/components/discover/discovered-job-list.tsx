"use client";

import { useState } from "react";
import {
  ArrowSquareOutIcon,
  MapPinIcon,
  BriefcaseIcon,
  MagnifyingGlassIcon,
  CompassIcon,
  SpinnerIcon,
  ArrowDownIcon,
} from "@phosphor-icons/react";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { useDiscoveredJobs, useScrapeRuns, useContinueScrapeRun, type DiscoveredJob } from "@/hooks/use-discover";
import { useDebounce } from "@/hooks/use-debounce";
import { PaginationControls } from "@/components/kanban/pagination-controls";
import { formatSalaryRange } from "@/lib/currency";
import { toast } from "sonner";

function companyInitialColor(name: string) {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  const colors = [
    "bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-900/40 dark:text-purple-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
    "bg-cyan-100 text-cyan-700 dark:bg-cyan-900/40 dark:text-cyan-300",
  ];
  return colors[Math.abs(hash) % colors.length];
}

function JobCard({ job }: { job: DiscoveredJob }) {
  const salary = formatSalaryRange(job.salary_min, job.salary_max, { currency: job.salary_currency });

  return (
    <div className="group relative flex flex-col overflow-hidden rounded-xl border border-border-subtle p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      <img
        src="/discovered-jobs-bg-light.jpg"
        alt=""
        className="absolute inset-0 h-full w-full object-cover dark:hidden"
      />
      <img
        src="/discovered-jobs-bg-dark.jpg"
        alt=""
        className="absolute inset-0 hidden h-full w-full object-cover dark:block"
      />
      <div className="absolute inset-0 bg-card/88" />

      {/* Source badge */}
      {job.via && (
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 z-10 text-[10px] capitalize"
        >
          {job.via.replace(/^via\s+/i, "")}
        </Badge>
      )}

      {/* Company + Title */}
      <div className="relative z-10 flex items-start gap-3">
        {/* Company avatar */}
        {job.company_name && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${companyInitialColor(job.company_name)}`}
          >
            {job.company_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 pr-16">
          <p className="text-sm font-semibold text-text-primary truncate">
            {job.company_name || "Company"}
          </p>
          <h3 className="text-xs text-text-secondary leading-tight truncate">
            {job.title}
          </h3>
        </div>
      </div>

      {/* Salary */}
      {salary && (
        <p className="relative z-10 mt-3 text-sm font-medium text-brand">
          {salary}
        </p>
      )}

      {/* Meta row */}
      <div className="relative z-10 mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPinIcon className="h-3 w-3" />
            {job.location}
          </span>
        )}
        {job.job_type && (
          <span className="flex items-center gap-1">
            <BriefcaseIcon className="h-3 w-3" />
            {job.job_type}
          </span>
        )}
      </div>

      {/* Description */}
      {job.jd_raw && (
        <p className="relative z-10 mt-2 text-xs text-text-muted line-clamp-2">
          {job.jd_raw}
        </p>
      )}

      {/* External link */}
      {(job.application_url || job.source_url) && (
        <div className="relative z-10 mt-3 border-t border-border-subtle pt-3">
          <a
            href={job.application_url || job.source_url!}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            View listing
            <ArrowSquareOutIcon className="h-3 w-3" />
          </a>
        </div>
      )}
    </div>
  );
}

export function DiscoveredJobList() {
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const debouncedSearch = useDebounce(search, 300);
  const continueScrapeRun = useContinueScrapeRun();

  const { data: runsData } = useScrapeRuns(1, 6);
  const hasActiveRuns = runsData?.data?.some(
    (r) => r.status === "pending" || r.status === "running"
  );

  // Find the most recent completed run that has a next_page_token
  const latestContinuableRun = runsData?.data?.find(
    (r) => r.status === "completed" && r.next_page_token
  );

  const { data, isLoading } = useDiscoveredJobs(page, 20, {
    search: debouncedSearch || undefined,
  }, { refetchInterval: hasActiveRuns ? 5000 : false });

  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Filter discovered jobs..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setPage(1);
            }}
            className="pl-9"
          />
        </div>
        <Badge variant="secondary" className="shrink-0">
          {total} job{total !== 1 ? "s" : ""}
        </Badge>
      </div>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 w-full rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl bg-muted/50 py-16">
          <div className="text-center">
            <CompassIcon className="mx-auto h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm font-medium text-text-secondary">
              Start discovering
            </p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Run a search to find jobs across multiple sources. Discovered
              jobs will appear here.
            </p>
          </div>
        </div>
      ) : (
        <>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {jobs.map((job) => (
              <JobCard key={job.id} job={job} />
            ))}
          </div>
          {total > 20 && (
            <PaginationControls
              page={page}
              perPage={20}
              total={total}
              onPageChange={setPage}
            />
          )}

          {/* Load More button when more results are available from SerpApi */}
          {latestContinuableRun && !hasActiveRuns && (
            <div className="flex justify-center pt-2">
              <Button
                variant="outline"
                onClick={() => {
                  continueScrapeRun.mutate(latestContinuableRun.id, {
                    onSuccess: () => {
                      toast.success("Loading more results...");
                    },
                    onError: (err) => {
                      toast.error(err.message);
                    },
                  });
                }}
                disabled={continueScrapeRun.isPending}
                className="gap-2"
              >
                {continueScrapeRun.isPending ? (
                  <SpinnerIcon className="h-4 w-4 animate-spin" />
                ) : (
                  <ArrowDownIcon className="h-4 w-4" />
                )}
                Load more results
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  );
}
