"use client";

import { useState, useCallback } from "react";
import { PlusIcon, HandCoinsIcon, GridFourIcon, ColumnsIcon } from "@phosphor-icons/react";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useOffers,
  defaultOfferFilters,
  type OfferFilters,
} from "@/hooks/use-offers";
import { OfferCard } from "@/components/offers/offer-card";
import { OfferDetailSheet } from "@/components/offers/offer-detail-sheet";
import { AddOfferDialog } from "@/components/offers/add-offer-dialog";
import { OfferComparisonTable } from "@/components/offers/offer-comparison-table";
import { OffersToolbar } from "@/components/offers/offers-toolbar";
import { OfferSelectionBar } from "@/components/offers/offer-selection-bar";
import { PaginationControls } from "@/components/kanban/pagination-controls";
import { cn } from "@/lib/utils";
import { ExportButton } from "@/components/export-button";

const MAX_COMPARE = 3;

type ViewMode = "cards" | "compare";

export default function OffersPage() {
  const [filters, setFilters] = useState<OfferFilters>(defaultOfferFilters);
  const [viewMode, setViewMode] = useState<ViewMode>("cards");

  const { data: result, isLoading, error } = useOffers(filters);

  const [selectedOfferId, setSelectedOfferId] = useState<string | null>(null);
  const [selectedOfferIds, setSelectedOfferIds] = useState<Set<string>>(new Set());
  const [addDialogOpen, setAddDialogOpen] = useState(false);

  const offers = result?.data ?? [];
  const total = result?.total ?? 0;

  const offersToCompare = offers.filter((o) => selectedOfferIds.has(o.id));

  const handleFilterChange = useCallback(
    (update: Partial<OfferFilters>) => {
      setFilters((prev) => ({ ...prev, ...update }));
      // Clear selection when filters change (but not pagination)
      if (!("page" in update) || Object.keys(update).length > 1) {
        setSelectedOfferIds(new Set());
      }
    },
    []
  );

  const handleSelectToggle = useCallback((id: string) => {
    setSelectedOfferIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else if (next.size < MAX_COMPARE) next.add(id);
      return next;
    });
  }, []);

  if (error) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <p className="text-sm text-text-primary font-medium">
            Unable to load offers
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
      <div className="flex-1 flex flex-col gap-5 p-4 sm:p-7 overflow-y-auto">
        {/* Page Header */}
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h1
              className="text-3xl sm:text-4xl font-bold text-text-primary tracking-tight"
              style={{ letterSpacing: -1 }}
            >
              Offers
            </h1>
            <p className="text-sm text-text-muted mt-1.5">
              {isLoading ? "Loading..." : `${total} offer${total !== 1 ? "s" : ""} received`}
            </p>
          </div>
          <div className="flex items-center gap-2 flex-wrap">
            {/* View toggle */}
            <div className="flex items-center rounded-full border border-border-subtle overflow-hidden">
              <button
                onClick={() => setViewMode("cards")}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                  viewMode === "cards"
                    ? "bg-surface text-text-primary"
                    : "text-text-muted hover:text-text-primary"
                )}
              >
                <GridFourIcon className="w-3.5 h-3.5" />
                Cards
              </button>
              <button
                onClick={() => selectedOfferIds.size >= 2 && setViewMode("compare")}
                disabled={selectedOfferIds.size < 2}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-2 text-xs font-medium transition-colors",
                  selectedOfferIds.size < 2
                    ? "text-text-muted/40 cursor-not-allowed"
                    : viewMode === "compare"
                      ? "bg-surface text-text-primary"
                      : "text-text-muted hover:text-text-primary"
                )}
              >
                <ColumnsIcon className="w-3.5 h-3.5" />
                Compare{selectedOfferIds.size >= 2 ? ` (${selectedOfferIds.size})` : ""}
              </button>
            </div>
            <ExportButton endpoint="/api/v1/export/offers" />
            <Button onClick={() => setAddDialogOpen(true)}>
              <PlusIcon className="w-4 h-4" />
              Add Offer
            </Button>
          </div>
        </div>

        {/* Toolbar: Search, Sort, Filter */}
        <OffersToolbar filters={filters} onChange={handleFilterChange} />

        {/* Content */}
        {isLoading ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-40 rounded-xl" />
            ))}
          </div>
        ) : offers.length === 0 ? (
          <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
            <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
              <HandCoinsIcon className="w-6 h-6 text-text-muted" />
            </div>
            <p className="text-sm text-text-muted">
              {filters.search || filters.status || filters.remotePolicy
                ? "No offers match your filters."
                : "No offers yet. Add one when you receive an offer."}
            </p>
            {!filters.search && !filters.status && !filters.remotePolicy && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setAddDialogOpen(true)}
              >
                <PlusIcon className="w-4 h-4" />
                Add Offer
              </Button>
            )}
          </div>
        ) : viewMode === "compare" ? (
          offersToCompare.length >= 2 ? (
            <OfferComparisonTable offers={offersToCompare} onOfferClick={setSelectedOfferId} />
          ) : (
            <div className="flex flex-col items-center justify-center flex-1 gap-3 py-20">
              <div className="w-12 h-12 rounded-2xl bg-surface-hover flex items-center justify-center">
                <ColumnsIcon className="w-6 h-6 text-text-muted" />
              </div>
              <p className="text-sm text-text-muted">
                Select 2–3 offers to compare side by side.
              </p>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setViewMode("cards")}
              >
                <GridFourIcon className="w-4 h-4" />
                Back to Cards
              </Button>
            </div>
          )
        ) : (
          <>
            {selectedOfferIds.size > 0 && (
              <OfferSelectionBar
                selectedCount={selectedOfferIds.size}
                onCompare={() => setViewMode("compare")}
                onClear={() => setSelectedOfferIds(new Set())}
              />
            )}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {offers.map((offer) => (
                <OfferCard
                  key={offer.id}
                  offer={offer}
                  onClick={() => setSelectedOfferId(offer.id)}
                  selected={selectedOfferIds.has(offer.id)}
                  onSelectToggle={handleSelectToggle}
                  selectionDisabled={selectedOfferIds.size >= MAX_COMPARE && !selectedOfferIds.has(offer.id)}
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

      {/* Detail Sheet */}
      <OfferDetailSheet
        offerId={selectedOfferId}
        onClose={() => setSelectedOfferId(null)}
      />

      {/* Add Dialog */}
      <AddOfferDialog open={addDialogOpen} onOpenChange={setAddDialogOpen} />
    </div>
  );
}
