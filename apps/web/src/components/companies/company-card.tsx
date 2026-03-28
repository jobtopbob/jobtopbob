"use client";

import Image from "next/image";
import { BuildingsIcon, MapPinIcon, UsersIcon, BriefcaseIcon } from "@phosphor-icons/react";
import { Badge } from "@/components/ui/badge";
import type { CompanyWithJobCount } from "@/hooks/use-companies";

const logoColors = [
  "#635BFF",
  "#2A85FF",
  "#FF8400",
  "#83BF6E",
  "#8E59FF",
  "#E53E3E",
  "#0EA5E9",
  "#F59E0B",
];

function getLogoColor(name: string): string {
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
  }
  return logoColors[Math.abs(hash) % logoColors.length];
}

const enrichmentDot: Record<string, string> = {
  none: "bg-text-muted/40",
  pending: "bg-yellow-400",
  enriched: "bg-emerald-400",
  failed: "bg-red-400",
};

interface CompanyCardProps {
  company: CompanyWithJobCount;
  onClick: () => void;
}

export function CompanyCard({ company, onClick }: CompanyCardProps) {
  const initial = company.name.charAt(0).toUpperCase();
  const color = getLogoColor(company.name);
  const jobCount = company.job_count ?? 0;

  return (
    <button
      onClick={onClick}
      className="flex flex-col gap-3 rounded-xl bg-card border border-border-subtle p-4 text-left transition-colors hover:border-border-subtle/80 hover:bg-card/80 cursor-pointer"
    >
      {/* Header: Logo + Name + Enrichment dot */}
      <div className="flex items-start gap-3">
        {company.logo_url ? (
          <Image
            src={company.logo_url}
            alt={company.name}
            width={40}
            height={40}
            unoptimized
            className="w-10 h-10 rounded-xl object-contain bg-card border border-border-subtle p-0.5 shrink-0"
          />
        ) : (
          <div
            className="flex items-center justify-center w-10 h-10 rounded-xl shrink-0"
            style={{ backgroundColor: color }}
          >
            <span className="text-base font-bold text-white">{initial}</span>
          </div>
        )}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2">
            <span className="text-sm font-semibold text-text-primary truncate">
              {company.name}
            </span>
            {company.enrichment_status !== "none" && (
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${enrichmentDot[company.enrichment_status] ?? enrichmentDot.none}`}
                title={`Enrichment: ${company.enrichment_status}`}
              />
            )}
          </div>
          {company.domain && (
            <span className="text-xs text-text-muted">{company.domain}</span>
          )}
        </div>
      </div>

      {/* Meta badges */}
      <div className="flex flex-wrap gap-1.5">
        {company.industry && (
          <Badge variant="secondary" className="text-[10px]">
            <BuildingsIcon className="w-3 h-3" />
            {company.industry}
          </Badge>
        )}
        {company.size && (
          <Badge variant="secondary" className="text-[10px]">
            <UsersIcon className="w-3 h-3" />
            {company.size}
          </Badge>
        )}
        {company.location && (
          <Badge variant="secondary" className="text-[10px]">
            <MapPinIcon className="w-3 h-3" />
            {company.location}
          </Badge>
        )}
      </div>

      {/* Footer: Job count */}
      <div className="flex items-center gap-1.5 text-xs text-text-muted mt-auto pt-1">
        <BriefcaseIcon className="w-3.5 h-3.5" />
        <span>
          {jobCount} {jobCount === 1 ? "application" : "applications"}
        </span>
      </div>
    </button>
  );
}
