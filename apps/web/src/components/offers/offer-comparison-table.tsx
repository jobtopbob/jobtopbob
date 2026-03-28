"use client";

import Image from "next/image";
import { CheckIcon, XIcon, BuildingsIcon } from "@phosphor-icons/react";
import type { Offer } from "@/hooks/use-offers";
import { calculateTotalComp, remotePolicyLabel } from "@/lib/offer-utils";
import { formatSalaryWithInterval, formatCurrency } from "@/lib/currency";

interface OfferComparisonTableProps {
  offers: Offer[];
  onOfferClick?: (id: string) => void;
}

export function OfferComparisonTable({ offers, onOfferClick }: OfferComparisonTableProps) {
  if (offers.length === 0) return null;

  // Pre-compute totals
  const totals = offers.map((o) => calculateTotalComp(o));
  const numericTotals = totals.filter((t): t is number => t != null);
  const maxTotal = numericTotals.length > 0 ? Math.max(...numericTotals) : null;

  // Find best values for highlighting
  const findMaxIndex = (getter: (o: Offer) => number | null | undefined) => {
    const vals = offers.map(getter);
    const nums = vals.filter((v): v is number => v != null);
    if (nums.length === 0) return undefined;
    const max = Math.max(...nums);
    return vals.findIndex((v) => v === max);
  };

  const maxSalaryIdx = findMaxIndex((o) => o.base_salary);
  const maxSignOnIdx = findMaxIndex((o) => o.sign_on_bonus);
  const maxEquityIdx = findMaxIndex((o) => o.equity_value);
  const maxPtoIdx = findMaxIndex((o) => o.pto_days);

  type Row = {
    label: string;
    values: (string | null)[];
    highlight?: number;
  };

  const compensationRows: Row[] = [
    {
      label: "Base Salary",
      values: offers.map((o) =>
        o.base_salary != null
          ? formatSalaryWithInterval(o.base_salary, {
              currency: o.currency,
              interval: o.salary_interval,
            })
          : "—"
      ),
      highlight: maxSalaryIdx,
    },
    {
      label: "Sign-on Bonus",
      values: offers.map((o) => formatCurrency(o.sign_on_bonus, { currency: o.currency })),
      highlight: maxSignOnIdx,
    },
    {
      label: "Annual Bonus",
      values: offers.map((o) => o.annual_bonus ?? "—"),
    },
    {
      label: "Equity Value",
      values: offers.map((o) => formatCurrency(o.equity_value, { currency: o.currency })),
      highlight: maxEquityIdx,
    },
    {
      label: "Vesting Schedule",
      values: offers.map((o) => o.equity_schedule ?? "—"),
    },
    {
      label: "Equity",
      values: offers.map((o) => o.equity ?? "—"),
    },
  ];

  const benefitsRows: Row[] = [
    {
      label: "PTO Days",
      values: offers.map((o) =>
        o.pto_days != null ? `${o.pto_days} days` : "—"
      ),
      highlight: maxPtoIdx,
    },
    {
      label: "Remote Policy",
      values: offers.map((o) => remotePolicyLabel(o.remote_policy) ?? "—"),
    },
    {
      label: "Retirement Match",
      values: offers.map((o) => o.retirement_match ?? "—"),
    },
    {
      label: "Work Location",
      values: offers.map((o) => o.work_location ?? "—"),
    },
    {
      label: "Relocation",
      values: offers.map((o) => o.relocation ?? "—"),
    },
    {
      label: "Deadline",
      values: offers.map((o) =>
        o.deadline ? new Date(o.deadline).toLocaleDateString() : "—"
      ),
    },
    {
      label: "Status",
      values: offers.map((o) =>
        o.accepted == null ? "Pending" : o.accepted ? "Accepted" : "Declined"
      ),
    },
  ];

  const visibleComp = compensationRows;
  const visibleBenefits = benefitsRows;

  return (
    <div className="overflow-x-auto">
      <table className="w-full border-separate border-spacing-0">
        {/* Sticky header cards */}
        <thead>
          <tr>
            <th className="sticky top-0 z-10 bg-background w-36 min-w-36" />
            {offers.map((offer, i) => {
              const tc = totals[i];
              const isBestTc =
                maxTotal != null && tc != null && tc === maxTotal;
              return (
                <th
                  key={offer.id}
                  className="sticky top-0 z-10 bg-background min-w-[180px] px-5 pt-6 pb-4 text-center align-top"
                >
                  <div className="flex flex-col h-full">
                  <div
                    className={`flex flex-col items-center gap-2 flex-1 ${onOfferClick ? "cursor-pointer rounded-lg hover:bg-surface/60 transition-colors p-2 -m-2" : ""}`}
                    onClick={() => onOfferClick?.(offer.id)}
                    role={onOfferClick ? "button" : undefined}
                    tabIndex={onOfferClick ? 0 : undefined}
                    onKeyDown={onOfferClick ? (e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); onOfferClick(offer.id); } } : undefined}
                  >
                    {/* Company Logo */}
                    {offer.company_logo_url ? (
                      <div className="w-10 h-10 rounded-lg bg-white p-1">
                        <Image
                          src={offer.company_logo_url}
                          alt=""
                          width={32}
                          height={32}
                          unoptimized
                          className="w-full h-full object-contain"
                        />
                      </div>
                    ) : (
                      <div className="w-10 h-10 rounded-lg bg-surface flex items-center justify-center">
                        <BuildingsIcon className="w-5 h-5 text-text-muted" />
                      </div>
                    )}

                    {/* Job Title + Company */}
                    <div>
                      <div className="text-sm font-semibold text-text-primary leading-tight">
                        {offer.job_title ?? "Untitled"}
                      </div>
                      <div className="text-xs mt-0.5">
                        {offer.company_name ? (
                          <span className="text-text-muted">{offer.company_name}</span>
                        ) : (
                          <span className="text-text-muted/40 italic">No company</span>
                        )}
                      </div>
                    </div>

                    {/* Total Comp */}
                    <div className="mt-1">
                      <div
                        className={`text-xl font-bold tracking-tight ${
                          tc != null
                            ? isBestTc
                              ? "text-brand-green"
                              : "text-text-primary"
                            : "text-text-muted/40 italic font-normal"
                        }`}
                      >
                        {tc != null
                          ? formatCurrency(tc, { currency: offer.currency })
                          : "Not provided"}
                      </div>
                      <div className={`text-[10px] uppercase tracking-wider ${tc != null ? "text-text-muted" : "text-text-muted/40"}`}>
                        Total Comp (Y1)
                      </div>
                    </div>

                    {/* Status */}
                    {offer.accepted != null && (
                      <StatusPill accepted={offer.accepted} />
                    )}
                  </div>

                  {/* Divider */}
                  <div className="mt-auto pt-4"><div className="h-px bg-border-subtle" /></div>
                  </div>
                </th>
              );
            })}
          </tr>
        </thead>

        <tbody>
          {/* Compensation Section */}
          {visibleComp.length > 0 && (
            <>
              <SectionHeader label="Compensation" colSpan={offers.length + 1} />
              {visibleComp.map((row, ri) => (
                <DataRow key={row.label} row={row} index={ri} />
              ))}
            </>
          )}

          {/* Benefits & Work Section */}
          {visibleBenefits.length > 0 && (
            <>
              <SectionHeader
                label="Benefits & Work"
                colSpan={offers.length + 1}
              />
              {visibleBenefits.map((row, ri) => (
                <DataRow key={row.label} row={row} index={ri} />
              ))}
            </>
          )}
        </tbody>
      </table>
    </div>
  );
}

