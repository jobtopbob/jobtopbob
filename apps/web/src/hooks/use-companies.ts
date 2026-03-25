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

export function useCompanies() {
  return useQuery({
    queryKey: ["companies"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/companies");
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch companies"
        );
      return data as CompanyWithJobCount[];
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
