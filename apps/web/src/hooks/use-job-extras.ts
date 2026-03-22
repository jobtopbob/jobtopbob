import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type ActivityLogEntry = components["schemas"]["ActivityLogEntry"];

export function useActivityLog(jobId: string | undefined) {
  return useQuery({
    queryKey: ["jobs", jobId, "activity"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/jobs/{id}/activity", {
        params: { path: { id: jobId! } },
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to fetch activity");
      return data as ActivityLogEntry[];
    },
    enabled: !!jobId,
  });
}

export function useAssignTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, tagId }: { jobId: string; tagId: string }) => {
      const { error } = await api.POST("/api/v1/jobs/{id}/tags", {
        params: { path: { id: jobId } },
        body: { tag_id: tagId },
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to assign tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}

export function useRemoveTag() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, tagId }: { jobId: string; tagId: string }) => {
      const { error } = await api.DELETE("/api/v1/jobs/{id}/tags/{tagId}", {
        params: { path: { id: jobId, tagId } },
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to remove tag");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
    },
  });
}
