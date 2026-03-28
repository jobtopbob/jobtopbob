import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { auth } from "@/lib/auth";
import { AppShell } from "@/components/app-shell/app-shell";

const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8080";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const reqHeaders = await headers();
  const session = await auth.api.getSession({
    headers: reqHeaders,
  });

  if (!session) {
    redirect("/login");
  }

  // Check if onboarding is completed
  try {
    const tokenRes = await auth.api.getToken({ headers: reqHeaders });
    if (tokenRes?.token) {
      const res = await fetch(`${apiBaseUrl}/api/v1/settings`, {
        headers: { Authorization: `Bearer ${tokenRes.token}` },
        cache: "no-store",
      });
      if (res.ok) {
        const settings = await res.json();
        if (!settings.onboarding_completed) {
          redirect("/onboarding");
        }
      }
    }
  } catch (e) {
    // redirect() throws a special Next.js error — rethrow it
    if (e && typeof e === "object" && "digest" in e) throw e;
  }

  const userName = session.user.name || session.user.email || "User";

  return <AppShell userName={userName}>{children}</AppShell>;
}
