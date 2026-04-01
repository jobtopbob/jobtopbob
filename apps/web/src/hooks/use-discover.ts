import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { apiFetch } from "@/lib/api-fetch";

// -- Types --

export interface SearchProfile {
  id: string;
  user_id: string;
  name: string;
  source: string;
  resume_id: string | null;
  keywords: string[] | null;
  location: string | null;
  country: string | null;
  job_type: string | null;
  experience_level: string | null;
  remote_only: boolean;
  salary_min: number | null;
  salary_max: number | null;
  skills: string[] | null;
  target_roles: string[] | null;
  is_active: boolean;
  last_run_at: string | null;
  created_at: string;
  updated_at: string;
  run_count?: number;
  last_completed_at?: string | null;
}

export interface ScrapeRun {
  id: string;
  user_id: string;
  search_profile_id: string | null;
  status: string | null;
  sources: string[] | null;
  keywords: string[] | null;
  location: string | null;
  country: string | null;
  language: string | null;
  jobs_found: number | null;
  jobs_new: number | null;
  next_page_token: string | null;
  parent_run_id: string | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  search_profile_name?: string | null;
}

export interface DiscoveredJob {
  id: string;
  title: string;
  source: string | null;
  source_url: string | null;
  location: string | null;
  location_type: string | null;
  salary_min: number | null;
  salary_max: number | null;
  salary_currency: string | null;
  salary_interval: string | null;
  jd_raw: string | null;
  job_type: string | null;
  job_level: string | null;
  application_url: string | null;
  via: string | null;
  company_name: string | null;
  company_logo_url: string | null;
  created_at: string;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  per_page: number;
}

interface QuickSearchRequest {
  keywords: string[];
  location?: string;
  country?: string;
  language?: string;
  job_type?: string;
  experience_level?: string;
  remote_only?: boolean;
  sources?: string[];
}

// -- Search Profiles --

export function useSearchProfiles(page = 1, perPage = 25) {
  return useQuery({
    queryKey: ["search-profiles", page, perPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<SearchProfile>>(
        `/api/v1/search-profiles?page=${page}&per_page=${perPage}`
      ),
  });
}

export function useCreateSearchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: Omit<QuickSearchRequest, "sources"> & { name: string }) =>
      apiFetch<SearchProfile>("/api/v1/search-profiles", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

export function useDeleteSearchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<void>(`/api/v1/search-profiles/${id}`, { method: "DELETE" }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

export function useRunSearchProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ scrape_run_id: string; status: string }>(
        `/api/v1/search-profiles/${id}/run`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

// -- Quick Search --

export function useQuickSearch() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (body: QuickSearchRequest) =>
      apiFetch<{ search_profile_id: string; scrape_run_id: string; status: string }>(
        "/api/v1/discover/search",
        { method: "POST", body: JSON.stringify(body) }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
      queryClient.invalidateQueries({ queryKey: ["discovered-jobs"] });
    },
  });
}

// -- Scrape Runs --

export function useScrapeRuns(page = 1, perPage = 10) {
  return useQuery({
    queryKey: ["scrape-runs", page, perPage],
    queryFn: () =>
      apiFetch<PaginatedResponse<ScrapeRun>>(
        `/api/v1/scrape-runs?page=${page}&per_page=${perPage}`
      ),
    refetchInterval: (query) => {
      // Only poll when there are active (pending/running) scrape runs
      const runs = query.state.data?.data;
      const hasActive = runs?.some(
        (r) => r.status === "pending" || r.status === "running"
      );
      return hasActive ? 5000 : false;
    },
  });
}

// -- Continue Scrape Run (Load More) --

export function useContinueScrapeRun() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (runId: string) =>
      apiFetch<{ scrape_run_id: string; parent_run_id: string; status: string }>(
        `/api/v1/scrape-runs/${runId}/continue`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
      queryClient.invalidateQueries({ queryKey: ["discovered-jobs"] });
    },
  });
}

// -- Search From Resume --

export function useSearchFromResume() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (resumeId: string) =>
      apiFetch<{ search_profile_id: string; status: string }>(
        `/api/v1/discover/from-resume/${resumeId}`,
        { method: "POST" }
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
    },
  });
}

// -- Discovered Jobs --

export function useDiscoveredJobs(
  page = 1,
  perPage = 25,
  filters?: { search?: string; scrape_run_id?: string },
  options?: { refetchInterval?: number | false }
) {
  return useQuery({
    queryKey: ["discovered-jobs", page, perPage, filters],
    queryFn: () => {
      const params = new URLSearchParams();
      params.set("page", String(page));
      params.set("per_page", String(perPage));
      if (filters?.search) params.set("search", filters.search);
      if (filters?.scrape_run_id)
        params.set("scrape_run_id", filters.scrape_run_id);
      return apiFetch<PaginatedResponse<DiscoveredJob>>(
        `/api/v1/discover/jobs?${params.toString()}`
      );
    },
    refetchInterval: options?.refetchInterval,
  });
}
