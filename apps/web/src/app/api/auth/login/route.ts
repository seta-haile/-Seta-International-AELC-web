import { cookies } from "next/headers";
import { NextResponse } from "next/server";

const SESSION_COOKIE = "session";

function getTokenExpirySeconds(token: string): number | undefined {
  try {
    const [, payload] = token.split(".");
    const { exp } = JSON.parse(Buffer.from(payload, "base64url").toString("utf8"));
    return typeof exp === "number" ? Math.max(exp - Math.floor(Date.now() / 1000), 0) : undefined;
  } catch {
    return undefined;
  }
}

function isSecureRequest(request: Request): boolean {
  const forwardedProto = request.headers.get("x-forwarded-proto");
  if (forwardedProto) return forwardedProto === "https";
  return new URL(request.url).protocol === "https:";
}

export async function POST(request: Request) {
  const body = await request.json();

  const apiRes = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/login`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!apiRes.ok) {
    return NextResponse.json(
      { message: "Invalid username or password" },
      { status: apiRes.status },
    );
  }

  const { accessToken, user } = await apiRes.json();

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE, accessToken, {
    httpOnly: true,
    secure: isSecureRequest(request),
    sameSite: "lax",
    path: "/",
    maxAge: getTokenExpirySeconds(accessToken),
  });

  return NextResponse.json({ user });
}
