"use client";

import { useState, useCallback, useEffect, useRef } from "react";
import { Search, X, Calendar } from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { useStages, type Stage } from "@/hooks/use-stages";
import { useTags, type Tag } from "@/hooks/use-tags";
import { useMediaQuery } from "@/hooks/use-media-query";
import type { JobFilters } from "@/hooks/use-job-filters";
import { StageIcon } from "./stage-icons";

const STATUS_OPTIONS = [
  { value: "applied", label: "Applied" },
  { value: "interviewing", label: "Interviewing" },
  { value: "accepted", label: "Accepted" },
  { value: "rejected", label: "Rejected" },
  { value: "closed", label: "Closed" },
];

const LOCATION_TYPE_OPTIONS = [
  { value: "remote", label: "Remote" },
  { value: "hybrid", label: "Hybrid" },
  { value: "on-site", label: "On-site" },
];

const SOURCE_OPTIONS = [
  { value: "linkedin", label: "LinkedIn" },
  { value: "indeed", label: "Indeed" },
  { value: "glassdoor", label: "Glassdoor" },
  { value: "company_site", label: "Company Site" },
  { value: "referral", label: "Referral" },
  { value: "other", label: "Other" },
];

interface FilterDraft {
  search: string;
  statuses: string[];
  stageIds: string[];
  locationTypes: string[];
  sources: string[];
  tagIds: string[];
  createdAfter: string;
  createdBefore: string;
}

function draftFromFilters(filters: JobFilters): FilterDraft {
  return {
    search: filters.search,
    statuses: [...filters.statuses],
    stageIds: [...filters.stageIds],
    locationTypes: [...filters.locationTypes],
    sources: [...filters.sources],
    tagIds: [...filters.tagIds],
    createdAfter: filters.createdAfter,
    createdBefore: filters.createdBefore,
  };
}

interface FilterPanelProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  filters: JobFilters;
  onApply: (draft: Partial<JobFilters>) => void;
  onReset: () => void;
  onSearchChange: (search: string) => void;
}

export function FilterPanel({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
  onSearchChange,
}: FilterPanelProps) {
  const isDesktop = useMediaQuery("(min-width: 1024px)");

  if (isDesktop) {
    return (
      <DesktopFilterPopover
        open={open}
        onOpenChange={onOpenChange}
        filters={filters}
        onApply={onApply}
        onReset={onReset}
        onSearchChange={onSearchChange}
      />
    );
  }

  return (
    <MobileFilterSheet
      open={open}
      onOpenChange={onOpenChange}
      filters={filters}
      onApply={onApply}
      onReset={onReset}
      onSearchChange={onSearchChange}
    />
  );
}

