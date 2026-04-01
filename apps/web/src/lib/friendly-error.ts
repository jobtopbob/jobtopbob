/** Maps raw backend/scraper errors to user-friendly messages. */
export function friendlyScrapeError(raw: string): string {
  const lower = raw.toLowerCase();
  if (lower.includes("context deadline exceeded") || lower.includes("timeout")) {
    return "The search took too long. Please try again with fewer keywords or a more specific location.";
  }
  if (lower.includes("serpapi") || lower.includes("api key")) {
    return "The job search service is temporarily unavailable. Please try again later.";
  }
  if (lower.includes("no scraper sources available")) {
    return "No job sources are currently configured. Please contact support.";
  }
  if (lower.includes("scraper returned")) {
    return "The job search service encountered an error. Please try again.";
  }
  if (lower.includes("no more results")) {
    return "No more results available for this search.";
  }
  if (lower.includes("hasn't returned any results") || lower.includes("no results")) {
    return "No jobs found for this search. Try different keywords or a broader location.";
  }
  return "Something went wrong with the search. Please try again.";
}
