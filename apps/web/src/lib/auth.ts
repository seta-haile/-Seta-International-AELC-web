import { cache } from "react";
import { cookies } from "next/headers";

export interface SessionUser {
  id: string;
  username: string;
  role: string;
}

export const getCurrentUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get("session")?.value;
  if (!token) return null;

  const res = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/auth/me`, {
    headers: { Authorization: `Bearer ${token}` },
    cache: "no-store",
  });

  if (!res.ok) return null;
  return res.json();
});
