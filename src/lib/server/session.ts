import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { SignJWT, jwtVerify } from "jose";
import type { Role, SessionUser } from "@/lib/types";

const COOKIE = "tally_session";

function secret() {
  const s = process.env.AUTH_SECRET;
  if (!s) throw new Error("AUTH_SECRET is not set (see .env.example).");
  return new TextEncoder().encode(s);
}

export async function createSession(user: SessionUser, rememberDays: number) {
  const token = await new SignJWT({ ...user })
    .setProtectedHeader({ alg: "HS256" })
    .setSubject(user.id)
    .setIssuedAt()
    .setExpirationTime(`${rememberDays}d`)
    .sign(secret());

  const store = await cookies();
  store.set(COOKIE, token, {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    maxAge: rememberDays * 24 * 60 * 60,
    path: "/",
  });
}

export async function destroySession() {
  (await cookies()).delete(COOKIE);
}

export async function getSession(): Promise<SessionUser | null> {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  try {
    const { payload } = await jwtVerify(token, secret());
    return {
      id: payload.sub as string,
      name: payload.name as string,
      role: payload.role as Role,
      shopId: (payload.shopId as string | null) ?? null,
      shopName: (payload.shopName as string | null) ?? null,
    };
  } catch {
    return null;
  }
}

/** For pages: redirect to /login when unauthenticated. */
export async function requireSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) redirect("/login");
  return session;
}

/** For API routes: throw a 401-shaped error when unauthenticated. */
export async function requireApiSession(): Promise<SessionUser> {
  const session = await getSession();
  if (!session) {
    throw Object.assign(new Error("Not authenticated"), { status: 401 });
  }
  return session;
}
