"use client";

import { useState, useCallback } from "react";
import { Plus, SlidersHorizontal, X } from "lucide-react";
import { cn } from "@/lib/utils";
import { FilterPanel } from "./filter-panel";
import { SortPopover } from "./sort-popover";
import type { JobFilters } from "@/hooks/use-job-filters";
import type { Stage } from "@/hooks/use-stages";
import type { Tag } from "@/hooks/use-tags";

type View = "kanban" | "table" | "calendar";

interface ToolbarProps {
  activeView: View;
  onViewChange: (view: View) => void;
  onAddJob: () => void;
  filters: JobFilters;
  activeFilterCount: number;
  onApplyFilters: (draft: Partial<JobFilters>) => void;
  onResetFilters: () => void;
  onSearchChange: (search: string) => void;
  onSortByChange: (sortBy: string) => void;
  onSortOrderChange: (sortOrder: string) => void;
  stages?: Stage[];
  tags?: Tag[];
}

const views: { id: View; label: string }[] = [
  { id: "kanban", label: "Kanban" },
  { id: "table", label: "Table" },
  { id: "calendar", label: "Calendar" },
];

export function Toolbar({
  activeView,
  onViewChange,
  onAddJob,
  filters,
  activeFilterCount,
  onApplyFilters,
  onResetFilters,
  onSearchChange,
  onSortByChange,
  onSortOrderChange,
  stages,
  tags,
}: ToolbarProps) {
  const [filterOpen, setFilterOpen] = useState(false);

  return (
    <div className="space-y-0">
      <div className="flex items-center justify-between h-[52px] px-4 lg:px-7">
        {/* Left: View Switcher */}
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 rounded-full bg-surface p-1 h-9">
            {views.map((view) => (
              <button
                key={view.id}
                onClick={() => onViewChange(view.id)}
                className={cn(
                  "px-4 py-1.5 rounded-full text-xs font-medium transition-all",
                  activeView === view.id
                    ? "bg-card text-text-primary shadow-sm"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                {view.id === "kanban" ? (
                  <>
                    <span className="lg:hidden">List</span>
                    <span className="hidden lg:inline">Kanban</span>
                  </>
                ) : (
                  view.label
                )}
              </button>
            ))}
          </div>
        </div>

        {/* Right: Actions */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Filter Button */}
          <div className="relative">
            <button
              onClick={() => setFilterOpen(!filterOpen)}
              className={cn(
                "flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full border bg-card text-xs lg:text-sm font-medium shadow-sm hover:bg-surface-hover transition-colors",
                filterOpen
                  ? "border-brand text-brand"
                  : "border-border-subtle text-text-primary"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Filter</span>
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold leading-none">
                  {activeFilterCount}
                </span>
              )}
            </button>
            <FilterPanel
              open={filterOpen}
              onOpenChange={setFilterOpen}
              filters={filters}
              onApply={onApplyFilters}
              onReset={onResetFilters}
              onSearchChange={onSearchChange}
            />
          </div>

          {/* Sort Dropdown */}
          <SortPopover
            sortBy={filters.sortBy}
            sortOrder={filters.sortOrder}
            onSortByChange={onSortByChange}
            onSortOrderChange={onSortOrderChange}
          />

          {/* Add Job */}
          <button
            onClick={onAddJob}
            className="flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full bg-brand text-xs lg:text-sm font-medium text-background hover:bg-brand/90"
          >
            <Plus className="w-4 h-4 lg:w-5 lg:h-5" />
            <span className="hidden sm:inline">Add Job</span>
            <span className="sm:hidden">Add</span>
          </button>
        </div>
      </div>

      {/* Active Filter Pills */}
      <ActiveFilterPills
        filters={filters}
        stages={stages}
        tags={tags}
        onRemoveFilter={onApplyFilters}
        onClearAll={onResetFilters}
      />
    </div>
  );
}

function ActiveFilterPills({
  filters,
  stages,
  tags,
  onRemoveFilter,
  onClearAll,
}: {
  filters: JobFilters;
  stages?: Stage[];
  tags?: Tag[];
  onRemoveFilter: (draft: Partial<JobFilters>) => void;
  onClearAll: () => void;
}) {
  const pills: { label: string; onRemove: () => void }[] = [];

  // Status pills
  for (const status of filters.statuses) {
    pills.push({
      label: `Status: ${status.charAt(0).toUpperCase() + status.slice(1)}`,
      onRemove: () =>
        onRemoveFilter({
          statuses: filters.statuses.filter((s) => s !== status),
        }),
    });
  }

  // Stage pills
  for (const stageId of filters.stageIds) {
    const stage = stages?.find((s) => s.id === stageId);
    pills.push({
      label: `Stage: ${stage?.name ?? stageId.slice(0, 8)}`,
      onRemove: () =>
        onRemoveFilter({
          stageIds: filters.stageIds.filter((s) => s !== stageId),
        }),
    });
  }

  // Location type pills
  for (const lt of filters.locationTypes) {
    pills.push({
      label: lt.charAt(0).toUpperCase() + lt.slice(1),
      onRemove: () =>
        onRemoveFilter({
          locationTypes: filters.locationTypes.filter((l) => l !== lt),
        }),
    });
  }

  // Source pills
  for (const source of filters.sources) {
    pills.push({
      label: `Source: ${source.charAt(0).toUpperCase() + source.slice(1)}`,
      onRemove: () =>
        onRemoveFilter({
          sources: filters.sources.filter((s) => s !== source),
        }),
    });
  }

  // Tag pills
  for (const tagId of filters.tagIds) {
    const tag = tags?.find((t) => t.id === tagId);
    pills.push({
      label: `Tag: ${tag?.name ?? tagId.slice(0, 8)}`,
      onRemove: () =>
        onRemoveFilter({
          tagIds: filters.tagIds.filter((t) => t !== tagId),
        }),
    });
  }

  // Date pills
  if (filters.createdAfter) {
    pills.push({
      label: `From: ${filters.createdAfter}`,
      onRemove: () => onRemoveFilter({ createdAfter: "" }),
    });
  }
  if (filters.createdBefore) {
    pills.push({
      label: `To: ${filters.createdBefore}`,
      onRemove: () => onRemoveFilter({ createdBefore: "" }),
    });
  }

  if (pills.length === 0) return null;

  return (
    <div className="flex items-center gap-2 px-4 lg:px-7 pb-2 overflow-x-auto scrollbar-none">
      {pills.map((pill, i) => (
        <button
          key={i}
          onClick={pill.onRemove}
          className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-surface text-[11px] font-medium text-text-primary hover:bg-surface-hover transition-colors group"
        >
          {pill.label}
          <X className="w-3 h-3 text-text-muted group-hover:text-text-primary" />
        </button>
      ))}
      <button
        onClick={onClearAll}
        className="shrink-0 px-2 py-1 text-[11px] font-medium text-brand hover:text-brand/70 transition-colors"
      >
        Clear all
      </button>
    </div>
  );
}
