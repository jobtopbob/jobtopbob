"use client";

import { DollarSign, Calendar, Check, X, Briefcase } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Offer } from "@/hooks/use-offers";

interface OfferCardProps {
  offer: Offer;
  onClick: () => void;
}

export function OfferCard({ offer, onClick }: OfferCardProps) {
  const salary = offer.base_salary;
  const currency = offer.currency ?? "USD";

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-4 text-left transition-colors hover:border-border-subtle/80 hover:bg-card/80 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <span className="text-sm font-semibold text-text-primary truncate block">
            {offer.job_title ?? "Untitled Position"}
          </span>
          {offer.company_name && (
            <span className="text-xs text-text-muted truncate block">
              {offer.company_name}
            </span>
          )}
        </div>
        {offer.accepted != null && (
          <span
            className={`flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full shrink-0 ${
              offer.accepted
                ? "bg-emerald-400/15 text-emerald-600"
                : "bg-red-400/15 text-red-600"
            }`}
          >
            {offer.accepted ? (
              <Check className="w-3 h-3" />
            ) : (
              <X className="w-3 h-3" />
            )}
            {offer.accepted ? "Accepted" : "Declined"}
          </span>
        )}
      </div>

      {/* Salary */}
      {salary != null && (
        <div className="flex items-center gap-1.5">
          <DollarSign className="w-4 h-4 text-brand-green" />
          <span className="text-lg font-bold text-text-primary">
            {currency === "USD" ? "$" : currency + " "}
            {salary.toLocaleString()}
          </span>
        </div>
      )}

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5">
        {offer.equity && (
          <Badge variant="secondary" className="text-[10px]">
            Equity: {offer.equity}
          </Badge>
        )}
        {offer.bonus && (
          <Badge variant="secondary" className="text-[10px]">
            Bonus: {offer.bonus}
          </Badge>
        )}
      </div>

      {/* Footer */}
      <div className="flex items-center gap-3 text-xs text-text-muted mt-auto pt-1">
        {offer.deadline && (
          <span className="flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5" />
            Deadline: {new Date(offer.deadline).toLocaleDateString()}
          </span>
        )}
        {!offer.deadline && (
          <span className="flex items-center gap-1">
            <Briefcase className="w-3.5 h-3.5" />
            {new Date(offer.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </button>
  );
}
