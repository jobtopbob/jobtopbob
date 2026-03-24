import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { api } from "@/lib/api";
import { authClient } from "@/lib/auth-client";
import type { components } from "@jobtopbob/api-client";

export type UserSettings = components["schemas"]["UserSettings"];
export type UpdateUserSettingsRequest =
  components["schemas"]["UpdateUserSettingsRequest"];

export const settingsKeys = {
  all: ["settings"] as const,
  rxresumeKey: ["settings", "rxresume-key"] as const,
};

function getErrorMessage(error: unknown): string {
  if (error && typeof error === "object" && "error" in error) {
    return (error as { error: string }).error;
  }
  return "An error occurred";
}

export function useUserSettings() {
  return useQuery({
    queryKey: settingsKeys.all,
    queryFn: async () => {
      const { data, error } = await api.GET("/api/v1/settings");
      if (error) throw new Error(getErrorMessage(error));
      return data as UserSettings;
    },
    staleTime: 5 * 60 * 1000,
  });
}

export function useUploadAvatar() {
  return useMutation({
    mutationFn: async (file: File) => {
      const baseUrl =
        process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";
      const { data: tokenData } = await authClient.token();

      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch(`${baseUrl}/api/v1/settings/avatar`, {
        method: "POST",
        headers: tokenData?.token
          ? { Authorization: `Bearer ${tokenData.token}` }
          : {},
        body: formData,
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => null);
        throw new Error(
          errorData?.error ?? `Upload failed (${response.status})`,
        );
      }

      return (await response.json()) as { url: string };
    },
  });
}

export function useDeleteAvatar() {
  return useMutation({
    mutationFn: async () => {
      const { error } = await api.DELETE("/api/v1/settings/avatar");
      if (error) throw new Error(getErrorMessage(error));
    },
  });
}

export function useUpdateUserSettings() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (body: UpdateUserSettingsRequest) => {
      const { data, error } = await api.PUT("/api/v1/settings", { body });
      if (error) throw new Error(getErrorMessage(error));
      return data as UserSettings;
    },
    onSuccess: (data) => {
      queryClient.setQueryData(settingsKeys.all, data);
    },
  });
}
