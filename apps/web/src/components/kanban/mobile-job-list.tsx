"use client";

import { useState } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";
import type { Job } from "@/hooks/use-jobs";
import { useUpdateJob } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { getDotColor } from "./kanban-column";
import { StageIcon } from "./stage-icons";
import { formatRelativeDate } from "./job-card";
import { formatSalaryRange } from "@/lib/currency";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";

interface MobileJobListProps {
  stages: Stage[];
  jobsByStage: Map<string, Job[]>;
  onJobClick: (job: Job) => void;
}

export function MobileJobList({
  stages,
  jobsByStage,
  onJobClick,
}: MobileJobListProps) {
  const [expandedStages, setExpandedStages] = useState<Set<string>>(() => {
    // Expand stages that have jobs by default
    const expanded = new Set<string>();
    for (const stage of stages) {
      const jobs = jobsByStage.get(stage.id) ?? [];
      if (jobs.length > 0) expanded.add(stage.id);
    }
    return expanded;
  });

  const toggleStage = (stageId: string) => {
    setExpandedStages((prev) => {
      const next = new Set(prev);
      if (next.has(stageId)) {
        next.delete(stageId);
      } else {
        next.add(stageId);
      }
      return next;
    });
  };

  return (
    <div className="flex flex-col gap-3 overflow-y-auto pb-4">
      {stages.map((stage) => {
        const jobs = jobsByStage.get(stage.id) ?? [];
        const isExpanded = expandedStages.has(stage.id);
        const dotColor = getDotColor(stage.name, stage.color);

        return (
          <div
            key={stage.id}
            className="rounded-xl bg-surface border border-border-subtle overflow-hidden"
          >
            {/* Stage header */}
            <button
              onClick={() => toggleStage(stage.id)}
              className="flex items-center gap-2 w-full h-11 px-4 text-left"
            >
              <StageIcon stageName={stage.name} className="w-5 h-5 shrink-0" color={dotColor} />
              <span className="text-sm font-semibold text-text-primary flex-1">
                {stage.name}
              </span>
              <span className="flex items-center justify-center min-w-[22px] h-[22px] px-1.5 rounded-full bg-card text-xs font-medium text-text-muted">
                {jobs.length}
              </span>
              <ChevronDown
                className={cn(
                  "w-4 h-4 text-text-muted transition-transform",
                  isExpanded && "rotate-180"
                )}
              />
            </button>

            {/* Job rows */}
            {isExpanded && (
              <div className="px-2.5 pb-2.5 space-y-2">
                {jobs.length === 0 ? (
                  <p className="text-center text-xs text-text-muted py-6">
                    No jobs in this stage
                  </p>
                ) : (
                  jobs.map((job) => (
                    <MobileJobRow
                      key={job.id}
                      job={job}
                      stages={stages}
                      onClick={() => onJobClick(job)}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

interface MobileJobRowProps {
  job: Job;
  stages: Stage[];
  onClick: () => void;
}

function MobileJobRow({ job, stages, onClick }: MobileJobRowProps) {
  const updateJob = useUpdateJob();
  const date = formatRelativeDate(job.created_at);
  const salary = formatSalaryRange(job.salary_min, job.salary_max, { currency: job.salary_currency, interval: job.salary_interval, compact: true });

  const handleStageChange = (newStageId: string | null) => {
    if (!newStageId || newStageId === job.stage_id) return;
    updateJob.mutate(
      { id: job.id, body: { stage_id: newStageId } },
      {
        onError: () => {
          toast.error("Failed to move job. Please try again.");
        },
      }
    );
  };

  return (
    <div className="flex items-center gap-3 p-3 rounded-[10px] bg-card border border-border-subtle shadow-[0_1px_3px_rgba(0,0,0,0.04)]">
      {/* Job info — tappable */}
      <div className="flex-1 min-w-0 cursor-pointer" onClick={onClick}>
        <span className="text-xs font-medium text-text-muted block truncate">
          {job.company_name ?? "Unknown Company"}
        </span>
        <span className="text-sm font-medium text-text-primary block truncate mt-0.5">
          {job.title}
        </span>
        <div className="flex items-center gap-1.5 mt-1 text-[11px] text-text-muted">
          {job.location && <span className="truncate">{job.location}</span>}
          {job.location && salary && <span>·</span>}
          {salary && <span className="shrink-0">{salary}</span>}
          {date.text && (
            <>
              <span>·</span>
              <span
                className={cn(
                  "shrink-0",
                  date.isToday && "text-brand font-medium"
                )}
              >
                {date.text}
              </span>
            </>
          )}
        </div>
      </div>

      {/* Stage selector */}
      <div
        className="shrink-0"
        onClick={(e) => e.stopPropagation()}
      >
        <Select value={job.stage_id ?? ""} onValueChange={handleStageChange}>
          <SelectTrigger
            size="sm"
            className="text-xs h-7 px-2 max-w-[100px]"
          >
            <SelectValue placeholder="Stage">
              {stages.find((s) => s.id === job.stage_id)?.name ?? "Stage"}
            </SelectValue>
          </SelectTrigger>
          <SelectContent align="end">
            {stages.map((stage) => (
              <SelectItem key={stage.id} value={stage.id}>
                <StageIcon stageName={stage.name} className="w-3.5 h-3.5 shrink-0" color={getDotColor(stage.name, stage.color)} />
                {stage.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
    </div>
  );
}
