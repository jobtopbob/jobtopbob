"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { Command } from "cmdk";
import { useJobs, type Job } from "@/hooks/use-jobs";
import { useStages } from "@/hooks/use-stages";
import { Briefcase, ChevronsUpDown, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";

interface JobComboboxProps {
  value: Job | null;
  onChange: (job: Job | null) => void;
}

export function JobCombobox({
  value,
  onChange,
}: JobComboboxProps) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [showAll, setShowAll] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Get stages to find offer-stage IDs
  const { data: stages } = useStages();
  const offerStageIds = useMemo(
    () =>
      (stages ?? [])
        .filter((s) => s.mapped_status === "offer")
        .map((s) => s.id),
    [stages]
  );

  // Fetch jobs — default to offer-stage jobs, or all non-terminal if toggled
  const stageFilter = showAll ? [] : offerStageIds;
  const { data: jobsData } = useJobs({
    search: search || undefined,
    stageIds: stageFilter,
    perPage: 15,
    page: 1,
  });
  const jobs = jobsData?.data ?? [];

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    function handleClick(e: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [open]);

  if (value) {
    return (
      <div className="flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-2">
        <Briefcase className="h-4 w-4 text-text-muted shrink-0" />
        <div className="flex flex-col min-w-0 flex-1">
          <span className="text-sm font-medium truncate">{value.title}</span>
          {value.company_name && (
            <span className="text-xs text-text-muted truncate">
              {value.company_name}
            </span>
          )}
        </div>
        <button
          type="button"
          onClick={() => onChange(null)}
          className="text-text-muted hover:text-text-primary"
        >
          <X className="h-4 w-4" />
        </button>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setOpen(!open)}
        className="w-full justify-between font-normal text-text-muted"
      >
        Select a job...
        <ChevronsUpDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
      </Button>

      {open && (
        <div className="absolute top-full left-0 z-50 mt-1 w-full rounded-lg border border-border-subtle bg-card shadow-lg">
          <Command shouldFilter={false}>
            <Command.Input
              value={search}
              onValueChange={setSearch}
              placeholder="Search by title or company..."
              className="h-10 w-full border-b border-border-subtle bg-transparent px-3 text-sm outline-none placeholder:text-text-muted"
              autoFocus
            />
            <Command.List className="max-h-[200px] overflow-y-auto p-1">
              <Command.Empty className="py-4 text-center text-xs text-text-muted">
                {offerStageIds.length === 0 && !showAll
                  ? "No offer stage found. Toggle 'Show all jobs' below."
                  : "No matching jobs found."}
              </Command.Empty>
              {jobs.map((job) => (
                  <Command.Item
                    key={job.id}
                    value={job.id}
                    onSelect={() => {
                      onChange(job);
                      setOpen(false);
                      setSearch("");
                    }}
                    className="flex items-center gap-2 rounded-md px-2 py-2 text-sm cursor-pointer data-[selected=true]:bg-surface-hover"
                  >
                    <Briefcase className="h-3.5 w-3.5 text-text-muted shrink-0" />
                    <div className="flex flex-col min-w-0 flex-1">
                      <span className="truncate font-medium">{job.title}</span>
                      {job.company_name && (
                        <span className="text-xs text-text-muted truncate">
                          {job.company_name}
                        </span>
                      )}
                    </div>
                    {job.stage_name && (
                      <span className="text-[10px] text-text-muted shrink-0">
                        {job.stage_name}
                      </span>
                    )}
                  </Command.Item>
              ))}
            </Command.List>
            <div className="border-t border-border-subtle px-3 py-2">
              <label className="flex items-center gap-2 text-xs text-text-muted cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                  className="rounded"
                />
                Show all jobs
              </label>
            </div>
          </Command>
        </div>
      )}
    </div>
  );
}
