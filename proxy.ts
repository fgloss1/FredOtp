import { NextRequest, NextResponse } from "next/server";

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();
const WINDOW_MS = 10 * 60 * 1000;

const LIMITS: Record<string, number> = {
  "/api/auth/login": 10,
  "/api/auth/register": 5,
  "/api/wallet/topup": 10,
  "/api/payments/paystack/verify": 15,
  "/api/rentals": 30,
};

function clientIp(request: NextRequest): string {
  return (
    request.headers.get("x-vercel-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip")?.trim() ||
    "unknown"
  );
}

function limitFor(pathname: string, method: string): number | null {
  if (pathname === "/api/rentals" && method === "POST") return LIMITS["/api/rentals"];
  if (pathname === "/api/rentals" && method === "DELETE") return 20;
  if (method === "POST") return LIMITS[pathname] ?? null;
  if (method === "GET" && pathname === "/api/payments/paystack/verify") return LIMITS[pathname];
  return null;
}

export function proxy(request: NextRequest) {
  const pathname = request.nextUrl.pathname;
  const method = request.method.toUpperCase();

  const length = Number(request.headers.get("content-length") ?? "0");
  if (pathname.startsWith("/api/") && ["POST", "PUT", "PATCH"].includes(method) && length > 32_768) {
    return NextResponse.json({ error: "Request is too large." }, { status: 413 });
  }

  const limit = limitFor(pathname, method);
  if (limit == null) return NextResponse.next();

  const now = Date.now();
  const key = `${clientIp(request)}:${method}:${pathname}`;
  const current = buckets.get(key);

  if (!current || current.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + WINDOW_MS });
    return NextResponse.next();
  }

  if (current.count >= limit) {
    const retryAfter = Math.max(1, Math.ceil((current.resetAt - now) / 1000));
    return NextResponse.json(
      { error: "Too many requests. Please try again shortly." },
      {
        status: 429,
        headers: {
          "Retry-After": String(retryAfter),
        },
      },
    );
  }

  current.count += 1;
  return NextResponse.next();
}

export const config = {
  matcher: ["/api/:path*"],
};