function DesktopFilterPopover({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
  onSearchChange,
}: FilterPanelProps) {
  const panelRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    function handleClickOutside(e: MouseEvent) {
      if (panelRef.current && !panelRef.current.contains(e.target as Node)) {
        onOpenChange(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [open, onOpenChange]);

  if (!open) return null;

  return (
    <div
      ref={panelRef}
      className="absolute right-0 top-full mt-2 z-50 w-[380px] bg-white rounded-2xl border border-[#EBEBEF] shadow-xl animate-in fade-in-0 zoom-in-95 duration-150"
    >
      <FilterContent
        filters={filters}
        onApply={(draft) => {
          onApply(draft);
          onOpenChange(false);
        }}
        onReset={() => {
          onReset();
          onOpenChange(false);
        }}
        onSearchChange={onSearchChange}
      />
    </div>
  );
}

function MobileFilterSheet({
  open,
  onOpenChange,
  filters,
  onApply,
  onReset,
  onSearchChange,
}: FilterPanelProps) {
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side="bottom" className="h-[85vh] rounded-t-2xl p-0">
        <SheetHeader className="px-5 pt-5 pb-0">
          <SheetTitle className="text-base font-semibold text-[#1A1A2E]">
            Filters
          </SheetTitle>
        </SheetHeader>
        <FilterContent
          filters={filters}
          onApply={(draft) => {
            onApply(draft);
            onOpenChange(false);
          }}
          onReset={() => {
            onReset();
            onOpenChange(false);
          }}
          onSearchChange={onSearchChange}
        />
      </SheetContent>
    </Sheet>
  );
}

function FilterContent({
  filters,
  onApply,
  onReset,
  onSearchChange,
}: {
  filters: JobFilters;
  onApply: (draft: Partial<JobFilters>) => void;
  onReset: () => void;
  onSearchChange: (search: string) => void;
}) {
  const { data: stages } = useStages();
  const { data: tags } = useTags();
  const [draft, setDraft] = useState<FilterDraft>(() =>
    draftFromFilters(filters)
  );
  const searchTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Sync draft when filters change externally
  useEffect(() => {
    setDraft(draftFromFilters(filters));
  }, [filters]);

  const toggleArrayValue = useCallback(
    (key: keyof Pick<FilterDraft, "statuses" | "stageIds" | "locationTypes" | "sources" | "tagIds">, value: string) => {
      setDraft((prev) => {
        const arr = prev[key];
        const next = arr.includes(value)
          ? arr.filter((v) => v !== value)
          : [...arr, value];
        return { ...prev, [key]: next };
      });
    },
    []
  );

  const handleSearchChange = useCallback(
    (value: string) => {
      setDraft((prev) => ({ ...prev, search: value }));
      if (searchTimerRef.current) clearTimeout(searchTimerRef.current);
      searchTimerRef.current = setTimeout(() => {
        onSearchChange(value);
      }, 300);
    },
    [onSearchChange]
  );

  const handleApply = useCallback(() => {
    onApply({
      statuses: draft.statuses,
      stageIds: draft.stageIds,
      locationTypes: draft.locationTypes,
      sources: draft.sources,
      tagIds: draft.tagIds,
      createdAfter: draft.createdAfter,
      createdBefore: draft.createdBefore,
    });
  }, [draft, onApply]);

  const draftHasChanges =
    draft.statuses.length > 0 ||
    draft.stageIds.length > 0 ||
    draft.locationTypes.length > 0 ||
    draft.sources.length > 0 ||
    draft.tagIds.length > 0 ||
    draft.createdAfter !== "" ||
    draft.createdBefore !== "";

  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5 max-h-[70vh]">
        {/* Search */}
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-[#8B8FA3]" />
          <input
            type="text"
            value={draft.search}
            onChange={(e) => handleSearchChange(e.target.value)}
            placeholder="Search jobs..."
            className="w-full h-9 pl-9 pr-3 rounded-lg border border-[#EBEBEF] bg-[#F9F9FB] text-sm text-[#1A1A2E] placeholder:text-[#8B8FA3] focus:outline-none focus:border-[#FF8400] focus:ring-1 focus:ring-[#FF8400]/20 transition-colors"
          />
          {draft.search && (
            <button
              onClick={() => handleSearchChange("")}
              className="absolute right-3 top-1/2 -translate-y-1/2"
            >
              <X className="w-3.5 h-3.5 text-[#8B8FA3] hover:text-[#1A1A2E]" />
            </button>
          )}
        </div>

        {/* Status */}
        <FilterSection title="Status">
          <div className="grid grid-cols-2 gap-2.5">
            {STATUS_OPTIONS.map((opt) => (
              <CheckboxRow
                key={opt.value}
                label={opt.label}
                checked={draft.statuses.includes(opt.value)}
                onToggle={() => toggleArrayValue("statuses", opt.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Stage */}
        {stages && stages.length > 0 && (
          <FilterSection title="Stage">
            <div className="grid grid-cols-2 gap-2.5">
              {stages.map((stage: Stage) => (
                <CheckboxRow
                  key={stage.id}
                  label={stage.name}
                  checked={draft.stageIds.includes(stage.id)}
                  onToggle={() => toggleArrayValue("stageIds", stage.id)}
                  colorDot={stage.color}
                  stageName={stage.name}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Location Type */}
        <FilterSection title="Location Type">
          <div className="grid grid-cols-2 gap-2.5">
            {LOCATION_TYPE_OPTIONS.map((opt) => (
              <CheckboxRow
                key={opt.value}
                label={opt.label}
                checked={draft.locationTypes.includes(opt.value)}
                onToggle={() => toggleArrayValue("locationTypes", opt.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Source */}
        <FilterSection title="Source">
          <div className="grid grid-cols-2 gap-2.5">
            {SOURCE_OPTIONS.map((opt) => (
              <CheckboxRow
                key={opt.value}
                label={opt.label}
                checked={draft.sources.includes(opt.value)}
                onToggle={() => toggleArrayValue("sources", opt.value)}
              />
            ))}
          </div>
        </FilterSection>

        {/* Tags */}
        {tags && tags.length > 0 && (
          <FilterSection title="Tags">
            <div className="grid grid-cols-2 gap-2.5">
              {tags.map((tag: Tag) => (
                <CheckboxRow
                  key={tag.id}
                  label={tag.name}
                  checked={draft.tagIds.includes(tag.id)}
                  onToggle={() => toggleArrayValue("tagIds", tag.id)}
                  colorDot={tag.color}
                />
              ))}
            </div>
          </FilterSection>
        )}

        {/* Date Range */}
        <FilterSection title="Date Range">
          <div className="grid grid-cols-2 gap-3">
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8FA3] pointer-events-none" />
              <input
                type="date"
                value={draft.createdAfter}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, createdAfter: e.target.value }))
                }
                className="w-full h-9 pl-9 pr-2 rounded-lg border border-[#EBEBEF] bg-[#F9F9FB] text-xs text-[#1A1A2E] focus:outline-none focus:border-[#FF8400] focus:ring-1 focus:ring-[#FF8400]/20 transition-colors"
              />
            </div>
            <div className="relative">
              <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-[#8B8FA3] pointer-events-none" />
              <input
                type="date"
                value={draft.createdBefore}
                onChange={(e) =>
                  setDraft((d) => ({ ...d, createdBefore: e.target.value }))
                }
                className="w-full h-9 pl-9 pr-2 rounded-lg border border-[#EBEBEF] bg-[#F9F9FB] text-xs text-[#1A1A2E] focus:outline-none focus:border-[#FF8400] focus:ring-1 focus:ring-[#FF8400]/20 transition-colors"
              />
            </div>
          </div>
        </FilterSection>
      </div>

      {/* Action Buttons */}
      <div className="flex items-center gap-3 px-5 py-4 border-t border-[#F0F0F3]">
        <button
          onClick={onReset}
          className="flex-1 h-9 rounded-full border border-[#EBEBEF] text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors"
        >
          Reset
        </button>
        <button
          onClick={handleApply}
          className="flex-1 h-9 rounded-full bg-[#FF8400] text-sm font-medium text-[#111111] hover:bg-[#FF8400]/90 transition-colors"
        >
          Apply Filters
        </button>
      </div>
    </div>
  );
}

function FilterSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="space-y-2.5 pt-1">
      <div className="border-t border-[#F0F0F3] pt-4">
        <h4 className="text-[11px] font-semibold text-[#8B8FA3] uppercase tracking-wider mb-2.5">
          {title}
        </h4>
        {children}
      </div>
    </div>
  );
}

function CheckboxRow({
  label,
  checked,
  onToggle,
  colorDot,
  stageName,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  colorDot?: string | null;
  stageName?: string;
}) {
  return (
    <button
      onClick={onToggle}
      className="flex items-center gap-2 py-1 text-left group"
    >
      <Checkbox
        checked={checked}
        className="data-checked:border-[#FF8400] data-checked:bg-[#FF8400] pointer-events-none"
      />
      {stageName && colorDot ? (
        <StageIcon stageName={stageName} className="w-4 h-4 shrink-0" color={colorDot} />
      ) : colorDot ? (
        <span
          className="w-2 h-2 rounded-full shrink-0"
          style={{ backgroundColor: colorDot }}
        />
      ) : null}
      <span className="text-[13px] font-medium text-[#1A1A2E] group-hover:text-[#FF8400] transition-colors truncate">
        {label}
      </span>
    </button>
  );
}
