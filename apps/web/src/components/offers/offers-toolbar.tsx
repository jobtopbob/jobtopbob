"use client";

import { useState, useEffect } from "react";
import {
  DropdownMenu,
  DropdownMenuTrigger,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  ArrowsDownUpIcon,
  MagnifyingGlassIcon,
  XIcon,
  CheckIcon,
  ClockIcon,
  FunnelIcon,
  XCircleIcon,
  WifiHighIcon,
  HouseIcon,
  MonitorIcon,
} from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import type { OfferFilters } from "@/hooks/use-offers";

/* ---------- Sort Popover ---------- */

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Added" },
  { value: "base_salary", label: "Base Salary" },
  { value: "deadline", label: "Deadline" },
];

function getOrderLabels(sortBy: string): { asc: string; desc: string } {
  if (sortBy === "base_salary") {
    return { asc: "Lowest First", desc: "Highest First" };
  }
  return { asc: "Oldest First", desc: "Newest First" };
}

function getSortLabel(sortBy: string): string {
  return SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Date Added";
}

/* ---------- Filter Options ---------- */

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending", icon: ClockIcon },
  { value: "accepted", label: "Accepted", icon: CheckIcon },
  { value: "declined", label: "Declined", icon: XCircleIcon },
];

const REMOTE_OPTIONS = [
  { value: "remote", label: "Remote", icon: WifiHighIcon },
  { value: "hybrid", label: "Hybrid", icon: HouseIcon },
  { value: "onsite", label: "On-site", icon: MonitorIcon },
];

/* ---------- Toolbar ---------- */

interface OffersToolbarProps {
  filters: OfferFilters;
  onChange: (update: Partial<OfferFilters>) => void;
}

export function OffersToolbar({ filters, onChange }: OffersToolbarProps) {
  const [searchValue, setSearchValue] = useState(filters.search);

  // Debounce search
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (searchValue !== filters.search) {
        onChange({ search: searchValue, page: 1 });
      }
    }, 300);
    return () => clearTimeout(timeout);
  }, [searchValue, filters.search, onChange]);

  const isNonDefaultSort =
    filters.sortBy !== "created_at" || filters.sortOrder !== "desc";
  const activeFilterCount =
    (filters.status ? 1 : 0) + (filters.remotePolicy ? 1 : 0);
  const hasActiveFilters = activeFilterCount > 0 || !!filters.search;

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {/* Search */}
        <div className="relative flex-1 max-w-xs">
          <MagnifyingGlassIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-text-muted" />
          <Input
            value={searchValue}
            onChange={(e) => setSearchValue(e.target.value)}
            placeholder="Search offers..."
            className="pl-9 h-9 text-sm"
          />
          {searchValue && (
            <button
              onClick={() => {
                setSearchValue("");
                onChange({ search: "", page: 1 });
              }}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-text-muted hover:text-text-primary"
            >
              <XIcon className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Sort */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-border-subtle text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors outline-none">
            <ArrowsDownUpIcon className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">
              {isNonDefaultSort ? getSortLabel(filters.sortBy) : "Sort"}
            </span>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[200px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Sort by</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.sortBy}
                onValueChange={(v) => onChange({ sortBy: v ?? "created_at", page: 1 })}
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
                onValueChange={(v) => onChange({ sortOrder: v ?? "desc" })}
              >
                <DropdownMenuRadioItem value="desc">
                  {getOrderLabels(filters.sortBy).desc}
                </DropdownMenuRadioItem>
                <DropdownMenuRadioItem value="asc">
                  {getOrderLabels(filters.sortBy).asc}
                </DropdownMenuRadioItem>
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Filter */}
        <DropdownMenu>
          <DropdownMenuTrigger className="flex items-center gap-1.5 h-9 px-3 rounded-full border border-border-subtle text-xs font-medium text-text-primary hover:bg-surface-hover transition-colors outline-none">
            <FunnelIcon className="w-3.5 h-3.5 text-text-muted" />
            <span className="hidden sm:inline">Filter</span>
            {activeFilterCount > 0 && (
              <span className="flex items-center justify-center w-4 h-4 rounded-full bg-brand-green text-white text-[10px] font-bold">
                {activeFilterCount}
              </span>
            )}
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" sideOffset={8} className="w-[220px]">
            <DropdownMenuGroup>
              <DropdownMenuLabel>Status</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.status}
                onValueChange={(v) =>
                  onChange({ status: v === filters.status ? "" : v ?? "", page: 1 })
                }
              >
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    <opt.icon className="w-3 h-3 mr-1.5 inline" />
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
            <DropdownMenuSeparator />
            <DropdownMenuGroup>
              <DropdownMenuLabel>Work Style</DropdownMenuLabel>
              <DropdownMenuRadioGroup
                value={filters.remotePolicy}
                onValueChange={(v) =>
                  onChange({
                    remotePolicy: v === filters.remotePolicy ? "" : v ?? "",
                    page: 1,
                  })
                }
              >
                {REMOTE_OPTIONS.map((opt) => (
                  <DropdownMenuRadioItem key={opt.value} value={opt.value}>
                    <opt.icon className="w-3 h-3 mr-1.5 inline" />
                    {opt.label}
                  </DropdownMenuRadioItem>
                ))}
              </DropdownMenuRadioGroup>
            </DropdownMenuGroup>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Clear all */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 text-xs text-text-muted"
            onClick={() => {
              setSearchValue("");
              onChange({
                search: "",
                status: "",
                remotePolicy: "",
                sortBy: "created_at",
                sortOrder: "desc",
                page: 1,
              });
            }}
          >
            Clear all
          </Button>
        )}
      </div>

      {/* Active filter pills */}
      {activeFilterCount > 0 && (
        <div className="flex items-center gap-1.5">
          {filters.status && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 cursor-pointer"
              onClick={() => onChange({ status: "", page: 1 })}
            >
              {STATUS_OPTIONS.find((o) => o.value === filters.status)?.label}
              <XIcon className="w-3 h-3" />
            </Badge>
          )}
          {filters.remotePolicy && (
            <Badge
              variant="secondary"
              className="text-xs gap-1 cursor-pointer"
              onClick={() => onChange({ remotePolicy: "", page: 1 })}
            >
              {REMOTE_OPTIONS.find((o) => o.value === filters.remotePolicy)
                ?.label}
              <XIcon className="w-3 h-3" />
            </Badge>
          )}
        </div>
      )}
    </div>
  );
}
