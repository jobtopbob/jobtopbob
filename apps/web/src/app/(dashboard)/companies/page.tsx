"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  Building2,
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
  useCompanies,
  defaultCompanyFilters,
  type CompanyFilters,
} from "@/hooks/use-companies";
import { CompanyCard } from "@/components/companies/company-card";
import { CompanyDetailSheet } from "@/components/companies/company-detail-sheet";
import { AddCompanyDialog } from "@/components/companies/add-company-dialog";
import { PaginationControls } from "@/components/kanban/pagination-controls";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ExportButton } from "@/components/export-button";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "created_at", label: "Date Added" },
  { value: "updated_at", label: "Last Updated" },
  { value: "job_count", label: "Applications" },
  { value: "industry", label: "Industry" },
];

const SIZE_OPTIONS = [
  "1-10",
  "11-50",
  "51-200",
  "201-500",
  "501-1000",
  "1001-5000",
  "5001-10000",
  "10001+",
];

const ENRICHMENT_OPTIONS = [
  { value: "none", label: "Not Enriched" },
  { value: "enriched", label: "Enriched" },
  { value: "pending", label: "Pending" },
  { value: "failed", label: "Failed" },
];

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "email", label: "Email" },
  { value: "api", label: "API" },
  { value: "scraped", label: "Scraped" },
];

function getOrderLabels(sortBy: string) {
  switch (sortBy) {
    case "name":
    case "industry":
      return { asc: "A → Z", desc: "Z → A" };
    case "job_count":
      return { asc: "Fewest First", desc: "Most First" };
    default:
      return { asc: "Oldest First", desc: "Newest First" };
  }
}

export default function CompaniesPage() {
  const [filters, setFilters] = useState<CompanyFilters>(defaultCompanyFilters);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const activeFilters: CompanyFilters = {
    ...filters,
    search: debouncedSearch,
  };

  const { data: result, isLoading, error } = useCompanies(activeFilters);

  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const companies = result?.data ?? [];
  const total = result?.total ?? 0;

  const updateFilter = useCallback(
    (patch: Partial<CompanyFilters>) => {
      setFilters((prev) => ({ ...prev, page: 1, ...patch }));
    },
    []
  );

  const activeFilterCount =
    filters.industries.length +
    filters.sizes.length +
    filters.dataSources.length +
    filters.enrichmentStatuses.length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            Unable to load companies
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
              Companies
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {isLoading ? "Loading..." : `${total} companies tracked`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton endpoint="/api/v1/export/companies" />
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Company
            </Button>
          </div>
        </div>

        {/* Toolbar: Search + Filters + Sort */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Search */}
          <div className="relative flex-1 min-w-[200px] max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={searchInput}
              onChange={(e) => {
                setSearchInput(e.target.value);
                setFilters((prev) => ({ ...prev, page: 1 }));
              }}
              placeholder="Search companies..."
              className="pl-9"
            />
          </div>

          {/* Filter Dropdown */}
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
            <DropdownMenuContent align="start" sideOffset={8} className="w-[220px]">
              <DropdownMenuGroup>
                <DropdownMenuLabel>Size</DropdownMenuLabel>
                {SIZE_OPTIONS.map((size) => (
                  <DropdownMenuCheckboxItem
                    key={size}
                    checked={filters.sizes.includes(size)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        sizes: checked
                          ? [...filters.sizes, size]
                          : filters.sizes.filter((s) => s !== size),
                      });
                    }}
                  >
                    {size}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Source</DropdownMenuLabel>
                {SOURCE_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.dataSources.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        dataSources: checked
                          ? [...filters.dataSources, opt.value]
                          : filters.dataSources.filter((s) => s !== opt.value),
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Enrichment</DropdownMenuLabel>
                {ENRICHMENT_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.enrichmentStatuses.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        enrichmentStatuses: checked
                          ? [...filters.enrichmentStatuses, opt.value]
                          : filters.enrichmentStatuses.filter(
                              (s) => s !== opt.value
                            ),
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
            </DropdownMenuContent>
          </DropdownMenu>

          {/* Sort Dropdown */}
          <DropdownMenu>
            <DropdownMenuTrigger className="flex items-center gap-1.5 h-10 px-4 rounded-full border border-border-subtle text-sm font-medium text-text-primary hover:bg-surface-hover transition-colors outline-none">
              <ArrowUpDown className="w-3.5 h-3.5 text-text-muted" />
              {SORT_OPTIONS.find((o) => o.value === filters.sortBy)?.label ??
                "Sort"}
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" sideOffset={8} className="w-[200px]">
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

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.sizes.map((s) => (
              <FilterPill
                key={`size-${s}`}
                label={`Size: ${s}`}
                onRemove={() =>
                  updateFilter({ sizes: filters.sizes.filter((x) => x !== s) })
                }
              />
            ))}
            {filters.dataSources.map((s) => (
              <FilterPill
                key={`source-${s}`}
                label={`Source: ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                onRemove={() =>
                  updateFilter({
                    dataSources: filters.dataSources.filter((x) => x !== s),
                  })
                }
              />
            ))}
            {filters.enrichmentStatuses.map((s) => (
              <FilterPill
                key={`enrich-${s}`}
                label={`Enrichment: ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                onRemove={() =>
                  updateFilter({
                    enrichmentStatuses: filters.enrichmentStatuses.filter(
                      (x) => x !== s
                    ),
                  })
                }
              />
            ))}
            {filters.industries.map((s) => (
              <FilterPill
                key={`industry-${s}`}
                label={`Industry: ${s}`}
                onRemove={() =>
                  updateFilter({
                    industries: filters.industries.filter((x) => x !== s),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  industries: [],
                  sizes: [],
                  dataSources: [],
                  enrichmentStatuses: [],
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
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <Building2 className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {debouncedSearch || activeFilterCount > 0
                ? "No companies match your filters"
                : "No companies yet. Add one to get started."}
            </p>
            {!debouncedSearch && activeFilterCount === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Company
              </Button>
            )}
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {companies.map((company) => (
                <CompanyCard
                  key={company.id}
                  company={company}
                  onClick={() => setSelectedCompanyId(company.id)}
                />
              ))}
            </div>

            <PaginationControls
              page={filters.page}
              perPage={filters.perPage}
              total={total}
              onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))}
            />
          </>
        )}
      </div>

      {/* Detail Sheet */}
      <CompanyDetailSheet
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />

      {/* Add Dialog */}
      <AddCompanyDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
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
