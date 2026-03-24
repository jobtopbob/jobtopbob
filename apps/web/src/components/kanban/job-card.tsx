"use client";

import Image from "next/image";
import { useDraggable } from "@dnd-kit/react";
import type { Job } from "@/hooks/use-jobs";
import type { Tag } from "@/hooks/use-tags";

interface JobCardProps {
  job: Job;
  onClick: () => void;
  isClosedColumn?: boolean;
}

export function formatRelativeDate(dateStr: string | null | undefined): {
  text: string;
  isToday: boolean;
} {
  if (!dateStr) return { text: "", isToday: false };
  const date = new Date(dateStr);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays === 0) return { text: "Today", isToday: true };
  if (diffDays === 1) return { text: "1d", isToday: false };
  if (diffDays < 30) return { text: `${diffDays}d`, isToday: false };
  if (diffDays < 365)
    return { text: `${Math.floor(diffDays / 30)}mo`, isToday: false };
  return { text: `${Math.floor(diffDays / 365)}y`, isToday: false };
}

export function formatSalary(
  min: number | null | undefined,
  max: number | null | undefined
): string | null {
  if (!min && !max) return null;
  const fmt = (n: number) => {
    if (n >= 1000) return `$${Math.round(n / 1000)}k`;
    return `$${n}`;
  };
  if (min && max) return `${fmt(min)}-${fmt(max)}`;
  if (min) return `${fmt(min)}+`;
  if (max) return `up to ${fmt(max)}`;
  return null;
}

export function JobCard({ job, onClick, isClosedColumn }: JobCardProps) {
  const { ref, isDragging } = useDraggable({
    id: job.id,
    data: { stageId: job.stage_id },
  });

  const date = formatRelativeDate(job.created_at);
  const salary = formatSalary(job.salary_min, job.salary_max);
  const tags = (job.tags ?? []) as Tag[];
  const displayTags = tags.slice(0, 3);

  return (
    <div
      ref={ref}
      onClick={onClick}
      className="flex flex-col gap-2 p-3 rounded-[10px] bg-card border border-border-subtle shadow-[0_1px_3px_rgba(0,0,0,0.04)] cursor-pointer hover:border-border-dashed transition-colors"
      style={{ opacity: isDragging ? 0.5 : isClosedColumn ? 0.6 : 1 }}
    >
      {/* Company */}
      <div className="flex items-center gap-1.5">
        {job.company_logo_url && (
          <Image
            src={job.company_logo_url}
            alt=""
            width={16}
            height={16}
            unoptimized
            className="w-4 h-4 rounded-sm object-contain"
          />
        )}
        <span className="text-xs font-medium text-text-muted">
          {job.company_name ?? "Unknown Company"}
        </span>
      </div>

      {/* Title */}
      <span className="text-sm font-medium text-text-primary leading-tight">
        {job.title}
      </span>

      {/* Meta: location · salary */}
      {(job.location || salary) && (
        <div className="flex items-center gap-1.5 text-[10px] text-text-muted">
          {job.location && <span>{job.location}</span>}
          {job.location && salary && <span>·</span>}
          {salary && <span>{salary}</span>}
        </div>
      )}

      {/* Bottom: tags + date */}
      <div className="flex items-center justify-between">
        <div className="flex gap-1">
          {displayTags.map((tag) => (
            <span
              key={tag.id}
              className="px-[7px] py-[2px] rounded-full bg-surface text-[9px] text-text-muted"
            >
              {tag.name}
            </span>
          ))}
          {tags.length > 3 && (
            <span className="px-[7px] py-[2px] rounded-full bg-surface text-[9px] text-text-muted">
              +{tags.length - 3}
            </span>
          )}
        </div>
        {date.text && (
          <span
            className={
              date.isToday
                ? "text-[9px] font-medium text-brand"
                : "text-[9px] text-text-muted"
            }
          >
            {date.text}
          </span>
        )}
      </div>
    </div>
  );
}
