import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Company = components["schemas"]["Company"];
export type CompanyWithJobCount = components["schemas"]["CompanyWithJobCount"];
export type CreateCompanyRequest =
  components["schemas"]["CreateCompanyRequest"];
export type UpdateCompanyRequest =
  components["schemas"]["UpdateCompanyRequest"];
export type EnrichmentLog = components["schemas"]["EnrichmentLog"];

export interface CompanyFilters {
  search: string;
  industries: string[];
  sizes: string[];
  dataSources: string[];
  enrichmentStatuses: string[];
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export const defaultCompanyFilters: CompanyFilters = {
  search: "",
  industries: [],
  sizes: [],
  dataSources: [],
  enrichmentStatuses: [],
  sortBy: "name",
  sortOrder: "asc",
  page: 1,
  perPage: 10,
};

export interface CompaniesResponse {
  data: CompanyWithJobCount[];
  total: number;
  page: number;
  per_page: number;
}

export function useCompanies(filters?: Partial<CompanyFilters>) {
  const resolved: CompanyFilters = { ...defaultCompanyFilters, ...filters };

  return useQuery({
    queryKey: ["companies", resolved],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (resolved.search) params.search = resolved.search;
      if (resolved.industries.length > 0)
        params.industries = resolved.industries.join(",");
      if (resolved.sizes.length > 0) params.sizes = resolved.sizes.join(",");
      if (resolved.dataSources.length > 0)
        params.data_sources = resolved.dataSources.join(",");
      if (resolved.enrichmentStatuses.length > 0)
        params.enrichment_statuses = resolved.enrichmentStatuses.join(",");
      params.sort_by = resolved.sortBy;
      params.sort_order = resolved.sortOrder;
      params.page = resolved.page;
      params.per_page = resolved.perPage;

      const { data, error } = await api.GET("/api/v1/companies", {
        params: { query: params as Record<string, unknown> },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch companies"
        );
      return data as CompaniesResponse;
    },
  });
}

export function useCompany(id: string | undefined) {
  return useQuery({
    queryKey: ["companies", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/companies/{id}", {
        params: { path: { id: id! } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch company"
        );
      return data as CompanyWithJobCount;
    },
    enabled: !!id,
  });
}

export function useSearchCompanies(query: string) {
  return useQuery({
    queryKey: ["companies", "search", query],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/companies/search", {
        params: { query: { q: query } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to search companies"
        );
      return data as Company[];
    },
    enabled: query.length >= 2,
  });
}

export function useCreateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateCompanyRequest) => {
      const { data, error } = await api.POST("/api/v1/companies", { body });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to create company"
        );
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useUpdateCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateCompanyRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/companies/{id}", {
        params: { path: { id } },
        body,
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to update company"
        );
      return data as Company;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/companies/{id}", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to delete company"
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUploadCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, file }: { id: string; file: File }) => {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const { authClient } = await import("@/lib/auth-client");
      const { data: tokenData } = await authClient.token();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(
        `${baseUrl}/api/v1/companies/${id}/logo`,
        {
          method: "POST",
          headers: tokenData?.token
            ? { Authorization: `Bearer ${tokenData.token}` }
            : {},
          body: formData,
        }
      );

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ?? `Upload failed (${response.status})`
        );
      }

      return (await response.json()) as { url: string };
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useDeleteCompanyLogo() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/companies/{id}/logo", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to delete logo"
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}

export function useEnrichmentLogs(companyId: string | undefined) {
  return useQuery({
    queryKey: ["companies", companyId, "enrichment-logs"],
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/api/v1/companies/{id}/enrichment-logs",
        { params: { path: { id: companyId! } } }
      );
      if (error)
        throw new Error(
          (error as { error?: string })?.error ??
            "Failed to fetch enrichment logs"
        );
      return data as EnrichmentLog[];
    },
    enabled: !!companyId,
  });
}

export function useEnrichCompany() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.POST("/api/v1/companies/{id}/enrich", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to enrich company"
        );
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["companies"] });
    },
  });
}
