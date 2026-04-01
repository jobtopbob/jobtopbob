import { NextRequest, NextResponse } from "next/server";

const IP_API_URL = "http://ip-api.com/json";

/** Returns true for loopback and private-range IPs where geolocation won't work. */
function isPrivateIP(ip: string): boolean {
  return (
    ip === "::1" ||
    ip === "127.0.0.1" ||
    ip.startsWith("10.") ||
    ip.startsWith("172.16.") ||
    ip.startsWith("172.17.") ||
    ip.startsWith("172.18.") ||
    ip.startsWith("172.19.") ||
    ip.startsWith("172.2") ||
    ip.startsWith("172.30.") ||
    ip.startsWith("172.31.") ||
    ip.startsWith("192.168.") ||
    ip.startsWith("fc") ||
    ip.startsWith("fd")
  );
}

export async function GET(request: NextRequest) {
  const forwarded = request.headers.get("x-forwarded-for");
  const realIP = request.headers.get("x-real-ip");
  const ip = forwarded?.split(",")[0]?.trim() || realIP || null;

  if (!ip || isPrivateIP(ip)) {
    return NextResponse.json({ country: null });
  }

  try {
    const res = await fetch(`${IP_API_URL}/${ip}?fields=countryCode`, {
      signal: AbortSignal.timeout(3000),
    });

    if (!res.ok) {
      return NextResponse.json({ country: null });
    }

    const data = (await res.json()) as { countryCode?: string };
    return NextResponse.json({
      country: data.countryCode?.toUpperCase() || null,
    });
  } catch {
    return NextResponse.json({ country: null });
  }
}
