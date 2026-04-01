import type { ScrapeRequest, ScrapeResponse, RawJob } from "@jobtopbob/scraper-shared";
import { createServer } from "node:http";
import { createHash } from "node:crypto";

const PORT = parseInt(process.env.PORT ?? "3030", 10);
const SERPAPI_API_KEY = process.env.SERPAPI_API_KEY ?? "";
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

// ── SerpApi types ──────────────────────────────────────────────────

interface SerpApiJob {
  title: string;
  company_name: string;
  location: string;
  via: string;
  share_link?: string;
  thumbnail?: string;
  job_id: string;
  description: string;
  extensions?: string[];
  detected_extensions?: {
    posted_at?: string;
    schedule_type?: string;
    salary?: string;
    work_from_home?: boolean;
    paid_time_off?: boolean;
    health_insurance?: boolean;
    dental_coverage?: boolean;
    qualifications?: string;
  };
  job_highlights?: { title: string; items: string[] }[];
  apply_options?: { title: string; link: string }[];
}

interface SerpApiResponse {
  jobs_results?: SerpApiJob[];
  serpapi_pagination?: { next_page_token?: string };
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
  hl?: string,
  nextPageToken?: string,
): Promise<SerpApiResponse> {
  const params = new URLSearchParams({
    engine: "google_jobs",
    q: query,
    api_key: SERPAPI_API_KEY,
  });

  if (location) params.set("location", location);
  if (gl) params.set("gl", gl);
  if (hl) params.set("hl", hl);
  if (nextPageToken) params.set("next_page_token", nextPageToken);

  const url = `https://serpapi.com/search.json?${params.toString()}`;
  const response = await fetch(url);

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`SerpApi error ${response.status}: ${text}`);
  }

  return (await response.json()) as SerpApiResponse;
}

function mapJob(job: SerpApiJob): RawJob {
  const ext = job.detected_extensions;

  // Parse salary from extensions (e.g., "$80K–$120K a year")
  const salaryInfo = parseSalary(job.extensions, ext?.salary);

  // Best application URL: first apply option link
  const applicationUrl = job.apply_options?.[0]?.link;
  const sourceUrl = job.share_link ?? applicationUrl ?? "";

  // Extract benefit flags from detected_extensions
  const benefits: Record<string, boolean> = {};
  if (ext?.paid_time_off) benefits.paid_time_off = true;
  if (ext?.health_insurance) benefits.health_insurance = true;
  if (ext?.dental_coverage) benefits.dental_coverage = true;

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
    via: job.via,
    jobHighlights: job.job_highlights,
    benefits: Object.keys(benefits).length > 0 ? benefits : undefined,
    externalId: job.job_id,
    applyOptions: job.apply_options,
    thumbnailUrl: job.thumbnail,
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
  if (!SERPAPI_API_KEY) {
    return { jobs: [], error: "SERPAPI_API_KEY is required" };
  }

  const query = req.keywords.join(" ");
  const gl = COUNTRY_MAP[req.country?.toUpperCase() ?? "US"] ?? "us";
  const hl = req.language || undefined;
  const location = req.location ?? "";

  // Include starting token in cache key to avoid collisions between initial and continuation searches
  const key = cacheKey(query, location, `${gl}:${hl ?? ""}:${req.nextPageToken ?? ""}`);
  const cached = getCached(key);
  if (cached) return cached;

  const maxResults = req.maxResults || 20;
  const allJobs: RawJob[] = [];
  let cursor: string | undefined = req.nextPageToken || undefined;
  let lastNextPageToken: string | undefined;

  // Fetch pages using next_page_token cursor pagination
  while (allJobs.length < maxResults) {
    try {
      const data = await fetchPage(query, location, gl, hl, cursor);

      if (data.error) {
        // "No results" is a valid search outcome, not an error
        if (data.error.toLowerCase().includes("hasn't returned any results")) {
          break;
        }
        if (allJobs.length === 0) {
          return { jobs: [], error: data.error };
        }
        break;
      }

      const jobs = data.jobs_results ?? [];
      if (jobs.length === 0) break;

      for (const job of jobs) {
        allJobs.push(mapJob(job));
        if (allJobs.length >= maxResults) break;
      }

      // Track the next page token for continuation
      const nextToken = data.serpapi_pagination?.next_page_token;
      if (!nextToken) {
        lastNextPageToken = undefined;
        break; // No more pages
      }

      lastNextPageToken = nextToken;
      cursor = nextToken;
    } catch (err) {
      if (allJobs.length === 0) {
        return { jobs: [], error: String(err) };
      }
      break; // Return partial results on later page failures
    }
  }

  const result: ScrapeResponse = {
    jobs: allJobs,
    nextPageToken: lastNextPageToken,
  };

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
  console.log(`SERP scraper (SerpApi) listening on port ${PORT}`);
});
