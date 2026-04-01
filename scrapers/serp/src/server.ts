import type { ScrapeRequest, ScrapeResponse, RawJob } from "@jobtopbob/scraper-shared";
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const PORT = parseInt(process.env.PORT ?? "3030", 10);
const SEARCHAPI_API_KEY = process.env.SEARCHAPI_API_KEY ?? "";
const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours

// ── In-memory cache (TTL-based, cleared on expiry) ──────────────────

interface CacheEntry {
  data: ScrapeResponse;
  expiresAt: number;
}

const cache = new Map<string, CacheEntry>();

function cacheKey(query: string, location: string, gl: string): string {
  const input = `${query}|${location}|${gl}`.toLowerCase();
  return createHash("sha256").update(input).digest("hex");
}

function getCached(key: string): ScrapeResponse | null {
  const entry = cache.get(key);
  if (!entry) return null;
  if (Date.now() > entry.expiresAt) {
    cache.delete(key);
    return null;
  }
  return entry.data;
}

function setCache(key: string, value: ScrapeResponse): void {
  cache.set(key, { data: value, expiresAt: Date.now() + CACHE_TTL_MS });
}

// Periodic cleanup of expired entries (every 30 minutes)
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of cache) {
    if (now > entry.expiresAt) cache.delete(key);
  }
}, 30 * 60 * 1000).unref();

// ── SearchAPI.io types ──────────────────────────────────────────────

interface SearchApiJob {
  position: number;
  title: string;
  company_name: string;
  location: string;
  via: string;
  description: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
    work_from_home?: boolean;
    health_insurance?: boolean;
  };
  job_highlights?: { title: string; items: string[] }[];
  apply_link?: string;
  apply_links?: { link: string; source: string }[];
  sharing_link?: string;
}

interface SearchApiResponse {
  jobs?: SearchApiJob[];
  pagination?: { next_page_token?: string };
  error?: string;
}

// ── Country code mapping ────────────────────────────────────────────

const COUNTRY_MAP: Record<string, string> = {
  US: "us", GB: "gb", CA: "ca", AU: "au", DE: "de", FR: "fr",
  IN: "in", NZ: "nz", NL: "nl", BR: "br", ZA: "za", SG: "sg",
  IE: "ie", AT: "at", CH: "ch", SE: "se", NO: "no", DK: "dk",
  FI: "fi", BE: "be", ES: "es", IT: "it", JP: "jp", KR: "kr",
  MY: "my", PH: "ph", PL: "pl", PT: "pt", MX: "mx", AR: "ar",
};

// ── Core search logic ───────────────────────────────────────────────

async function fetchPage(
  query: string,
  location: string,
  gl: string,
  nextPageToken?: string,
): Promise<SearchApiResponse> {
  const params = new URLSearchParams({
    engine: "google_jobs",
    q: query,
    api_key: SEARCHAPI_API_KEY,
  });

  if (location) params.set("location", location);
  if (gl) params.set("gl", gl);
  if (nextPageToken) params.set("next_page_token", nextPageToken);

  const url = `https://www.searchapi.io/api/v1/search?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SearchAPI.io error ${response.status}: ${text}`);
  }

  return (await response.json()) as SearchApiResponse;
}

function mapJob(job: SearchApiJob, gl: string): RawJob {
  const ext = job.detected_extensions;

  // Parse salary from extensions (e.g., "$80K–$120K a year")
  const salaryInfo = parseSalary(job.extensions, ext?.salary);

  // Best application URL: prefer direct apply link, fall back to sharing link
  const applicationUrl =
    job.apply_link ??
    job.apply_links?.[0]?.link ??
    undefined;

  const sourceUrl = applicationUrl ?? job.sharing_link ?? "";

  return {
    title: job.title,
    company: job.company_name,
    location: job.location,
    locationType: ext?.work_from_home ? "remote" : undefined,
    description: job.description,
    sourceUrl,
    applicationUrl,
    jobType: mapScheduleType(ext?.schedule_type),
    postedAt: ext?.posted_at,
    ...salaryInfo,
  };
}

