import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Stats = components["schemas"]["Stats"];

export function useStats() {
  return useQuery({
    queryKey: ["stats"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/stats");
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to fetch stats");
      return data as Stats;
    },
  });
}
