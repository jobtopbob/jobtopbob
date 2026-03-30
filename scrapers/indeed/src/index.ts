import type { ScrapeRequest, ScrapeResponse } from "@jobtopbob/scraper-shared";
import { createServer } from "node:http";

const PORT = parseInt(process.env.PORT ?? "3000", 10);

async function scrape(_req: ScrapeRequest): Promise<ScrapeResponse> {
  // TODO: implement Indeed scraping via Playwright
  return { jobs: [], error: "Indeed scraper not yet implemented" };
}

const server = createServer(async (req, res) => {
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
      const result = await scrape(scrapeReq);
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

server.listen(PORT, () => {
  console.log(`Indeed scraper listening on port ${PORT}`);
});
