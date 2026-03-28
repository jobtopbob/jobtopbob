"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  BookOpen,
  ArrowUpDown,
  SlidersHorizontal,
  X,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import {
  useResources,
  useToggleResourcePin,
  defaultResourceFilters,
  type ResourceFilters,
} from "@/hooks/use-resources";
import { ResourceCard } from "@/components/resources/resource-card";
import { ResourceDetailSheet } from "@/components/resources/resource-detail-sheet";
import { AddResourceDialog } from "@/components/resources/add-resource-dialog";
import { PaginationControls } from "@/components/kanban/pagination-controls";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Added" },
  { value: "updated_at", label: "Last Updated" },
  { value: "title", label: "Title" },
];

const TYPE_OPTIONS = [
  { value: "link", label: "Link" },
  { value: "note", label: "Note" },
];

const CATEGORY_OPTIONS = [
  { value: "interview-prep", label: "Interview Prep" },
  { value: "salary-negotiation", label: "Salary Negotiation" },
  { value: "resume-tips", label: "Resume Tips" },
  { value: "networking", label: "Networking" },
  { value: "career-development", label: "Career Development" },
  { value: "company-research", label: "Company Research" },
  { value: "other", label: "Other" },
];

function getOrderLabels(sortBy: string) {
  if (sortBy === "title") return { asc: "A → Z", desc: "Z → A" };
  return { asc: "Oldest First", desc: "Newest First" };
}

export default function ResourcesPage() {
  const [filters, setFilters] =
    useState<ResourceFilters>(defaultResourceFilters);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const activeFilters: ResourceFilters = {
    ...filters,
    search: debouncedSearch,
  };

  const { data: result, isLoading, error } = useResources(activeFilters);
  const togglePin = useToggleResourcePin();

  const [selectedResourceId, setSelectedResourceId] = useState<string | null>(
    null
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const resources = result?.data ?? [];
  const total = result?.total ?? 0;

  const updateFilter = useCallback(
    (patch: Partial<ResourceFilters>) => {
      setFilters((prev) => ({ ...prev, page: 1, ...patch }));
    },
    []
  );

  const activeFilterCount = filters.types.length + filters.categories.length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            Unable to load resources
          </p>
          <p className="text-xs text-text-muted mt-1">
            Check that the API server is running and try again.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full bg-background">
      <div className="flex-1 flex flex-col gap-5 p-7 pt-7 overflow-y-auto">
        {/* Page Header */}
        <div className="flex items-start justify-between">
          <div>
            <h1
              className="text-4xl font-bold text-text-primary tracking-tight"
              style={{ letterSpacing: -1 }}
            >
              Resources
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {isLoading ? "Loading..." : `${total} resources saved`}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Resource
          </Button>
        </div>

        {/* Toolbar */}
        <div className="flex items-center gap-2 flex-wrap">
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search resources..."
              className="pl-9"
            />
          </div>

          {/* Filter */}
          <DropdownMenu>
            <DropdownMenuTrigger
              className={cn(
                "flex items-center gap-1.5 h-10 px-4 rounded-full border text-sm font-medium transition-colors outline-none",
                activeFilterCount > 0
                  ? "border-brand text-brand"
                  : "border-border-subtle text-text-primary hover:bg-surface-hover"
              )}
            >
              <SlidersHorizontal className="w-3.5 h-3.5" />
              Filter
              {activeFilterCount > 0 && (
                <span className="flex items-center justify-center min-w-[18px] h-[18px] px-1 rounded-full bg-brand text-white text-[10px] font-bold">
                  {activeFilterCount}
                </span>
              )}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-[220px]"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Type</DropdownMenuLabel>
                {TYPE_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.types.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        types: checked
                          ? [...filters.types, opt.value]
                          : filters.types.filter((t) => t !== opt.value),
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Category</DropdownMenuLabel>
                {CATEGORY_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.categories.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        categories: checked
                          ? [...filters.categories, opt.value]
                          : filters.categories.filter((c) => c !== opt.value),
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-subtle text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors outline-none">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ??
                "Sort"}
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              sideOffset={8}
              className="w-[200px]"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.sortBy}
                  onValueChange={(v) => updateFilter({ sortBy: v })}
                >
                  {SORT_OPTIONS.map((opt) => (
                    <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </DropdownMenuRadioItem>
                  ))}
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Order</DropdownMenuLabel>
                <DropdownMenuRadioGroup
                  value={filters.sortOrder}
                  onValueChange={(v) => updateFilter({ sortOrder: v })}
                >
                  <DropdownMenuRadioItem value="asc">
                    {getOrderLabels(filters.sortBy).asc}
                  </DropdownMenuRadioItem>
                  <DropdownMenuRadioItem value="desc">
                    {getOrderLabels(filters.sortBy).desc}
                  </DropdownMenuRadioItem>
                </DropdownMenuRadioGroup>
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Filter pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.types.map((t) => (
              <FilterPill
                key={`type-${t}`}
                label={`Type: ${TYPE_OPTIONS.find((o) => o.value === t)?.label ?? t}`}
                onRemove={() =>
                  updateFilter({
                    types: filters.types.filter((x) => x !== t),
                  })
                }
              />
            ))}
            {filters.categories.map((c) => (
              <FilterPill
                key={`cat-${c}`}
                label={`Category: ${CATEGORY_OPTIONS.find((o) => o.value === c)?.label ?? c}`}
                onRemove={() =>
                  updateFilter({
                    categories: filters.categories.filter((x) => x !== c),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  types: [],
                  categories: [],
                  page: 1,
                }))
              }
              className="px-2 py-1 text-[11px] font-medium text-brand hover:text-brand/70 transition-colors"
            >
              Clear all
            </button>
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-32 rounded-xl" />
            ))}
          </div>
        ) : resources.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <BookOpen className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {debouncedSearch || activeFilterCount > 0
                ? "No resources match your filters"
                : "No resources yet. Add links, notes, and templates."}
            </p>
            {!debouncedSearch && activeFilterCount === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Resource
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {resources.map((resource) => (
                <ResourceCard
                  key={resource.id}
                  resource={resource}
                  onClick={() => setSelectedResourceId(resource.id)}
                  onTogglePin={() => togglePin.mutate(resource.id)}
                />
              ))}
            </div>

            <PaginationControls
              page={filters.page}
              perPage={filters.perPage}
              total={total}
              onPageChange={(page) =>
                setFilters((prev) => ({ ...prev, page }))
              }
            />
          </>
        )}
      </div>

      <ResourceDetailSheet
        resourceId={selectedResourceId}
        onClose={() => setSelectedResourceId(null)}
      />

      <AddResourceDialog
        open={addDialogOpen}
        onOpenChange={setAddDialogOpen}
      />
    </div>
  );
}

function FilterPill({
  label,
  onRemove,
}: {
  label: string;
  onRemove: () => void;
}) {
  return (
    <button
      onClick={onRemove}
      className="flex items-center gap-1.5 shrink-0 px-2.5 py-1 rounded-full bg-surface text-[11px] font-medium text-text-primary hover:bg-surface-hover transition-colors group"
    >
      {label}
      <X className="w-3 h-3 text-text-muted group-hover:text-text-primary" />
    </button>
  );
}
