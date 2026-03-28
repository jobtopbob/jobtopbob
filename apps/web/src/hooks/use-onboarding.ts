import { useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { settingsKeys } from "@/hooks/use-settings";

export function useCompleteOnboarding() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      const { error } = await api.POST(
        "/api/v1/settings/onboarding/complete",
      );
      if (error) throw new Error("Failed to complete onboarding");
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: settingsKeys.all });
    },
  });
}
