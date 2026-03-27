"use client";

import { Check, X } from "lucide-react";
import type { Offer } from "@/hooks/use-offers";

interface OfferComparisonTableProps {
  offers: Offer[];
}

function formatCurrency(amount: number | null | undefined, currency?: string | null) {
  if (amount == null) return "—";
  const sym = (currency ?? "USD") === "USD" ? "$" : (currency ?? "") + " ";
  return `${sym}${amount.toLocaleString()}`;
}

export function OfferComparisonTable({ offers }: OfferComparisonTableProps) {
  if (offers.length === 0) return null;

  // Find best values for highlighting
  const salaries = offers.map((o) => o.base_salary).filter((s): s is number => s != null);
  const maxSalary = salaries.length > 0 ? Math.max(...salaries) : null;

  const rows: {
    label: string;
    values: (string | null)[];
    highlight?: number;
  }[] = [
    {
      label: "Base Salary",
      values: offers.map((o) => formatCurrency(o.base_salary, o.currency)),
      highlight: maxSalary != null
        ? offers.findIndex((o) => o.base_salary === maxSalary)
        : undefined,
    },
    {
      label: "Currency",
      values: offers.map((o) => o.currency ?? "—"),
    },
    {
      label: "Equity",
      values: offers.map((o) => o.equity ?? "—"),
    },
    {
      label: "Bonus",
      values: offers.map((o) => o.bonus ?? "—"),
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

  return (
    <div className="overflow-x-auto rounded-xl border border-border-subtle">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border-subtle bg-surface">
            <th className="text-left px-4 py-3 text-xs font-semibold text-text-muted uppercase tracking-wider w-32">
              Field
            </th>
            {offers.map((offer) => (
              <th
                key={offer.id}
                className="text-left px-4 py-3 min-w-[160px]"
              >
                <div className="text-sm font-semibold text-text-primary truncate">
                  {offer.job_title ?? "Untitled"}
                </div>
                {offer.company_name && (
                  <div className="text-xs text-text-muted font-normal truncate">
                    {offer.company_name}
                  </div>
                )}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, ri) => (
            <tr
              key={row.label}
              className={ri % 2 === 0 ? "" : "bg-surface/50"}
            >
              <td className="px-4 py-2.5 text-xs font-medium text-text-muted">
                {row.label}
              </td>
              {row.values.map((val, ci) => (
                <td
                  key={ci}
                  className={`px-4 py-2.5 text-sm ${
                    row.highlight === ci
                      ? "text-brand-green font-semibold"
                      : "text-text-primary"
                  }`}
                >
                  {row.label === "Status" ? (
                    <StatusBadge value={val} />
                  ) : (
                    val
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function StatusBadge({ value }: { value: string | null }) {
  if (value === "Accepted") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-emerald-600">
        <Check className="w-3 h-3" /> Accepted
      </span>
    );
  }
  if (value === "Declined") {
    return (
      <span className="inline-flex items-center gap-1 text-xs font-medium text-red-500">
        <X className="w-3 h-3" /> Declined
      </span>
    );
  }
  return <span className="text-xs text-text-muted">Pending</span>;
}
