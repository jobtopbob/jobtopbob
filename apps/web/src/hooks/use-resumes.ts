import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import type { components } from "@jobtopbob/api-client";

export type Resume = components["schemas"]["Resume"];
export type CreateResumeRequest = components["schemas"]["CreateResumeRequest"];
export type UpdateResumeRequest = components["schemas"]["UpdateResumeRequest"];

const resumeKeys = {
  all: ["resumes"] as const,
  detail: (id: string) => ["resumes", id] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "error" in error) {
    return (error as { error: string }).error;
  }
  return "An error occurred";
}

export function useResumes() {
  return useQuery({
    queryKey: resumeKeys.all,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/resumes");
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume[];
    },
  });
}

export function useResume(id: string | undefined) {
  return useQuery({
    queryKey: resumeKeys.detail(id!),
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/resumes/{id}", {
        params: { path: { id: id! } },
      });
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume;
    },
    enabled: !!id,
  });
}

export function useCreateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: CreateResumeRequest) => {
      const { data, error } = await api.POST("/api/v1/resumes", { body });
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
    },
  });
}

export function useUpdateResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      id,
      body,
    }: {
      id: string;
      body: UpdateResumeRequest;
    }) => {
      const { data, error } = await api.PUT("/api/v1/resumes/{id}", {
        params: { path: { id } },
        body,
      });
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
    },
  });
}

export function useDeleteResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await api.DELETE("/api/v1/resumes/{id}", {
        params: { path: { id } },
      });
      if (error) throw new Error(getErrorMessage(error));
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
    },
  });
}

export function useExportResumePDF() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.GET("/api/v1/resumes/{id}/pdf", {
        params: { path: { id } },
      });
      if (error) throw new Error(getErrorMessage(error));
      return data as { url: string };
    },
  });
}

export function useSyncResumes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/api/v1/resumes/sync");
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume[];
    },
    onSuccess: (data) => {
      queryClient.setQueryData(resumeKeys.all, data);
    },
  });
}

export function useSetBaseResume() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (id: string) => {
      const { data, error } = await api.PUT("/api/v1/resumes/{id}/base", {
        params: { path: { id } },
      });
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: resumeKeys.all });
    },
  });
}
