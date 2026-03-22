"use client";

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
import { formatSalary } from "./job-card";
import { PaginationControls } from "./pagination-controls";
import { StageIcon } from "./stage-icons";

interface ApplicationsTableProps {
  jobs: Job[];
  stages: Stage[];
  onJobClick: (job: Job) => void;
  page?: number;
  perPage?: number;
  total?: number;
  onPageChange?: (page: number) => void;
}

function getStagePillStyle(stage: Stage | undefined): {
  bg: string;
  text: string;
} {
  if (!stage?.color) return { bg: "#F5F5F7", text: "#8B8FA3" };
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

const SOURCE_LABELS: Record<string, string> = {
  linkedin: "LinkedIn",
  indeed: "Indeed",
  glassdoor: "Glassdoor",
  adzuna: "Adzuna",
  company_website: "Company Site",
  manual: "Manual",
  other: "Other",
};

function formatSource(source: string | null | undefined): string {
  if (!source) return "Manual";
  return SOURCE_LABELS[source] ?? source.charAt(0).toUpperCase() + source.slice(1);
}

export function ApplicationsTable({
  jobs,
  stages,
  onJobClick,
  page = 1,
  perPage = 25,
  total = 0,
  onPageChange,
}: ApplicationsTableProps) {
  const stageMap = new Map(stages.map((s) => [s.id, s]));

  if (jobs.length === 0) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-[#1A1A2E] font-medium">
            No applications yet
          </p>
          <p className="text-xs text-[#8B8FA3] mt-1">
            Add a job to start tracking your applications.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-auto">
      <Table className="min-w-[1000px]">
        <TableHeader>
          <TableRow className="border-b border-[#EBEBEF] hover:bg-transparent">
            <TableHead className="w-10 bg-[#F5F5F7] pl-4">
              <Checkbox aria-label="Select all" />
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold">
              Product / Job
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold w-[80px]">
              Stage
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold w-[120px]">
              Salary
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold">
              Location
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold w-[90px]">
              Source
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold w-[90px]">
              Applied
            </TableHead>
            <TableHead className="bg-[#F5F5F7] text-[#8B8FA3] text-xs font-semibold w-[90px] pr-4">
              Added
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {jobs.map((job) => {
            const stage = job.stage_id ? stageMap.get(job.stage_id) : undefined;
            const pillStyle = getStagePillStyle(stage);
            const salary = formatSalary(
              job.salary_min,
              job.salary_max,
              job.salary_currency
            );
            const appliedDate = formatDate(job.applied_at);
            const addedDate = formatDate(job.created_at);
            const companyName = job.company_name ?? "Unknown";
            const initialColor = getCompanyInitialColor(companyName);

            return (
              <TableRow
                key={job.id}
                onClick={() => onJobClick(job)}
                className="border-b border-[#EBEBEF] cursor-pointer hover:bg-[#FAFAFA]"
              >
                <TableCell
                  className="pl-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Checkbox aria-label={`Select ${job.title}`} />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-2.5">
                    {job.company_logo_url ? (
                      <img
                        src={job.company_logo_url}
                        alt={companyName}
                        className="w-9 h-9 rounded-lg shrink-0 object-contain"
                      />
                    ) : (
                      <div
                        className="flex items-center justify-center w-9 h-9 rounded-lg text-white text-xs font-semibold shrink-0"
                        style={{ backgroundColor: initialColor }}
                      >
                        {companyName.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div className="flex flex-col gap-0.5 min-w-0">
                      <span className="text-xs font-medium text-[#1A1A2E] truncate">
                        {job.title}
                      </span>
                      <span className="text-[11px] text-[#8B8FA3] truncate">
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
                    />
                    {stage?.name ?? "—"}
                  </span>
                </TableCell>
                <TableCell className="text-xs text-[#1A1A2E]">
                  {salary ?? "—"}
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <span className="text-xs text-[#8B8FA3]">
                      {job.location ?? "—"}
                    </span>
                    {job.location_type && (
                      <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F5F5F7] text-[#8B8FA3] capitalize">
                        {job.location_type}
                      </span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-xs text-[#8B8FA3]">
                  {formatSource(job.source)}
                </TableCell>
                <TableCell>
                  <span
                    className={
                      appliedDate.isToday
                        ? "text-[11px] font-medium text-[#FF8400]"
                        : "text-[11px] text-[#8B8FA3]"
                    }
                  >
                    {appliedDate.text}
                  </span>
                </TableCell>
                <TableCell className="pr-4">
                  <span
                    className={
                      addedDate.isToday
                        ? "text-[11px] font-medium text-[#FF8400]"
                        : "text-[11px] text-[#8B8FA3]"
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
