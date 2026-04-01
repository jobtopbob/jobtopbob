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
 * Maps IANA timezones to ISO country codes for the supported countries.
 * Only includes unambiguous mappings — timezones shared by multiple
 * supported countries are omitted (the IP tier handles those).
 */
const TIMEZONE_TO_COUNTRY: Record<string, string> = {
  // United States
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "Pacific/Honolulu": "US",
  "America/Detroit": "US",
  "America/Indiana/Indianapolis": "US",
  "America/Boise": "US",
  // United Kingdom
  "Europe/London": "GB",
  // Canada
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "America/Halifax": "CA",
  "America/St_Johns": "CA",
  // Australia
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Australia/Adelaide": "AU",
  "Australia/Hobart": "AU",
  "Australia/Darwin": "AU",
  // Germany
  "Europe/Berlin": "DE",
  // France
  "Europe/Paris": "FR",
  // India
  "Asia/Kolkata": "IN",
  "Asia/Calcutta": "IN",
  // New Zealand
  "Pacific/Auckland": "NZ",
  // Netherlands
  "Europe/Amsterdam": "NL",
  // Brazil
  "America/Sao_Paulo": "BR",
  "America/Rio_Branco": "BR",
  "America/Manaus": "BR",
  "America/Fortaleza": "BR",
  "America/Recife": "BR",
  // South Africa
  "Africa/Johannesburg": "ZA",
  // Singapore
  "Asia/Singapore": "SG",
  // Ireland
  "Europe/Dublin": "IE",
  // Austria
  "Europe/Vienna": "AT",
  // Switzerland
  "Europe/Zurich": "CH",
  // Sweden
  "Europe/Stockholm": "SE",
  // Norway
  "Europe/Oslo": "NO",
  // Denmark
  "Europe/Copenhagen": "DK",
  // Finland
  "Europe/Helsinki": "FI",
  // Belgium
  "Europe/Brussels": "BE",
  // Spain
  "Europe/Madrid": "ES",
  // Italy
  "Europe/Rome": "IT",
  // Japan
  "Asia/Tokyo": "JP",
  // South Korea
  "Asia/Seoul": "KR",
  // Malaysia
  "Asia/Kuala_Lumpur": "MY",
  // Philippines
  "Asia/Manila": "PH",
  // Poland
  "Europe/Warsaw": "PL",
  // Portugal
  "Europe/Lisbon": "PT",
  // Mexico
  "America/Mexico_City": "MX",
  "America/Tijuana": "MX",
  "America/Monterrey": "MX",
  "America/Cancun": "MX",
  // Argentina
  "America/Argentina/Buenos_Aires": "AR",
  "America/Buenos_Aires": "AR",
};

/** Tier 1: Server-side IP geolocation via our API route. */
async function detectCountryByIP(): Promise<string | null> {
  try {
    const res = await fetch("/api/geo/detect", {
      signal: AbortSignal.timeout(4000),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as { country: string | null };
    const code = data.country?.toUpperCase();
    return code && code in SUPPORTED_COUNTRIES ? code : null;
  } catch {
    return null;
  }
}

/** Tier 2: Client-side timezone → country mapping. */
function detectCountryByTimezone(): string | null {
  try {
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const code = TIMEZONE_TO_COUNTRY[tz];
    return code && code in SUPPORTED_COUNTRIES ? code : null;
  } catch {
    return null;
  }
}

/** Tier 3: Browser language region subtag (least reliable). */
function detectCountryByLanguage(): string {
  if (typeof navigator === "undefined") return "US";
  const parts = (navigator.language || "en-US").split("-");
  const region = (parts[1] || "").toUpperCase();
  return region in SUPPORTED_COUNTRIES ? region : "US";
}

/**
 * Detects the user's country using a tiered approach:
 * 1. IP geolocation (server-side, most accurate)
 * 2. Timezone mapping (client-side, works offline)
 * 3. Browser language region (fallback)
 */
export async function detectCountry(): Promise<string> {
  const byIP = await detectCountryByIP();
  if (byIP) return byIP;

  const byTZ = detectCountryByTimezone();
  if (byTZ) return byTZ;

  return detectCountryByLanguage();
}

/**
 * Detects the user's preferred language from the browser.
 * This IS reliable from navigator.language (language preference is accurate,
 * unlike geographic location).
 */
export function detectLanguage(): string {
  if (typeof navigator === "undefined") return "en";
  const parts = (navigator.language || "en").split("-");
  return parts[0]?.toLowerCase() || "en";
}
