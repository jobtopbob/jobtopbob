import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Job = components["schemas"]["Job"];
export type CreateJobRequest = components["schemas"]["CreateJobRequest"];
export type UpdateJobRequest = components["schemas"]["UpdateJobRequest"];

export function useJobs() {
  return useQuery({
    queryKey: ["jobs"],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/jobs", {
        params: { query: { per_page: 200 } },
      });
      if (error) throw new Error(error.error);
      return data as { data: Job[]; total: number; page: number; per_page: number };
    },
  });
}

export function useJob(id: string | undefined) {
  return useQuery({
    queryKey: ["jobs", id],
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/jobs/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(error.error);
      return data as Job;
    },
    enabled: !!id,
  });
}

export function useCreateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateJobRequest) => {
      const { data, error } = await api.POST("/api/v1/jobs", { body });
      if (error) throw new Error(error.error);
      return data as Job;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useUpdateJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateJobRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/jobs/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw new Error(error.error);
      return data as Job;
    },
    onMutate: async ({ id, body }) => {
      await queryClient.cancelQueries({ queryKey: ["jobs"] });
      const previous = queryClient.getQueryData<{
        data: Job[];
        total: number;
        page: number;
        per_page: number;
      }>(["jobs"]);

      if (previous) {
        queryClient.setQueryData(["jobs"], {
          ...previous,
          data: previous.data.map((job) =>
            job.id === id ? { ...job, ...body } : job
          ),
        });
      }

      return { previous };
    },
    onError: (_err, _vars, context) => {
      if (context?.previous) {
        queryClient.setQueryData(["jobs"], context.previous);
      }
    },
    onSettled: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}

export function useDeleteJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/jobs/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error(error.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["jobs"] });
      queryClient.invalidateQueries({ queryKey: ["stats"] });
    },
  });
}
