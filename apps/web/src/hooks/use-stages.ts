import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Stage = components["schemas"]["Stage"];

export function useStages() {
  return useQuery({
    queryKey: ["stages"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/stages");
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to fetch stages");
      return data as Stage[];
    },
  });
}
