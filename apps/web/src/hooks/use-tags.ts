import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Tag = components["schemas"]["Tag"];

export function useTags() {
  return useQuery({
    queryKey: ["tags"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/tags");
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to fetch tags");
      return data as Tag[];
    },
  });
}
