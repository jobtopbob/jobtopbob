import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Contact = components["schemas"]["Contact"];
export type CreateContactRequest =
  components["schemas"]["CreateContactRequest"];
export type UpdateContactRequest =
  components["schemas"]["UpdateContactRequest"];

export interface ContactFilters {
  search: string;
  statuses: string[];
  sources: string[];
  companyId: string;
  sortBy: string;
  sortOrder: string;
  page: number;
  perPage: number;
}

export const defaultContactFilters: ContactFilters = {
  search: "",
  statuses: [],
  sources: [],
  companyId: "",
  sortBy: "name",
  sortOrder: "asc",
  page: 1,
  perPage: 12,
};

export interface ContactsResponse {
  data: Contact[];
  total: number;
  page: number;
  per_page: number;
}

export function useContacts(filters?: Partial<ContactFilters>) {
  const resolved: ContactFilters = { ...defaultContactFilters, ...filters };

  return useQuery({
    queryKey: ["contacts", resolved],
    queryFn: async () => {
      const params: Record<string, string | number> = {};
      if (resolved.search) params.search = resolved.search;
      if (resolved.statuses.length > 0)
        params.statuses = resolved.statuses.join(",");
      if (resolved.sources.length > 0)
        params.sources = resolved.sources.join(",");
      if (resolved.companyId) params.company_id = resolved.companyId;
      params.sort_by = resolved.sortBy;
      params.sort_order = resolved.sortOrder;
      params.page = resolved.page;
      params.per_page = resolved.perPage;

      const { data, error } = await api.GET("/api/v1/contacts", {
        params: { query: params as Record<string, unknown> },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch contacts"
        );
      return data as ContactsResponse;
    },
  });
}

export function useContact(id: string | undefined) {
  return useQuery({
    queryKey: ["contacts", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/contacts/{id}", {
        params: { path: { id: id! } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to fetch contact"
        );
      return data as Contact;
    },
    enabled: !!id,
  });
}

export function useSearchContacts(query: string) {
  return useQuery({
    queryKey: ["contacts", "search", query],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/contacts/search", {
        params: { query: { q: query } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to search contacts"
        );
      return data as Contact[];
    },
    enabled: query.length >= 2,
  });
}

export function useCreateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateContactRequest) => {
      const { data, error } = await api.POST("/api/v1/contacts", { body });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to create contact"
        );
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUpdateContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateContactRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/contacts/{id}", {
        params: { path: { id } },
        body,
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to update contact"
        );
      return data as Contact;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContact() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/contacts/{id}", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to delete contact"
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useUploadContactAvatar() {
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
        `${baseUrl}/api/v1/contacts/${id}/avatar`,
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
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}

export function useDeleteContactAvatar() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/contacts/{id}/avatar", {
        params: { path: { id } },
      });
      if (error)
        throw new Error(
          (error as { error?: string })?.error ?? "Failed to delete avatar"
        );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["contacts"] });
    },
  });
}
