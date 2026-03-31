"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { emailKeys } from "./use-email";
import { toast } from "sonner";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

const intentLabels: Record<string, string> = {
  interview_invite: "Interview invite",
  rejection: "Rejection",
  offer: "Offer",
  assessment: "Assessment",
  follow_up: "Follow-up",
};

interface SSEEmailEvent {
  type: "email_event";
  data: {
    id: string;
    detected_type: string;
    confidence: number;
    company_name: string;
    snippet: string;
  };
}

interface SSEScrapeProgressEvent {
  type: "scrape_progress";
  data: {
    scrape_run_id: string;
    source: string;
    jobs_found: number;
    jobs_new: number;
    error: string | null;
  };
}

interface SSEScrapeCompletedEvent {
  type: "scrape_completed";
  data: {
    scrape_run_id: string;
    status: string;
  };
}

interface SSEScrapeStartedEvent {
  type: "scrape_started";
  data: {
    scrape_run_id: string;
    sources: string[];
  };
}

type SSEEvent =
  | SSEEmailEvent
  | SSEScrapeStartedEvent
  | SSEScrapeProgressEvent
  | SSEScrapeCompletedEvent;

/**
 * useSSE establishes a Server-Sent Events connection to receive real-time
 * notifications (e.g., new email events, scrape progress). It automatically
 * reconnects on disconnect and invalidates relevant queries when events arrive.
 */
export function useSSE() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    let cancelled = false;
    let retryTimeout: ReturnType<typeof setTimeout>;

    async function connect() {
      if (cancelled) return;

      const { data: tokenData } = await authClient.token();
      if (!tokenData?.token || cancelled) return;

      // EventSource doesn't support custom headers, so pass token as query param
      const url = `${baseUrl}/api/v1/events?token=${encodeURIComponent(tokenData.token)}`;
      const es = new EventSource(url);
      eventSourceRef.current = es;

      es.addEventListener("message", (e) => {
        let payload: SSEEvent;
        try {
          payload = JSON.parse(e.data) as SSEEvent;
        } catch {
          return;
        }

        switch (payload.type) {
          case "email_event": {
            queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
            queryClient.invalidateQueries({
              queryKey: emailKeys.unconfirmedCount,
            });
            const { detected_type, company_name } = payload.data;
            const label = intentLabels[detected_type] ?? "Email event";
            const message = company_name
              ? `${label} detected from ${company_name}`
              : `${label} detected`;
            toast.info(message, {
              action: {
                label: "View",
                onClick: () => {
                  window.location.href = "/email-integration";
                },
              },
            });
            break;
          }

          case "scrape_started": {
            queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
            break;
          }

          case "scrape_progress": {
            queryClient.invalidateQueries({ queryKey: ["discovered-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
            const { source, jobs_new } = payload.data;
            if (jobs_new > 0) {
              toast.info(
                `Found ${jobs_new} new job${jobs_new === 1 ? "" : "s"} from ${source}`
              );
            }
            break;
          }

          case "scrape_completed": {
            queryClient.invalidateQueries({ queryKey: ["discovered-jobs"] });
            queryClient.invalidateQueries({ queryKey: ["scrape-runs"] });
            queryClient.invalidateQueries({ queryKey: ["search-profiles"] });
            if (payload.data.status === "completed") {
              toast.success("Job search complete");
            } else {
              toast.error("Job search finished with errors");
            }
            break;
          }
        }
      });

      es.onerror = () => {
        es.close();
        eventSourceRef.current = null;
        // Reconnect after 5 seconds
        if (!cancelled) {
          retryTimeout = setTimeout(connect, 5000);
        }
      };
    }

    connect();

    return () => {
      cancelled = true;
      clearTimeout(retryTimeout);
      eventSourceRef.current?.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);
}
