type FormatCurrencyOptions = {
  currency?: string | null;
  locale?: string;
  compact?: boolean;
  fallback?: string;
};

type FormatSalaryRangeOptions = FormatCurrencyOptions & {
  interval?: string | null;
};

const DEFAULT_LOCALE = "en-US";
const DEFAULT_CURRENCY = "USD";

function getFormatter(
  currency: string,
  locale: string,
  compact: boolean
): Intl.NumberFormat {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency,
    maximumFractionDigits: 0,
    ...(compact && { notation: "compact", compactDisplay: "short" }),
  });
}

function intervalSuffix(interval?: string | null): string {
  switch (interval) {
    case "hourly":
      return "/hr";
    case "monthly":
      return "/mo";
    default:
      return "/yr";
  }
}

/** Format a single currency amount. Returns fallback for null/undefined. */
export function formatCurrency(
  amount: number | null | undefined,
  options?: FormatCurrencyOptions
): string {
  if (amount == null) return options?.fallback ?? "—";
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const compact = options?.compact ?? false;
  return getFormatter(currency, locale, compact).format(amount);
}

/** Format a salary range (min–max) with optional interval suffix. Returns null if both are nullish. */
export function formatSalaryRange(
  min: number | null | undefined,
  max: number | null | undefined,
  options?: FormatSalaryRangeOptions
): string | null {
  if (min == null && max == null) return null;

  const opts = {
    currency: options?.currency ?? DEFAULT_CURRENCY,
    locale: options?.locale ?? DEFAULT_LOCALE,
    compact: options?.compact ?? false,
  };
  const fmt = (n: number) => getFormatter(opts.currency, opts.locale, opts.compact).format(n);
  const suffix =
    options?.interval && options.interval !== "annual"
      ? intervalSuffix(options.interval)
      : "";

  let range: string;
  if (min != null && max != null) {
    range = `${fmt(min)} – ${fmt(max)}`;
  } else if (min != null) {
    range = `${fmt(min)}+`;
  } else {
    range = `Up to ${fmt(max!)}`;
  }

  return `${range}${suffix}`;
}

/** Format a single salary with interval suffix (e.g. "$120,000/yr"). */
export function formatSalaryWithInterval(
  salary: number,
  options?: {
    currency?: string | null;
    interval?: string | null;
    locale?: string;
  }
): string {
  const currency = options?.currency ?? DEFAULT_CURRENCY;
  const locale = options?.locale ?? DEFAULT_LOCALE;
  const formatted = getFormatter(currency, locale, false).format(salary);
  return `${formatted}${intervalSuffix(options?.interval)}`;
}
