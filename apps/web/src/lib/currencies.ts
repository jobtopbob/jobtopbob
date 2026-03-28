export type CurrencyInfo = {
  code: string;
  country: string;
  name: string;
  flag: string;
};

/** Convert a 2-letter country code to a flag emoji via regional indicator symbols. */
function countryToFlag(countryCode: string): string {
  return [...countryCode.toUpperCase()]
    .map((c) => String.fromCodePoint(0x1f1e6 + c.charCodeAt(0) - 65))
    .join("");
}

function currency(code: string, country: string, name: string): CurrencyInfo {
  return { code, country, name, flag: countryToFlag(country) };
}

/**
 * Curated list of ~40 commonly used currencies.
 * Popular currencies are listed first, then alphabetical by code.
 */
export const CURRENCIES: CurrencyInfo[] = [
  // Popular
  currency("USD", "US", "US Dollar"),
  currency("EUR", "EU", "Euro"),
  currency("GBP", "GB", "British Pound"),
  currency("CAD", "CA", "Canadian Dollar"),
  currency("AUD", "AU", "Australian Dollar"),
  currency("JPY", "JP", "Japanese Yen"),
  currency("CHF", "CH", "Swiss Franc"),
  currency("CNY", "CN", "Chinese Yuan"),
  currency("INR", "IN", "Indian Rupee"),
  // Alphabetical
  currency("AED", "AE", "UAE Dirham"),
  currency("ARS", "AR", "Argentine Peso"),
  currency("BDT", "BD", "Bangladeshi Taka"),
  currency("BRL", "BR", "Brazilian Real"),
  currency("CLP", "CL", "Chilean Peso"),
  currency("COP", "CO", "Colombian Peso"),
  currency("CZK", "CZ", "Czech Koruna"),
  currency("DKK", "DK", "Danish Krone"),
  currency("EGP", "EG", "Egyptian Pound"),
  currency("HKD", "HK", "Hong Kong Dollar"),
  currency("HUF", "HU", "Hungarian Forint"),
  currency("IDR", "ID", "Indonesian Rupiah"),
  currency("ILS", "IL", "Israeli Shekel"),
  currency("KRW", "KR", "South Korean Won"),
  currency("MXN", "MX", "Mexican Peso"),
  currency("MYR", "MY", "Malaysian Ringgit"),
  currency("NGN", "NG", "Nigerian Naira"),
  currency("NOK", "NO", "Norwegian Krone"),
  currency("NZD", "NZ", "New Zealand Dollar"),
  currency("PEN", "PE", "Peruvian Sol"),
  currency("PHP", "PH", "Philippine Peso"),
  currency("PKR", "PK", "Pakistani Rupee"),
  currency("PLN", "PL", "Polish Zloty"),
  currency("QAR", "QA", "Qatari Riyal"),
  currency("RON", "RO", "Romanian Leu"),
  currency("SAR", "SA", "Saudi Riyal"),
  currency("SEK", "SE", "Swedish Krona"),
  currency("SGD", "SG", "Singapore Dollar"),
  currency("THB", "TH", "Thai Baht"),
  currency("TRY", "TR", "Turkish Lira"),
  currency("TWD", "TW", "Taiwan Dollar"),
  currency("UAH", "UA", "Ukrainian Hryvnia"),
  currency("VND", "VN", "Vietnamese Dong"),
  currency("ZAR", "ZA", "South African Rand"),
];

/** Lookup a CurrencyInfo by code (case-insensitive). */
export function findCurrency(code: string | null | undefined): CurrencyInfo | undefined {
  if (!code) return undefined;
  const upper = code.toUpperCase();
  return CURRENCIES.find((c) => c.code === upper);
}

/** Get display label for a currency code (e.g. "USD" → "🇺🇸 USD"). */
export function currencyLabel(code: string | null | undefined): string {
  const info = findCurrency(code);
  if (info) return `${info.flag} ${info.code}`;
  return code?.toUpperCase() ?? "USD";
}
