import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PROTECTED_PREFIXES = [
  "/dashboard",
  "/dashboard-test",
  "/issues",
  "/ai-runs",
  "/code-intelligence",
  "/pull-requests",
  "/developers",
  "/analytics",
  "/integrations",
  "/settings",
];

export function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const hasSession = request.cookies.has("session");
  const isProtected = PROTECTED_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  if (isProtected && !hasSession) {
    return NextResponse.redirect(new URL("/login", request.url));
  }

  if (pathname === "/login" && hasSession) {
    return NextResponse.redirect(new URL("/dashboard", request.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/dashboard-test/:path*",
    "/issues/:path*",
    "/ai-runs/:path*",
    "/code-intelligence/:path*",
    "/pull-requests/:path*",
    "/developers/:path*",
    "/analytics/:path*",
    "/integrations/:path*",
    "/settings/:path*",
    "/login",
  ],
};
