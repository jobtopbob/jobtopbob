"use client";

import { Link2, StickyNote, Pin, ExternalLink } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Resource } from "@/hooks/use-resources";

const typeIcons: Record<string, typeof Link2> = {
  link: Link2,
  note: StickyNote,
};

const categoryLabels: Record<string, string> = {
  "interview-prep": "Interview Prep",
  "salary-negotiation": "Salary Negotiation",
  "resume-tips": "Resume Tips",
  networking: "Networking",
  "career-development": "Career Development",
  "company-research": "Company Research",
  other: "Other",
};

interface ResourceCardProps {
  resource: Resource;
  onClick: () => void;
  onTogglePin: () => void;
}

export function ResourceCard({
  resource,
  onClick,
  onTogglePin,
}: ResourceCardProps) {
  const Icon = typeIcons[resource.type] ?? Link2;

  return (
    <div
      onClick={onClick}
      className="flex flex-col gap-2.5 rounded-xl bg-card border border-border-subtle p-4 transition-colors hover:border-border-subtle/80 hover:bg-card/80 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-lg bg-surface shrink-0">
          <Icon className="w-4 h-4 text-text-muted" />
        </div>
        <div className="flex-1 min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate block text-left">
            {resource.title}
          </span>
          {resource.category && (
            <Badge variant="secondary" className="text-[10px] mt-1">
              {categoryLabels[resource.category] ?? resource.category}
            </Badge>
          )}
        </div>
        <button
          onClick={(e) => {
            e.stopPropagation();
            onTogglePin();
          }}
          className={`p-1 rounded transition-colors shrink-0 ${
            resource.pinned
              ? "text-brand"
              : "text-text-muted/40 hover:text-text-muted"
          }`}
          title={resource.pinned ? "Unpin" : "Pin"}
        >
          <Pin className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Description */}
      {resource.description && (
        <p className="text-xs text-text-muted line-clamp-2">
          {resource.description}
        </p>
      )}

      {/* URL */}
      {resource.url && (
        <a
          href={resource.url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-brand hover:underline truncate"
          onClick={(e) => e.stopPropagation()}
        >
          <ExternalLink className="w-3 h-3 shrink-0" />
          <span className="truncate">{resource.url}</span>
        </a>
      )}
    </div>
  );
}
