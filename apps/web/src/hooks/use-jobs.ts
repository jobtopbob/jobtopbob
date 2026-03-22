import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";
import type { JobFilters } from "./use-job-filters";

export type Job = components["schemas"]["Job"];
export type CreateJobRequest = components["schemas"]["CreateJobRequest"];
export type UpdateJobRequest = components["schemas"]["UpdateJobRequest"];

export interface JobsResponse {
  data: Job[];
  total: number;
  page: number;
  per_page: number;
}

function buildQueryParams(filters: JobFilters) {
  const params: Record<string, string | number> = {};

  if (filters.search) params.search = filters.search;
  if (filters.statuses.length > 0) params.statuses = filters.statuses.join(",");
  if (filters.stageIds.length > 0) params.stage_ids = filters.stageIds.join(",");
  if (filters.locationTypes.length > 0) params.location_types = filters.locationTypes.join(",");
  if (filters.sources.length > 0) params.sources = filters.sources.join(",");
  if (filters.tagIds.length > 0) params.tag_ids = filters.tagIds.join(",");
  if (filters.createdAfter) params.created_after = filters.createdAfter;
  if (filters.createdBefore) params.created_before = filters.createdBefore;
  if (filters.sortBy) params.sort_by = filters.sortBy;
  if (filters.sortOrder) params.sort_order = filters.sortOrder;
  params.page = filters.page;
  params.per_page = filters.perPage;

  return params;
}

export function useJobs(filters?: Partial<JobFilters>) {
  const resolvedFilters: JobFilters = {
    search: filters?.search ?? "",
    statuses: filters?.statuses ?? [],
    stageIds: filters?.stageIds ?? [],
    locationTypes: filters?.locationTypes ?? [],
    sources: filters?.sources ?? [],
    tagIds: filters?.tagIds ?? [],
    createdAfter: filters?.createdAfter ?? "",
    createdBefore: filters?.createdBefore ?? "",
    sortBy: filters?.sortBy ?? "created_at",
    sortOrder: filters?.sortOrder ?? "desc",
    page: filters?.page ?? 1,
    perPage: filters?.perPage ?? 25,
  };

  return useQuery({
    queryKey: ["jobs", resolvedFilters],
    queryFn: async () => {
      const params = buildQueryParams(resolvedFilters);
      const { data, error } = await api.GET("/api/v1/jobs", {
        params: { query: params as Record<string, unknown> },
      });
      if (error) throw new Error(error.error);
      return data as JobsResponse;
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

      // Find all active job list queries and optimistically update them
      const queries = queryClient.getQueriesData<JobsResponse>({
        queryKey: ["jobs"],
      });

      const previousMap = new Map<
        readonly unknown[],
        JobsResponse | undefined
      >();
      for (const [key, data] of queries) {
        if (data?.data) {
          previousMap.set(key, data);
          queryClient.setQueryData(key, {
            ...data,
            data: data.data.map((job) =>
              job.id === id ? { ...job, ...body } : job
            ),
          });
        }
      }

      return { previousMap };
    },
    onError: (_err, _vars, context) => {
      if (context?.previousMap) {
        for (const [key, data] of context.previousMap) {
          queryClient.setQueryData(key, data);
        }
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
