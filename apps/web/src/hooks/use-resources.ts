import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Resource = components["schemas"]["Resource"];
export type CreateResourceRequest =
  components["schemas"]["CreateResourceRequest"];
export type UpdateResourceRequest =
  components["schemas"]["UpdateResourceRequest"];

export interface ResourceFilters {
  search: string;
  types: string[];
  categories: string[];
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export const defaultResourceFilters: ResourceFilters = {
  search: "",
  types: [],
  categories: [],
  sortBy: "created_at",
  sortOrder: "desc",
  page: 1,
  perPage: 12,
};

export interface ResourcesResponse {
  data: Resource[];
  total: number;
  page: number;
  per_page: number;
}

export function useResources(filters?: Partial<ResourceFilters>) {
  const resolved: ResourceFilters = { ...defaultResourceFilters, ...filters };

  return useQuery({
    queryKey: ["resources", resolved],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (resolved.search) params.search = resolved.search;
      if (resolved.types.length > 0) params.types = resolved.types.join(",");
      if (resolved.categories.length > 0)
        params.categories = resolved.categories.join(",");
      params.sort_by = resolved.sortBy;
      params.sort_order = resolved.sortOrder;
      params.page = resolved.page;
      params.per_page = resolved.perPage;

      const { data, error } = await api.GET("/api/v1/resources", {
        params: { query: params as Record<string, unknown> },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch resources"
        );
      return data as ResourcesResponse;
    },
  });
}

export function useResource(id: string | undefined) {
  return useQuery({
    queryKey: ["resources", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/resources/{id}", {
        params: { path: { id: id! } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch resource"
        );
      return data as Resource;
    },
    enabled: !!id,
  });
}

export function useCreateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateResourceRequest) => {
      const { data, error } = await api.POST("/api/v1/resources", { body });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to create resource"
        );
      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

export function useUpdateResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateResourceRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/resources/{id}", {
        params: { path: { id } },
        body,
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to update resource"
        );
      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

export function useDeleteResource() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/resources/{id}", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to delete resource"
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}

export function useToggleResourcePin() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.POST("/api/v1/resources/{id}/pin", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to toggle pin"
        );
      return data as Resource;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["resources"] });
    },
  });
}
