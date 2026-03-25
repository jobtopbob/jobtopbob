"use client";

import { useState, useMemo } from "react";
import { Plus, Search, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { useCompanies } from "@/hooks/use-companies";
import { CompanyCard } from "@/components/companies/company-card";
import { CompanyDetailSheet } from "@/components/companies/company-detail-sheet";
import { AddCompanyDialog } from "@/components/companies/add-company-dialog";

export default function CompaniesPage() {
  const { data: companies, isLoading, error } = useCompanies();
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(
    null
  );
  const [addDialogOpen, setAddDialogOpen] = useState(false);
  const [search, setSearch] = useState("");

  const filtered = useMemo(() => {
    if (!companies) return [];
    if (!search.trim()) return companies;
    const q = search.toLowerCase();
    return companies.filter(
      (c) =>
        c.name.toLowerCase().includes(q) ||
        c.domain?.toLowerCase().includes(q) ||
        c.industry?.toLowerCase().includes(q) ||
        c.location?.toLowerCase().includes(q)
    );
  }, [companies, search]);

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
      <div className="flex-1 flex flex-col gap-6 p-7 pt-7 overflow-y-auto">
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
              {isLoading
                ? "Loading..."
                : `${companies?.length ?? 0} companies tracked`}
            </p>
          </div>
          <Button onClick={() => setAddDialogOpen(true)}>
            <Plus className="w-4 h-4" />
            Add Company
          </Button>
        </div>

        {/* Search */}
        {!isLoading && (companies?.length ?? 0) > 0 && (
          <div className="relative max-w-sm">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-text-muted" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search companies..."
              className="pl-9"
            />
          </div>
        )}

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-36 rounded-xl" />
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <Building2 className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {search
                ? "No companies match your search"
                : "No companies yet. Add one to get started."}
            </p>
            {!search && (
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
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
            {filtered.map((company) => (
              <CompanyCard
                key={company.id}
                company={company}
                onClick={() => setSelectedCompanyId(company.id)}
              />
            ))}
          </div>
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
