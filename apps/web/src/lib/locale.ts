/** Supported country codes (matching the scraper's COUNTRY_MAP). */
export const SUPPORTED_COUNTRIES: Record<string, string> = {
  US: "United States",
  GB: "United Kingdom",
  CA: "Canada",
  AU: "Australia",
  DE: "Germany",
  FR: "France",
  IN: "India",
  NZ: "New Zealand",
  NL: "Netherlands",
  BR: "Brazil",
  ZA: "South Africa",
  SG: "Singapore",
  IE: "Ireland",
  AT: "Austria",
  CH: "Switzerland",
  SE: "Sweden",
  NO: "Norway",
  DK: "Denmark",
  FI: "Finland",
  BE: "Belgium",
  ES: "Spain",
  IT: "Italy",
  JP: "Japan",
  KR: "South Korea",
  MY: "Malaysia",
  PH: "Philippines",
  PL: "Poland",
  PT: "Portugal",
  MX: "Mexico",
  AR: "Argentina",
};

/**
 * Detects the user's locale from the browser.
 * Returns a language code (e.g., "en") and a country code (e.g., "US").
 * Falls back to "en" / "US" when detection fails or the country isn't supported.
 */
export function detectLocale(): { language: string; country: string } {
  if (typeof navigator === "undefined") {
    return { language: "en", country: "US" };
  }

  const locale = navigator.language || "en-US";
  const parts = locale.split("-");
  const language = parts[0]?.toLowerCase() || "en";
  const regionRaw = (parts[1] || "").toUpperCase();

  // Validate against supported countries
  const country = regionRaw in SUPPORTED_COUNTRIES ? regionRaw : "US";

  return { language, country };
}
