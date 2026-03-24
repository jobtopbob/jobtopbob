import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { components } from "@jobtopbob/api-client";

export type Resume = components["schemas"]["Resume"];
export type ResumeConfig = components["schemas"]["ResumeConfig"];
export type CreateResumeRequest = components["schemas"]["CreateResumeRequest"];
export type UpdateResumeRequest = components["schemas"]["UpdateResumeRequest"];
export type SyncResumesResponse = components["schemas"]["SyncResumesResponse"];
export type RxResumeKeyStatus = components["schemas"]["RxResumeKeyStatus"];

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

export function useResumeConfig() {
  return useQuery({
    queryKey: ["resumes", "config"] as const,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/resumes/config");
      if (error) throw new Error(getErrorMessage(error));
      return data as ResumeConfig;
    },
    staleTime: 5 * 60 * 1000,
  });
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
    mutationFn: async ({
      id,
      fileName = "resume.pdf",
    }: {
      id: string;
      fileName?: string;
    }) => {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const { data: tokenData } = await authClient.token();
      const response = await fetch(`${baseUrl}/api/v1/resumes/${id}/pdf`, {
        headers: tokenData?.token
          ? { Authorization: `Bearer ${tokenData.token}` }
          : {},
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ?? `Failed to export PDF (${response.status})`,
        );
      }
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    },
  });
}

export function useSyncResumes() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.POST("/api/v1/resumes/sync");
      if (error) throw new Error(getErrorMessage(error));
      return data as SyncResumesResponse;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(resumeKeys.all, data.resumes);
    },
  });
}

export function useBaseResume() {
  return useQuery({
    queryKey: [...resumeKeys.all, "base"] as const,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/resumes/base");
      if (error) throw new Error(getErrorMessage(error));
      return data as Resume;
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

// --- RxResume API Key management ---

export function useRxResumeKeyStatus() {
  return useQuery({
    queryKey: ["settings", "rxresume-key"] as const,
    queryFn: async () => {
      const { data, error } = await api.GET(
        "/api/v1/settings/rxresume-key/status",
      );
      if (error) throw new Error(getErrorMessage(error));
      return data as RxResumeKeyStatus;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useConnectRxResumeKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (apiKey: string) => {
      const { data, error } = await api.PUT(
        "/api/v1/settings/rxresume-key",
        { body: { api_key: apiKey } },
      );
      if (error) throw new Error(getErrorMessage(error));
      return data as RxResumeKeyStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "rxresume-key"],
      });
      queryClient.invalidateQueries({ queryKey: ["resumes", "config"] });
    },
  });
}

export function useDisconnectRxResumeKey() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { data, error } = await api.DELETE(
        "/api/v1/settings/rxresume-key",
      );
      if (error) throw new Error(getErrorMessage(error));
      return data as RxResumeKeyStatus;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["settings", "rxresume-key"],
      });
      queryClient.invalidateQueries({ queryKey: ["resumes", "config"] });
    },
  });
}
