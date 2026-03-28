import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Offer = components["schemas"]["Offer"];
export type CreateOfferRequest = components["schemas"]["CreateOfferRequest"];
export type UpdateOfferRequest = components["schemas"]["UpdateOfferRequest"];

export interface OfferFilters {
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
  search: string;
  status: string; // "accepted" | "declined" | "pending" | ""
  remotePolicy: string; // "remote" | "hybrid" | "onsite" | ""
}

export const defaultOfferFilters: OfferFilters = {
  sortBy: "created_at",
  sortOrder: "desc",
  page: 1,
  perPage: 20,
  search: "",
  status: "",
  remotePolicy: "",
};

export interface OffersResponse {
  data: Offer[];
  total: number;
  page: number;
  per_page: number;
}

export function useOffers(filters?: Partial<OfferFilters>) {
  const resolved: OfferFilters = { ...defaultOfferFilters, ...filters };

  return useQuery({
    queryKey: ["offers", resolved],
    queryFn: async () => {
      const params: Record<string, string | number> = {
        sort_by: resolved.sortBy,
        sort_order: resolved.sortOrder,
        page: resolved.page,
        per_page: resolved.perPage,
      };
      if (resolved.search) params.search = resolved.search;
      if (resolved.status) params.status = resolved.status;
      if (resolved.remotePolicy) params.remote_policy = resolved.remotePolicy;

      const { data, error } = await api.GET("/api/v1/offers", {
        params: { query: params as Record<string, unknown> },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch offers"
        );
      return data as OffersResponse;
    },
  });
}

export function useOffer(id: string | undefined) {
  return useQuery({
    queryKey: ["offers", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/offers/{id}", {
        params: { path: { id: id! } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch offer"
        );
      return data as Offer;
    },
    enabled: !!id,
  });
}

export function useCreateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateOfferRequest) => {
      const { data, error } = await api.POST("/api/v1/offers", { body });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to create offer"
        );
      return data as Offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useUpdateOffer() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateOfferRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/offers/{id}", {
        params: { path: { id } },
        body,
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to update offer"
        );
      return data as Offer;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["offers"] });
    },
  });
}
