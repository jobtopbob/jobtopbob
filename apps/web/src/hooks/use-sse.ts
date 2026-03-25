"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { authClient } from "@/lib/auth-client";
import { emailKeys } from "./use-email";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * useSSE establishes a Server-Sent Events connection to receive real-time
 * notifications (e.g., new email events). It automatically reconnects on
 * disconnect and invalidates relevant queries when events arrive.
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

      es.addEventListener("message", () => {
        // Invalidate email queries when a new event arrives
        queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmed });
        queryClient.invalidateQueries({ queryKey: emailKeys.unconfirmedCount });
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