function mapScheduleType(schedule?: string): string | undefined {
  if (!schedule) return undefined;
  const lower = schedule.toLowerCase();
  if (lower.includes("full")) return "full-time";
  if (lower.includes("part")) return "part-time";
  if (lower.includes("contract") || lower.includes("temp")) return "contract";
  if (lower.includes("intern")) return "internship";
  return undefined;
}

function parseSalary(
  extensions?: string[],
  salaryStr?: string,
): { salaryMin?: number; salaryMax?: number; salaryCurrency?: string; salaryInterval?: string } {
  const raw = salaryStr ?? extensions?.find((e) => /\$|€|£/.test(e));
  if (!raw) return {};

  // Detect currency
  let salaryCurrency: string | undefined;
  if (raw.includes("$")) salaryCurrency = "USD";
  else if (raw.includes("€")) salaryCurrency = "EUR";
  else if (raw.includes("£")) salaryCurrency = "GBP";

  // Detect interval
  let salaryInterval: string | undefined;
  const lowerRaw = raw.toLowerCase();
  if (lowerRaw.includes("year") || lowerRaw.includes("annual")) salaryInterval = "yearly";
  else if (lowerRaw.includes("month")) salaryInterval = "monthly";
  else if (lowerRaw.includes("hour")) salaryInterval = "hourly";
  else if (lowerRaw.includes("week")) salaryInterval = "weekly";

  // Extract numeric values (handle K suffix)
  const numbers = [...raw.matchAll(/[\d,]+\.?\d*\s*[kK]?/g)].map((m) => {
    let val = parseFloat(m[0].replace(/[,\s]/g, ""));
    if (/[kK]/.test(m[0])) val *= 1000;
    return Math.round(val);
  });

  if (numbers.length === 0) return {};

  return {
    salaryMin: numbers[0],
    salaryMax: numbers.length > 1 ? numbers[1] : undefined,
    salaryCurrency,
    salaryInterval,
  };
}

async function searchGoogleJobs(req: ScrapeRequest): Promise<ScrapeResponse> {
  if (!SEARCHAPI_API_KEY) {
    return { jobs: [], error: "SEARCHAPI_API_KEY is required" };
  }

  const query = req.keywords.join(" ");
  const gl = COUNTRY_MAP[req.country?.toUpperCase() ?? "US"] ?? "us";
  const location = req.location ?? "";

  // Check cache
  const key = cacheKey(query, location, gl);
  const cached = getCached(key);
  if (cached) return cached;

  const maxResults = req.maxResults || 20;
  const maxPages = Math.ceil(maxResults / 10);
  const allJobs: RawJob[] = [];
  let nextPageToken: string | undefined;

  for (let page = 0; page < maxPages; page++) {
    try {
      const data = await fetchPage(query, location, gl, nextPageToken);

      if (data.error) {
        if (allJobs.length === 0) {
          return { jobs: [], error: data.error };
        }
        break;
      }

      const jobs = data.jobs ?? [];
      for (const job of jobs) {
        allJobs.push(mapJob(job, gl));
        if (allJobs.length >= maxResults) break;
      }

      nextPageToken = data.pagination?.next_page_token;
      if (!nextPageToken || allJobs.length >= maxResults) break;
    } catch (err) {
      if (allJobs.length === 0) {
        return { jobs: [], error: String(err) };
      }
      break; // Return partial results on later page failures
    }
  }

  const result: ScrapeResponse = { jobs: allJobs };

  // Cache successful results
  if (allJobs.length > 0) {
    setCache(key, result);
  }

  return result;
}

// ── HTTP server ─────────────────────────────────────────────────────

const httpServer = createServer(async (req, res) => {
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  if (req.method === "POST" && req.url === "/scrape") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const scrapeReq = JSON.parse(body) as ScrapeRequest;
      const result = await searchGoogleJobs(scrapeReq);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify(result));
    } catch (err) {
      res.writeHead(400, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ jobs: [], error: String(err) }));
    }
    return;
  }

  res.writeHead(404);
  res.end("Not Found");
});

httpServer.listen(PORT, () => {
  console.log(`SERP scraper (SearchAPI.io) listening on port ${PORT}`);
});
