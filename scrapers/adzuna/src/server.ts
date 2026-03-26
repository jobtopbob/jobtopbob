import type { ScrapeRequest, ScrapeResponse, RawJob } from "@jobtopbob/scraper-shared";

const PORT = parseInt(process.env.PORT ?? "3030", 10);
const ADZUNA_APP_ID = process.env.ADZUNA_APP_ID ?? "";
const ADZUNA_APP_KEY = process.env.ADZUNA_APP_KEY ?? "";
const ADZUNA_BASE_URL = "https://api.adzuna.com/v1/api/jobs";

// Adzuna API country codes (subset — extend as needed)
const COUNTRY_MAP: Record<string, string> = {
  US: "us",
  GB: "gb",
  CA: "ca",
  AU: "au",
  DE: "de",
  FR: "fr",
  IN: "in",
  NZ: "nz",
  NL: "nl",
  BR: "br",
  ZA: "za",
  SG: "sg",
};

interface AdzunaResult {
  title: string;
  company: { display_name: string };
  location: { display_name: string; area: string[] };
  description: string;
  redirect_url: string;
  salary_min?: number;
  salary_max?: number;
  contract_time?: string;
  contract_type?: string;
  category?: { label: string; tag: string };
  created: string;
}

interface AdzunaResponse {
  results: AdzunaResult[];
  count: number;
}

async function searchAdzuna(req: ScrapeRequest): Promise<ScrapeResponse> {
  if (!ADZUNA_APP_ID || !ADZUNA_APP_KEY) {
    return { jobs: [], error: "ADZUNA_APP_ID and ADZUNA_APP_KEY are required" };
  }

  const country = COUNTRY_MAP[req.country?.toUpperCase() ?? "US"] ?? "us";
  const resultsPerPage = Math.min(req.maxResults || 50, 50);
  const keywords = req.keywords.join(" ");

  const params = new URLSearchParams({
    app_id: ADZUNA_APP_ID,
    app_key: ADZUNA_APP_KEY,
    results_per_page: String(resultsPerPage),
    what: keywords,
    content_type: "application/json",
    sort_by: "date",
  });

  if (req.location) {
    params.set("where", req.location);
  }

  const url = `${ADZUNA_BASE_URL}/${country}/search/1?${params.toString()}`;

  const response = await fetch(url);
  if (!response.ok) {
    const text = await response.text();
    return { jobs: [], error: `Adzuna API error ${response.status}: ${text}` };
  }

  const data = (await response.json()) as AdzunaResponse;

  const jobs: RawJob[] = data.results.map((r) => ({
    title: r.title,
    company: r.company?.display_name ?? "",
    location: r.location?.display_name ?? "",
    description: r.description ?? "",
    sourceUrl: r.redirect_url,
    salaryMin: r.salary_min ? Math.round(r.salary_min) : undefined,
    salaryMax: r.salary_max ? Math.round(r.salary_max) : undefined,
    salaryCurrency: country === "us" ? "USD" : country === "gb" ? "GBP" : undefined,
    salaryInterval: r.salary_min ? "yearly" : undefined,
    jobType: mapContractTime(r.contract_time),
    postedAt: r.created,
  }));

  return { jobs, totalEstimated: data.count };
}

function mapContractTime(time?: string): string | undefined {
  switch (time) {
    case "full_time":
      return "full-time";
    case "part_time":
      return "part-time";
    case "contract":
      return "contract";
    default:
      return undefined;
  }
}

import { createServer } from "node:http";

const httpServer = createServer(async (req, res) => {
  // Health check
  if (req.method === "GET" && req.url === "/health") {
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ status: "ok" }));
    return;
  }

  // Scrape endpoint
  if (req.method === "POST" && req.url === "/scrape") {
    let body = "";
    for await (const chunk of req) {
      body += chunk;
    }

    try {
      const scrapeReq = JSON.parse(body) as ScrapeRequest;
      const result = await searchAdzuna(scrapeReq);
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
  console.log(`Adzuna scraper listening on port ${PORT}`);
});
