"use client";

import Image from "next/image";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Checkbox } from "@/components/ui/checkbox";
import type { Job } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { formatSalaryRange } from "@/lib/currency";
import { PaginationControls } from "./pagination-controls";
import { StageIcon } from "./stage-icons";
import { JOB_TYPES, JOB_LEVELS } from "@/lib/constants";

interface ApplicationsTableProps {
  jobs: Job[];
  stages: Stage[];
  onJobClick: (job: Job) => void;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
  selectedIds?: Set<string>;
  onSelectionChange?: (ids: Set<string>) => void;
}

function getStagePillStyle(stage: Stage | undefined): {
  bg: string;
  text: string;
} {
  if (!stage?.color) return { bg: "var(--surface)", text: "var(--text-muted)" };
  const hex = stage.color.replace("#", "");
  const r = parseInt(hex.slice(0, 2), 16);
  const g = parseInt(hex.slice(2, 4), 16);
  const b = parseInt(hex.slice(4, 6), 16);
  return {
    bg: `rgba(${r}, ${g}, ${b}, 0.12)`,
    text: stage.color,
  };
}

function getCompanyInitialColor(name: string): string {
  const colors = [
    "#3B82F6", "#8B5CF6", "#10B981", "#F59E0B",
    "#EF4444", "#EC4899", "#6366F1", "#14B8A6",
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return colors[Math.abs(hash) % colors.length];
}

function formatDate(dateStr: string | null | undefined): {
  text: string;
  isToday: boolean;
} {
  if (!dateStr) return { text: "—", isToday: false };
  const date = new Date(dateStr);
  const now = new Date();
  const isToday =
    date.getFullYear() === now.getFullYear() &&
    date.getMonth() === now.getMonth() &&
    date.getDate() === now.getDate();
  const text = date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
  });
  return { text, isToday };
}

function formatJobType(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_TYPES.find((t) => t.value === value)?.label ?? value;
}

function formatJobLevel(value: string | null | undefined): string | null {
  if (!value) return null;
  return JOB_LEVELS.find((l) => l.value === value)?.label ?? value;
}

function formatDeadline(dateStr: string | null | undefined): {
  text: string;
  isUrgent: boolean;
  isPast: boolean;
} {
  if (!dateStr) return { text: "—", isUrgent: false, isPast: false };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = date.getTime() - now.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  const text = date.toLocaleDateString("en-US", { month: "short", day: "numeric" });
  return {
    text,
    isUrgent: diffDays >= 0 && diffDays <= 7,
    isPast: diffDays < 0,
  };
}

export function ApplicationsTable({
  jobs,
  stages,
  onJobClick,
  page = 1,
  perPage = 25,
  total = 0,
  onPageChange,
  selectedIds = new Set<string>(),
  onSelectionChange,
}: ApplicationsTableProps) {
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  const allSelected = jobs.length > 0 && jobs.every((j) => selectedIds.has(j.id));
  const someSelected = jobs.some((j) => selectedIds.has(j.id)) && !allSelected;

  const toggleAll = () => {
    if (!onSelectionChange) return;
    if (allSelected) {
      onSelectionChange(new Set());
    } else {
      onSelectionChange(new Set(jobs.map((j) => j.id)));
    }
  };

  const toggleOne = (id: string) => {
    if (!onSelectionChange) return;
    const next = new Set(selectedIds);
    if (next.has(id)) next.delete(id);
    else next.add(id);
    onSelectionChange(next);
  };

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            No applications yet
          </p>
          <p className="text-xs text-text-muted mt-1">
            Add a job to start tracking your applications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table className="min-w-[1200px]">
        <TableHeader>
          <TableRow className="border-b border-border-subtle hover:bg-transparent">
            <TableHead className="w-10 bg-surface pl-4">
              <Checkbox
                aria-label="Select all"
                checked={allSelected}
                indeterminate={someSelected}
                onCheckedChange={toggleAll}
              />
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold">
              Product / Job
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[80px]">
              Stage
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[80px]">
              Type
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[80px]">
              Level
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[120px]">
              Salary
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold">
              Location
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[80px]">
              Deadline
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[90px]">
              Applied
            </TableHead>
            <TableHead className="bg-surface text-text-muted text-xs font-semibold w-[90px] pr-4">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const stage = job.stage_id ? stageMap.get(job.stage_id) : undefined;
            const pillStyle = getStagePillStyle(stage);
            const salary = formatSalaryRange(job.salary_min, job.salary_max, { currency: job.salary_currency, interval: job.salary_interval, compact: true });
            const appliedDate = formatDate(job.applied_at);
            const addedDate = formatDate(job.created_at);
            const deadline = formatDeadline(job.deadline);
            const companyName = job.company_name ?? "Unknown";
            const initialColor = getCompanyInitialColor(companyName);
            const jobType = formatJobType(job.job_type);
            const jobLevel = formatJobLevel(job.job_level);

            return (
              <TableRow
                key={job.id}
                onClick={() => onJobClick(job)}
                className={`border-b border-border-subtle cursor-pointer hover:bg-surface-hover ${selectedIds.has(job.id) ? "bg-brand/5" : ""}`}
              >
                <TableCell
                  className="pl-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox
                    aria-label={`Select ${job.title}`}
                    checked={selectedIds.has(job.id)}
                    onCheckedChange={() => toggleOne(job.id)}
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {job.company_logo_url ? (
                      <div className="w-9 h-9 rounded-lg bg-white p-0.5 shrink-0">
                        <Image
                          src={job.company_logo_url}
                          alt={companyName}
                          width={36}
                          height={36}
                          unoptimized
                          className="w-full h-full rounded-md object-contain"
                        />
                      </div>
                    ) : (
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: initialColor }}
                      >
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-text-primary truncate">
                        {job.title}
                      </span>
                      <span className="text-[11px] text-text-muted truncate">
                        {companyName}
                      </span>
                    </div>
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-medium"
                    style={{
                      backgroundColor: pillStyle.bg,
                      color: pillStyle.text,
                    }}
                  >
                    <StageIcon
                      stageName={stage?.name ?? "default"}
                      className="w-3.5 h-3.5 shrink-0"
                      color={stage?.color ?? undefined}
                    />
                    {stage?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-text-muted">
                  {jobType ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-text-muted">
                  {jobLevel ?? "—"}
                </TableCell>
                <TableCell className="text-xs text-text-primary">
                  {salary ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-text-muted">
                      {job.location ?? "—"}
                    </span>
                    {job.location_type && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-surface text-text-muted capitalize">
                        {job.location_type}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      deadline.isPast
                        ? "text-[11px] font-medium text-brand-red line-through"
                        : deadline.isUrgent
                          ? "text-[11px] font-medium text-brand-red"
                          : "text-[11px] text-text-muted"
                    }
                  >
                    {deadline.text}
                  </span>
                </TableCell>
                <TableCell>
                  <span
                    className={
                      appliedDate.isToday
                        ? "text-[11px] font-medium text-brand"
                        : "text-[11px] text-text-muted"
                    }
                  >
                    {appliedDate.text}
                  </span>
                </TableCell>
                <TableCell className="pr-4">
                  <span
                    className={
                      addedDate.isToday
                        ? "text-[11px] font-medium text-brand"
                        : "text-[11px] text-text-muted"
                    }
                  >
                    {addedDate.text}
                  </span>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
      {onPageChange && total > 0 && (
        <PaginationControls
          page={page}
          perPage={perPage}
          total={total}
          onPageChange={onPageChange}
        />
      )}
    </div>
  );
}
