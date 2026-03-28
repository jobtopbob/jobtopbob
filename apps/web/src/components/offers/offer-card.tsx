"use client";

import Image from "next/image";
import {
  DollarSign,
  Calendar,
  Check,
  X,
  Briefcase,
  Building2,
  MapPin,
  Wifi,
  Monitor,
  Home,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Offer } from "@/hooks/use-offers";
import { calculateTotalComp, remotePolicyLabel } from "@/lib/offer-utils";
import { formatSalaryWithInterval, formatCurrency } from "@/lib/currency";

interface OfferCardProps {
  offer: Offer;
  onClick: () => void;
}

const remotePolicyConfig: Record<
  string,
  { icon: typeof Wifi; className: string }
> = {
  remote: { icon: Wifi, className: "bg-emerald-400/15 text-emerald-600" },
  hybrid: { icon: Home, className: "bg-amber-400/15 text-amber-600" },
  onsite: { icon: Monitor, className: "bg-zinc-400/15 text-zinc-600" },
};

export function OfferCard({ offer, onClick }: OfferCardProps) {
  const salary = offer.base_salary;
  const currency = offer.currency ?? "USD";
  const totalComp = calculateTotalComp(offer);
  const showTotalComp = totalComp != null && salary != null && totalComp !== salary;
  const policyLabel = remotePolicyLabel(offer.remote_policy);
  const policyConf = offer.remote_policy
    ? remotePolicyConfig[offer.remote_policy]
    : null;
  const hasBadges = !!(policyLabel || offer.equity || offer.bonus);

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-4 text-left transition-colors hover:border-border-subtle/80 hover:bg-card/80 cursor-pointer"
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-start gap-2.5 min-w-0">
          {offer.company_logo_url ? (
            <div className="w-6 h-6 rounded bg-white p-0.5 shrink-0 mt-0.5">
              <Image
                src={offer.company_logo_url}
                alt=""
                width={20}
                height={20}
                unoptimized
                className="w-full h-full object-contain"
              />
            </div>
          ) : (
            <Building2 className="w-6 h-6 text-text-muted shrink-0 mt-0.5" />
          )}
          <div className="min-w-0">
            <span className="text-sm font-semibold text-text-primary truncate block">
              {offer.job_title ?? "Untitled Position"}
            </span>
            <div className="flex items-center gap-1.5">
              {offer.company_name && (
                <span className="text-xs text-text-muted truncate">
                  {offer.company_name}
                </span>
              )}
              {offer.work_location && offer.company_name && (
                <span className="text-xs text-text-muted">·</span>
              )}
              {offer.work_location && (
                <span className="flex items-center gap-0.5 text-xs text-text-muted truncate">
                  <MapPin className="w-3 h-3 shrink-0" />
                  {offer.work_location}
                </span>
              )}
            </div>
          </div>
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

      {/* Salary or placeholder */}
      {salary != null ? (
        <div>
          <div className="flex items-center gap-1.5">
            <DollarSign className="w-4 h-4 text-brand-green" />
            <span className="text-lg font-bold text-text-primary">
              {formatSalaryWithInterval(salary, { currency, interval: offer.salary_interval })}
            </span>
          </div>
          {showTotalComp && (
            <span className="text-xs text-text-muted ml-5.5 pl-px">
              ~{formatCurrency(totalComp, { currency })} TC (est.)
            </span>
          )}
        </div>
      ) : (
        <div className="flex items-center gap-1.5 py-1">
          <DollarSign className="w-4 h-4 text-text-muted/40" />
          <span className="text-sm text-text-muted italic">
            Add compensation details
          </span>
        </div>
      )}

      {/* Meta badges */}
      {hasBadges ? (
        <div className="flex flex-wrap gap-1.5">
          {policyLabel && policyConf && (
            <Badge
              variant="secondary"
              className={`text-[10px] ${policyConf.className}`}
            >
              <policyConf.icon className="w-3 h-3 mr-0.5" />
              {policyLabel}
            </Badge>
          )}
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
      ) : (
        salary == null && (
          <div className="flex flex-wrap gap-1.5">
            <Badge variant="secondary" className="text-[10px] text-text-muted/60 border-dashed">
              Equity
            </Badge>
            <Badge variant="secondary" className="text-[10px] text-text-muted/60 border-dashed">
              Bonus
            </Badge>
            <Badge variant="secondary" className="text-[10px] text-text-muted/60 border-dashed">
              Benefits
            </Badge>
          </div>
        )
      )}

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
