"use client";

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
import { ArrowUpDown } from "lucide-react";

const SORT_OPTIONS = [
  { value: "created_at", label: "Date Added" },
  { value: "updated_at", label: "Last Updated" },
  { value: "title", label: "Title" },
  { value: "applied_at", label: "Applied Date" },
  { value: "salary_min", label: "Salary" },
];

function getOrderLabels(sortBy: string): { asc: string; desc: string } {
  switch (sortBy) {
    case "title":
      return { asc: "A → Z", desc: "Z → A" };
    case "salary_min":
      return { asc: "Lowest First", desc: "Highest First" };
    default:
      return { asc: "Oldest First", desc: "Newest First" };
  }
}

function getSortLabel(sortBy: string): string {
  return SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Date Added";
}

interface SortPopoverProps {
  sortBy: string;
  sortOrder: string;
  onSortByChange: (sortBy: string) => void;
  onSortOrderChange: (sortOrder: string) => void;
}

export function SortPopover({
  sortBy,
  sortOrder,
  onSortByChange,
  onSortOrderChange,
}: SortPopoverProps) {
  const orderLabels = getOrderLabels(sortBy);
  const isNonDefault = sortBy !== "created_at" || sortOrder !== "desc";

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        className="flex items-center gap-1.5 h-9 lg:h-10 px-3 lg:px-4 rounded-full border border-[#EBEBEF] text-xs lg:text-sm font-medium text-[#1A1A2E] hover:bg-[#F5F5F7] transition-colors outline-none"
      >
        <ArrowUpDown className="w-3.5 h-3.5 text-[#8B8FA3]" />
        <span className="hidden sm:inline">
          {isNonDefault ? getSortLabel(sortBy) : "Sort"}
        </span>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" sideOffset={8} className="w-[200px]">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={sortBy}
            onValueChange={onSortByChange}
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
            value={sortOrder}
            onValueChange={onSortOrderChange}
          >
            <DropdownMenuRadioItem value="desc">
              {orderLabels.desc}
            </DropdownMenuRadioItem>
            <DropdownMenuRadioItem value="asc">
              {orderLabels.asc}
            </DropdownMenuRadioItem>
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
