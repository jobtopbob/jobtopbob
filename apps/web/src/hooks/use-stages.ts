import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
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

export function useCreateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (body: { name: string; position: number; color?: string; mapped_status?: string; is_terminal?: boolean }) => {
      const { data, error } = await api.POST("/api/v1/stages", { body });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to create stage");
      return data as Stage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  });
}

export function useUpdateStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, body }: { id: string; body: { name?: string; color?: string; mapped_status?: string; is_terminal?: boolean } }) => {
      const { data, error } = await api.PUT("/api/v1/stages/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to update stage");
      return data as Stage;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  });
}

export function useDeleteStage() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/stages/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to delete stage");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  });
}

export function useReorderStages() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (stages: { id: string; position: number }[]) => {
      const { error } = await api.PUT("/api/v1/stages/reorder", {
        body: { stages },
      });
      if (error) throw new Error((error as { error?: string })?.error ?? "Failed to reorder stages");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["stages"] });
    },
  });
}
