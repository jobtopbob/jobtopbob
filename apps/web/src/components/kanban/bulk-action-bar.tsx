"use client";

import { useState } from "react";
import { XIcon, TrashIcon, ArrowRightIcon } from "@phosphor-icons/react";
import { useBulkUpdateJobs } from "@/hooks/use-jobs";
import type { Stage } from "@/hooks/use-stages";
import { toast } from "sonner";

interface BulkActionBarProps {
  selectedIds: Set<string>;
  onClear: () => void;
  stages: Stage[];
}

export function BulkActionBar({ selectedIds, onClear, stages }: BulkActionBarProps) {
  const [stageMenuOpen, setStageMenuOpen] = useState(false);
  const bulkUpdate = useBulkUpdateJobs();
  const count = selectedIds.size;

  if (count === 0) return null;

  const ids = Array.from(selectedIds);

  const handleMoveToStage = async (stageId: string, stageName: string) => {
    setStageMenuOpen(false);
    try {
      const result = await bulkUpdate.mutateAsync({ job_ids: ids, stage_id: stageId });
      toast.success(`Moved ${result.affected} job${result.affected !== 1 ? "s" : ""} to ${stageName}`);
      onClear();
    } catch {
      toast.error("Failed to move jobs");
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Delete ${count} job${count !== 1 ? "s" : ""}? This cannot be undone.`)) return;
    try {
      const result = await bulkUpdate.mutateAsync({ job_ids: ids, delete: true });
      toast.success(`Deleted ${result.affected} job${result.affected !== 1 ? "s" : ""}`);
      onClear();
    } catch {
      toast.error("Failed to delete jobs");
    }
  };

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-3 rounded-xl bg-brand/5 border border-brand/20">
      <span className="text-sm font-medium text-text-primary">
        {count} selected
      </span>

      <div className="h-4 w-px bg-border-subtle" />

      {/* Move to stage */}
      <div className="relative">
        <button
          onClick={() => setStageMenuOpen(!stageMenuOpen)}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-card border border-border-subtle hover:bg-surface-hover transition-colors"
        >
          <ArrowRightIcon className="w-3.5 h-3.5" />
          Move to stage
        </button>
        {stageMenuOpen && (
          <>
            <div className="fixed inset-0 z-40" onClick={() => setStageMenuOpen(false)} />
            <div className="absolute left-0 top-full mt-1 z-50 w-48 rounded-lg bg-card border border-border-subtle shadow-lg py-1">
              {stages.map((stage) => (
                <button
                  key={stage.id}
                  onClick={() => handleMoveToStage(stage.id, stage.name)}
                  className="flex items-center gap-2 w-full px-3 py-1.5 text-xs text-text-primary hover:bg-surface-hover transition-colors"
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: stage.color ?? "#6B7280" }}
                  />
                  {stage.name}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Delete */}
      <button
        onClick={handleDelete}
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-brand-red bg-card border border-border-subtle hover:bg-red-50 dark:hover:bg-red-950/20 transition-colors"
      >
        <TrashIcon className="w-3.5 h-3.5" />
        Delete
      </button>

      <div className="flex-1" />

      {/* Clear */}
      <button
        onClick={onClear}
        className="flex items-center gap-1 text-xs text-text-muted hover:text-text-primary transition-colors"
      >
        <XIcon className="w-3.5 h-3.5" />
        Clear
      </button>
    </div>
  );
}
