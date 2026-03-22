"use client";

import { useDroppable } from "@dnd-kit/react";
import type { Job } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { JobCard } from "./job-card";
import { StageIcon } from "./stage-icons";

export const STAGE_DOT_COLORS: Record<string, string> = {
  saved: "#7B8494",
  applied: "#3366CC",
  interviewing: "#C49B30",
  offer: "#0F7B4F",
  closed: "#8C8484",
  // Fallback color cycle for custom stages
  default: "#7B8494",
};

export function getDotColor(stageName: string): string {
  const key = stageName.toLowerCase();
  return STAGE_DOT_COLORS[key] ?? STAGE_DOT_COLORS.default;
}

interface KanbanColumnProps {
  stage: Stage;
  jobs: Job[];
  onJobClick: (job: Job) => void;
}

export function KanbanColumn({ stage, jobs, onJobClick }: KanbanColumnProps) {
  const { ref, isDropTarget } = useDroppable({
    id: stage.id,
  });

  const dotColor = getDotColor(stage.name);
  const isClosed = !!stage.is_terminal && stage.mapped_status === "closed";

  return (
    <div
      ref={ref}
      className="flex flex-col rounded-xl bg-[#F5F5F7] border border-[#EBEBEF] w-[280px] min-w-[280px] shrink-0 overflow-hidden"
      style={{
        outline: isDropTarget ? "2px solid #FF8400" : undefined,
        outlineOffset: -2,
      }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 h-10 px-3 shrink-0">
        <StageIcon stageName={stage.name} className="w-5 h-5 shrink-0" color={dotColor} />
        <span className="text-[13px] font-semibold text-[#1A1A2E] flex-1 truncate">
          {stage.name}
        </span>
        <span className="flex items-center justify-center w-5 h-5 rounded-full bg-[#F5F5F7] text-[11px] font-medium text-[#8B8FA3]">
          {jobs.length}
        </span>
      </div>

      {/* Cards */}
      <div className="flex-1 overflow-y-auto px-2.5 pb-3 pt-2 space-y-2.5">
        {jobs.length === 0 ? (
          <p className="text-center text-xs text-[#8B8FA3] py-8">
            No jobs in this stage
          </p>
        ) : (
          jobs.map((job) => (
            <JobCard
              key={job.id}
              job={job}
              onClick={() => onJobClick(job)}
              isClosedColumn={isClosed}
            />
          ))
        )}
      </div>
    </div>
  );
}
