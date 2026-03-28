"use client";

import { useState, useCallback } from "react";
import {
  Plus,
  Search,
  Users,
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
  useContacts,
  defaultContactFilters,
  type ContactFilters,
} from "@/hooks/use-contacts";
import { ContactsTable } from "@/components/contacts/contacts-table";
import { ContactDetailSheet } from "@/components/contacts/contact-detail-sheet";
import { AddContactDialog } from "@/components/contacts/add-contact-dialog";
import { CompanyDetailSheet } from "@/components/companies/company-detail-sheet";
import { cn } from "@/lib/utils";
import { useDebounce } from "@/hooks/use-debounce";
import { ExportButton } from "@/components/export-button";

const SORT_OPTIONS = [
  { value: "name", label: "Name" },
  { value: "created_at", label: "Date Added" },
  { value: "updated_at", label: "Last Updated" },
  { value: "last_contact", label: "Last Contact" },
];

const STATUS_OPTIONS = [
  { value: "active", label: "Active" },
  { value: "follow-up", label: "Follow Up" },
  { value: "dormant", label: "Dormant" },
];

const SOURCE_OPTIONS = [
  { value: "manual", label: "Manual" },
  { value: "linkedin", label: "LinkedIn" },
  { value: "email", label: "Email" },
  { value: "referral", label: "Referral" },
  { value: "event", label: "Event" },
];

function getOrderLabels(sortBy: string) {
  switch (sortBy) {
    case "name":
      return { asc: "A → Z", desc: "Z → A" };
    default:
      return { asc: "Oldest First", desc: "Newest First" };
  }
}

export default function ContactsPage() {
  const [filters, setFilters] = useState<ContactFilters>(defaultContactFilters);
  const [searchInput, setSearchInput] = useState("");
  const debouncedSearch = useDebounce(searchInput, 300);

  const activeFilters: ContactFilters = {
    ...filters,
    search: debouncedSearch,
  };

  const { data: result, isLoading, error } = useContacts(activeFilters);

  const [selectedContactId, setSelectedContactId] = useState<string | null>(
    null
  );
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const contacts = result?.data ?? [];
  const total = result?.total ?? 0;

  const updateFilter = useCallback(
    (patch: Partial<ContactFilters>) => {
      setFilters((prev) => ({ ...prev, page: 1, ...patch }));
    },
    []
  );

  const activeFilterCount =
    filters.statuses.length + filters.sources.length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            Unable to load contacts
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
              Contacts
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {isLoading ? "Loading..." : `${total} contacts tracked`}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <ExportButton endpoint="/api/v1/export/contacts" />
            <Button onClick={() => setAddDialogOpen(true)}>
              <Plus className="w-4 h-4" />
              Add Contact
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
              placeholder="Search contacts..."
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
            <DropdownMenuContent
              align="start"
              sideOffset={8}
              className="w-[220px]"
            >
              <DropdownMenuGroup>
                <DropdownMenuLabel>Status</DropdownMenuLabel>
                {STATUS_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.statuses.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        statuses: checked
                          ? [...filters.statuses, opt.value]
                          : filters.statuses.filter((s) => s !== opt.value),
                      });
                    }}
                  >
                    {opt.label}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuGroup>
              <DropdownMenuSeparator />
              <DropdownMenuGroup>
                <DropdownMenuLabel>Source</DropdownMenuLabel>
                {SOURCE_OPTIONS.map((opt) => (
                  <DropdownMenuCheckboxItem
                    key={opt.value}
                    checked={filters.sources.includes(opt.value)}
                    onCheckedChange={(checked) => {
                      updateFilter({
                        sources: checked
                          ? [...filters.sources, opt.value]
                          : filters.sources.filter((s) => s !== opt.value),
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

        {/* Active Filter Pills */}
        {activeFilterCount > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {filters.statuses.map((s) => (
              <FilterPill
                key={`status-${s}`}
                label={`Status: ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                onRemove={() =>
                  updateFilter({
                    statuses: filters.statuses.filter((x) => x !== s),
                  })
                }
              />
            ))}
            {filters.sources.map((s) => (
              <FilterPill
                key={`source-${s}`}
                label={`Source: ${s.charAt(0).toUpperCase() + s.slice(1)}`}
                onRemove={() =>
                  updateFilter({
                    sources: filters.sources.filter((x) => x !== s),
                  })
                }
              />
            ))}
            <button
              onClick={() =>
                setFilters((prev) => ({
                  ...prev,
                  statuses: [],
                  sources: [],
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
          <div className="space-y-2">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-10 rounded-lg" />
            ))}
          </div>
        ) : contacts.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <Users className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {debouncedSearch || activeFilterCount > 0
                ? "No contacts match your filters"
                : "No contacts yet. Add one to get started."}
            </p>
            {!debouncedSearch && activeFilterCount === 0 && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <Plus className="w-4 h-4" />
                Add Contact
              </Button>
            )}
          </div>
        ) : (
          <ContactsTable
            contacts={contacts}
            onContactClick={(id) => setSelectedContactId(id)}
            page={filters.page}
            perPage={filters.perPage}
            total={total}
            onPageChange={(page) =>
              setFilters((prev) => ({ ...prev, page }))
            }
          />
        )}
      </div>

      {/* Detail Sheet */}
      <ContactDetailSheet
        contactId={selectedContactId}
        onClose={() => setSelectedContactId(null)}
        onCompanyClick={(id) => setSelectedCompanyId(id)}
      />

      {/* Company Detail Sheet (opened from contact details) */}
      <CompanyDetailSheet
        companyId={selectedCompanyId}
        onClose={() => setSelectedCompanyId(null)}
      />

      {/* Add Dialog */}
      <AddContactDialog
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
