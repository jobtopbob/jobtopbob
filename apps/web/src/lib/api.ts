import createClient from "openapi-fetch";
import type { paths } from "@jobtopbob/api-client";
import { authClient } from "./auth-client";

const baseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export const api = createClient<paths>({
  baseUrl,
});

api.use({
  async onRequest({ request }) {
    const { data } = await authClient.token();
    if (data?.token) {
      request.headers.set("Authorization", `Bearer ${data.token}`);
    }
    return request;
  },
  async onResponse({ response }) {
    if (response.status === 401 && typeof window !== "undefined") {
      const session = await authClient.getSession();
      if (!session.data) {
        window.location.href = "/sign-in";
      }
    }
    return response;
  },
});
