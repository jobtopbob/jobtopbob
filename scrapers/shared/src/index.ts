/** ScrapeRequest is sent by the Go worker to each scraper service. */
export interface ScrapeRequest {
  keywords: string[];
  location: string;
  country: string;
  maxResults: number;
}

/** RawJob represents a single job listing returned by a scraper. */
export interface RawJob {
  title: string;
  company: string;
  location: string;
  locationType?: string;
  salaryMin?: number;
  salaryMax?: number;
  salaryCurrency?: string;
  salaryInterval?: string;
  description?: string;
  sourceUrl: string;
  applicationUrl?: string;
  jobType?: string;
  experienceLevel?: string;
  postedAt?: string;
  skills?: string[];
  via?: string;
  jobHighlights?: { title: string; items: string[] }[];
  benefits?: Record<string, boolean>;
  externalId?: string;
  applyOptions?: { title: string; link: string }[];
  thumbnailUrl?: string;
}

/** ScrapeResponse is the HTTP response from a scraper service. */
export interface ScrapeResponse {
  jobs: RawJob[];
  totalEstimated?: number;
  error?: string;
}