/* ---------- Sub-components ---------- */

function SectionHeader({
  label,
  colSpan,
}: {
  label: string;
  colSpan: number;
}) {
  return (
    <tr>
      <td
        colSpan={colSpan}
        className="pt-6 pb-2 px-4 text-[11px] font-semibold text-text-muted uppercase tracking-widest"
      >
        {label}
      </td>
    </tr>
  );
}

function DataRow({
  row,
  index,
}: {
  row: { label: string; values: (string | null)[]; highlight?: number };
  index: number;
}) {
  return (
    <tr className={index % 2 === 0 ? "" : "bg-surface/40"}>
      <td className="px-4 py-3 text-xs font-medium text-text-muted whitespace-nowrap w-36 min-w-36">
        {row.label}
      </td>
      {row.values.map((val, ci) => (
        <td
          key={ci}
          className={`px-5 py-3 text-sm text-center ${
            row.highlight === ci
              ? "text-brand-green font-semibold"
              : val === "—"
                ? ""
                : "text-text-primary"
          }`}
        >
          {row.label === "Status" ? (
            <StatusPillInline value={val} />
          ) : val === "—" ? (
            <span className="text-xs text-text-muted/40 italic">Not provided</span>
          ) : (
            val
          )}
        </td>
      ))}
    </tr>
  );
}

function StatusPill({ accepted }: { accepted: boolean }) {
  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-medium px-2 py-0.5 rounded-full ${
        accepted
          ? "bg-emerald-400/15 text-emerald-600"
          : "bg-red-400/15 text-red-600"
      }`}
    >
      {accepted ? <CheckIcon className="w-3 h-3" /> : <XIcon className="w-3 h-3" />}
      {accepted ? "Accepted" : "Declined"}
    </span>
  );
}

function StatusPillInline({ value }: { value: string | null }) {
  if (value === "Accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <CheckIcon className="w-3 h-3" /> Accepted
      </span>
    );
  }
  if (value === "Declined") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <XIcon className="w-3 h-3" /> Declined
      </span>
    );
  }
  return <span className="text-xs text-text-muted">Pending</span>;
}
