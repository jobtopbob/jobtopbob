"use client";

import {
  useQuery,
  useMutation,
  useQueryClient,
} from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const emailKeys = {
  status: ["email", "status"] as const,
  events: ["email", "events"] as const,
  unconfirmed: ["email", "unconfirmed"] as const,
  unconfirmedCount: ["email", "unconfirmed", "count"] as const,
};

async function fetchWithAuth(path: string, options?: RequestInit) {
  const { data: tokenData } = await authClient.token();
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
  };
  if (tokenData?.token) {
    headers["Authorization"] = `Bearer ${tokenData.token}`;
  }

  const response = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers: { ...headers, ...options?.headers },
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => null);
    throw new Error(errorData?.error ?? `Request failed (${response.status})`);
  }

  if (response.status === 204) return null;
  return response.json();
}

// --- Gmail Connection ---

export interface GmailStatus {
  connected: boolean;
  email?: string;
}

export function useGmailStatus() {
  return useQuery({
    queryKey: emailKeys.status,
    queryFn: async (): Promise<GmailStatus> => {
      return fetchWithAuth("/api/v1/email/status");
    },
    staleTime: 30 * 1000,
  });
}

export function useConnectGmail() {
  return useMutation({
    mutationFn: async () => {
      const data = await fetchWithAuth("/api/v1/email/oauth/connect");
      // Redirect user to Google consent screen
      window.location.href = data.url;
      return data;
    },
  });
}

export function useDisconnectGmail() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await fetchWithAuth("/api/v1/email/disconnect", { method: "DELETE" });
    },
    onSuccess: () => {
      queryClient.setQueryData(emailKeys.status, {
        connected: false,
        email: undefined,
      });
      queryClient.invalidateQueries({ queryKey: emailKeys.events });
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmedCount });
    },
  });
}

// --- Email Events ---

export interface EmailEvent {
  id: string;
  user_id: string;
  job_id: string | null;
  gmail_message_id: string | null;
  detected_type: string | null;
  confidence: number | null;
  confirmed: boolean | null;
  raw_snippet: string | null;
  company_name: string | null;
  from_email: string | null;
  job_title: string | null;
  job_company_name: string | null;
  job_stage_id: string | null;
  job_stage_name: string | null;
  created_at: string;
  updated_at: string;
}

export interface EmailEventList {
  data: EmailEvent[];
  total: number;
  page: number;
}

export interface StageChange {
  from_stage: string;
  to_stage: string;
}

export interface ConfirmResult {
  event: EmailEvent;
  stage_change?: StageChange;
}

export function useUnconfirmedEmailEvents(page = 1, perPage = 25) {
  return useQuery({
    queryKey: [...emailKeys.unconfirmed, page, perPage],
    queryFn: async (): Promise<EmailEventList> => {
      return fetchWithAuth(
        `/api/v1/email/events/unconfirmed?page=${page}&per_page=${perPage}`,
      );
    },
    staleTime: 10 * 1000,
  });
}

export function useUnconfirmedCount() {
  return useQuery({
    queryKey: emailKeys.unconfirmedCount,
    queryFn: async (): Promise<{ count: number }> => {
      return fetchWithAuth("/api/v1/email/events/unconfirmed/count");
    },
    staleTime: 10 * 1000,
    refetchInterval: 30 * 1000,
  });
}

export function useEmailEvents(page = 1, perPage = 25) {
  return useQuery({
    queryKey: [...emailKeys.events, page, perPage],
    queryFn: async (): Promise<EmailEventList> => {
      return fetchWithAuth(
        `/api/v1/email/events?page=${page}&per_page=${perPage}`,
      );
    },
    staleTime: 10 * 1000,
  });
}

export function useConfirmEmailEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string): Promise<ConfirmResult> => {
      return fetchWithAuth(`/api/v1/email/events/${eventId}/confirm`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmedCount });
      queryClient.invalidateQueries({ queryKey: emailKeys.events });
    },
  });
}

export function useDismissEmailEvent() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (eventId: string) => {
      return fetchWithAuth(`/api/v1/email/events/${eventId}/dismiss`, {
        method: "POST",
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmedCount });
      queryClient.invalidateQueries({ queryKey: emailKeys.events });
    },
  });
}

export function useLinkEmailEventToJob() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({
      eventId,
      jobId,
    }: {
      eventId: string;
      jobId: string;
    }) => {
      return fetchWithAuth(`/api/v1/email/events/${eventId}/job`, {
        method: "PUT",
        body: JSON.stringify({ job_id: jobId }),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
      queryClient.invalidateQueries({ queryKey: emailKeys.events });
    },
  });
}
