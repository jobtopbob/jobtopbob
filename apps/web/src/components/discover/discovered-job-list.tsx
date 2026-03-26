"use client";

import { useState } from "react";
import {
  ExternalLink,
  MapPin,
  DollarSign,
  Briefcase,
  Search,
  Compass,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import { useDiscoveredJobs, type DiscoveredJob } from "@/hooks/use-discover";
import { useDebounce } from "@/hooks/use-debounce";
import { PaginationControls } from "@/components/kanban/pagination-controls";

function formatSalary(job: DiscoveredJob) {
  if (!job.salary_min && !job.salary_max) return null;
  const currency = job.salary_currency ?? "USD";
  const fmt = new Intl.NumberFormat("en-US", {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
  });
  if (job.salary_min && job.salary_max) {
    return `${fmt.format(job.salary_min)} - ${fmt.format(job.salary_max)}`;
  }
  return job.salary_min
    ? `From ${fmt.format(job.salary_min)}`
    : `Up to ${fmt.format(job.salary_max!)}`;
}

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
  const salary = formatSalary(job);

  return (
    <div className="group relative flex flex-col rounded-xl border border-border-subtle bg-card p-4 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md">
      {/* Source badge */}
      {job.source && (
        <Badge
          variant="secondary"
          className="absolute right-3 top-3 text-[10px] capitalize"
        >
          {job.source}
        </Badge>
      )}

      {/* Company + Title */}
      <div className="flex items-start gap-3">
        {/* Company avatar */}
        {job.company_name && (
          <div
            className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-lg text-sm font-semibold ${companyInitialColor(job.company_name)}`}
          >
            {job.company_name.charAt(0).toUpperCase()}
          </div>
        )}
        <div className="min-w-0 flex-1 pr-16">
          {job.company_name && (
            <p className="text-sm font-semibold text-text-primary truncate">
              {job.company_name}
            </p>
          )}
          <h3 className="text-xs text-text-secondary leading-tight truncate">
            {job.title}
          </h3>
        </div>
      </div>

      {/* Salary */}
      {salary && (
        <p className="mt-3 text-sm font-medium text-brand">{salary}</p>
      )}

      {/* Meta row */}
      <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-muted">
        {job.location && (
          <span className="flex items-center gap-1">
            <MapPin className="h-3 w-3" />
            {job.location}
          </span>
        )}
        {job.job_type && (
          <span className="flex items-center gap-1">
            <Briefcase className="h-3 w-3" />
            {job.job_type}
          </span>
        )}
      </div>

      {/* Description */}
      {job.jd_raw && (
        <p className="mt-2 text-xs text-text-muted line-clamp-2">{job.jd_raw}</p>
      )}

      {/* External link */}
      {job.source_url && (
        <div className="mt-3 border-t border-border-subtle pt-3">
          <a
            href={job.source_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-xs font-medium text-text-secondary transition-colors hover:text-text-primary"
          >
            View listing
            <ExternalLink className="h-3 w-3" />
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

  const { data, isLoading } = useDiscoveredJobs(page, 20, {
    search: debouncedSearch || undefined,
  });

  const jobs = data?.data ?? [];
  const total = data?.total ?? 0;

  return (
    <div className="space-y-4">
      {/* Filter bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-text-muted" />
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
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-40 rounded-xl" />
          ))}
        </div>
      ) : jobs.length === 0 ? (
        <div className="flex items-center justify-center rounded-xl bg-muted/50 py-16">
          <div className="text-center">
            <Compass className="mx-auto h-10 w-10 text-text-muted" />
            <p className="mt-3 text-sm font-medium text-text-secondary">
              Start discovering
            </p>
            <p className="mt-1 max-w-xs text-xs text-text-muted">
              Run a search to find jobs across multiple sources. Discovered jobs
              will appear here.
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
        </>
      )}
    </div>
  );
}
