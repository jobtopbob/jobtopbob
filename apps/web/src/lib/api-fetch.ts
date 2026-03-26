import { authClient } from "./auth-client";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

/**
 * Authenticated fetch wrapper for endpoints not yet in the OpenAPI spec.
 * Uses the same auth token as the typed api client.
 */
export async function apiFetch<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const { data } = await authClient.token();
  const headers = new Headers(options.headers);
  if (data?.token) {
    headers.set("Authorization", `Bearer ${data.token}`);
  }
  if (!headers.has("Content-Type") && options.body) {
    headers.set("Content-Type", "application/json");
  }

  const res = await fetch(`${baseUrl}${path}`, {
    ...options,
    headers,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Request failed: ${res.status}`);
  }

  if (res.status === 204) return undefined as T;
  return res.json() as Promise<T>;
}
