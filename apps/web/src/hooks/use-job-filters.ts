"use client";

import { useCallback, useMemo } from "react";
import { useSearchParams, useRouter, usePathname } from "next/navigation";

export interface JobFilters {
  search: string;
  statuses: string[];
  stageIds: string[];
  locationTypes: string[];
  sources: string[];
  tagIds: string[];
  createdAfter: string;
  createdBefore: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

const DEFAULTS: JobFilters = {
  search: "",
  statuses: [],
  stageIds: [],
  locationTypes: [],
  sources: [],
  tagIds: [],
  createdAfter: "",
  createdBefore: "",
  sortBy: "created_at",
  sortOrder: "desc",
  page: 1,
  perPage: 25,
};

function parseCSV(value: string | null): string[] {
  if (!value) return [];
  return value.split(",").filter(Boolean);
}

function serializeCSV(arr: string[]): string {
  return arr.join(",");
}

export function useJobFilters() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const pathname = usePathname();

  const filters: JobFilters = useMemo(() => ({
    search: searchParams.get("search") ?? DEFAULTS.search,
    statuses: parseCSV(searchParams.get("statuses")),
    stageIds: parseCSV(searchParams.get("stage_ids")),
    locationTypes: parseCSV(searchParams.get("location_types")),
    sources: parseCSV(searchParams.get("sources")),
    tagIds: parseCSV(searchParams.get("tag_ids")),
    createdAfter: searchParams.get("created_after") ?? DEFAULTS.createdAfter,
    createdBefore: searchParams.get("created_before") ?? DEFAULTS.createdBefore,
    sortBy: searchParams.get("sort_by") ?? DEFAULTS.sortBy,
    sortOrder: searchParams.get("sort_order") ?? DEFAULTS.sortOrder,
    page: parseInt(searchParams.get("page") ?? "1", 10) || 1,
    perPage: parseInt(searchParams.get("per_page") ?? "25", 10) || 25,
  }), [searchParams]);

  const updateURL = useCallback(
    (updates: Partial<JobFilters>) => {
      const params = new URLSearchParams(searchParams.toString());

      const merged = { ...filters, ...updates };

      // Reset page to 1 when any filter (not page/perPage) changes
      const isFilterChange = Object.keys(updates).some(
        (k) => k !== "page" && k !== "perPage"
      );
      if (isFilterChange && !("page" in updates)) {
        merged.page = 1;
      }

      // Serialize to URL params
      const setOrDelete = (key: string, value: string) => {
        if (value) {
          params.set(key, value);
        } else {
          params.delete(key);
        }
      };

      setOrDelete("search", merged.search);
      setOrDelete("statuses", serializeCSV(merged.statuses));
      setOrDelete("stage_ids", serializeCSV(merged.stageIds));
      setOrDelete("location_types", serializeCSV(merged.locationTypes));
      setOrDelete("sources", serializeCSV(merged.sources));
      setOrDelete("tag_ids", serializeCSV(merged.tagIds));
      setOrDelete("created_after", merged.createdAfter);
      setOrDelete("created_before", merged.createdBefore);

      // Only set sort/pagination if non-default
      if (merged.sortBy !== DEFAULTS.sortBy) {
        params.set("sort_by", merged.sortBy);
      } else {
        params.delete("sort_by");
      }
      if (merged.sortOrder !== DEFAULTS.sortOrder) {
        params.set("sort_order", merged.sortOrder);
      } else {
        params.delete("sort_order");
      }
      if (merged.page !== 1) {
        params.set("page", String(merged.page));
      } else {
        params.delete("page");
      }
      if (merged.perPage !== DEFAULTS.perPage) {
        params.set("per_page", String(merged.perPage));
      } else {
        params.delete("per_page");
      }

      const qs = params.toString();
      router.replace(qs ? `${pathname}?${qs}` : pathname, { scroll: false });
    },
    [searchParams, filters, router, pathname]
  );

  const setFilter = useCallback(
    <K extends keyof JobFilters>(key: K, value: JobFilters[K]) => {
      updateURL({ [key]: value } as Partial<JobFilters>);
    },
    [updateURL]
  );

  const applyFilters = useCallback(
    (draft: Partial<JobFilters>) => {
      updateURL(draft);
    },
    [updateURL]
  );

  const resetFilters = useCallback(() => {
    router.replace(pathname, { scroll: false });
  }, [router, pathname]);

  const activeFilterCount = useMemo(() => {
    let count = 0;
    if (filters.statuses.length > 0) count++;
    if (filters.stageIds.length > 0) count++;
    if (filters.locationTypes.length > 0) count++;
    if (filters.sources.length > 0) count++;
    if (filters.tagIds.length > 0) count++;
    if (filters.createdAfter) count++;
    if (filters.createdBefore) count++;
    return count;
  }, [filters]);

  const hasActiveFilters = activeFilterCount > 0 || filters.search !== "";

  return {
    filters,
    setFilter,
    applyFilters,
    resetFilters,
    activeFilterCount,
    hasActiveFilters,
  };
}
