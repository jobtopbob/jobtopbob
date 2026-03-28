import type { Offer } from "@/hooks/use-offers";

/** Annualize base salary based on pay interval. */
export function annualizeSalary(
  baseSalary: number,
  interval?: string | null
): number {
  switch (interval) {
    case "hourly":
      return baseSalary * 2080; // 40 hrs × 52 weeks
    case "monthly":
      return baseSalary * 12;
    default:
      return baseSalary; // annual or unspecified
  }
}

/** Parse annual bonus — handles "15%" (of base) or "$20,000" (absolute). */
export function parseAnnualBonus(
  bonus: string | null | undefined,
  annualBase: number
): number {
  if (!bonus) return 0;
  const trimmed = bonus.trim();
  if (trimmed.endsWith("%")) {
    const pct = parseFloat(trimmed);
    return isNaN(pct) ? 0 : (annualBase * pct) / 100;
  }
  const num = parseFloat(trimmed.replace(/[$,]/g, ""));
  return isNaN(num) ? 0 : num;
}

/** Extract vesting years from equity_schedule text (default 4). */
export function parseVestingYears(
  schedule: string | null | undefined
): number {
  if (!schedule) return 4;
  const match = schedule.match(/(\d+)\s*year/i);
  return match ? parseInt(match[1]) : 4;
}

/** Calculate Year-1 Total Compensation estimate. */
export function calculateTotalComp(offer: Offer): number | null {
  if (offer.base_salary == null) return null;
  const annualBase = annualizeSalary(
    offer.base_salary,
    offer.salary_interval
  );
  const signOn = offer.sign_on_bonus ?? 0;
  const annualBonus = parseAnnualBonus(offer.annual_bonus, annualBase);
  const vestingYears = parseVestingYears(offer.equity_schedule);
  const equityPerYear = (offer.equity_value ?? 0) / vestingYears;
  return Math.round(annualBase + signOn + annualBonus + equityPerYear);
}

/** Format salary with currency symbol and interval suffix. */
export function formatSalaryWithInterval(
  salary: number,
  currency?: string | null,
  interval?: string | null
): string {
  const sym = (currency ?? "USD") === "USD" ? "$" : (currency ?? "") + " ";
  const suffix =
    interval === "hourly" ? "/hr" : interval === "monthly" ? "/mo" : "/yr";
  return `${sym}${salary.toLocaleString()}${suffix}`;
}

/** Format a currency amount with symbol. */
export function formatCurrency(
  amount: number | null | undefined,
  currency?: string | null
): string {
  if (amount == null) return "—";
  const sym = (currency ?? "USD") === "USD" ? "$" : (currency ?? "") + " ";
  return `${sym}${amount.toLocaleString()}`;
}

/** Human-readable label for remote policy. */
export function remotePolicyLabel(
  policy: string | null | undefined
): string | null {
  switch (policy) {
    case "remote":
      return "Remote";
    case "hybrid":
      return "Hybrid";
    case "onsite":
      return "On-site";
    default:
      return null;
  }
}

/** Human-readable label for salary interval. */
export function intervalLabel(
  interval: string | null | undefined
): string {
  switch (interval) {
    case "hourly":
      return "Hourly";
    case "monthly":
      return "Monthly";
    default:
      return "Annual";
  }
}
