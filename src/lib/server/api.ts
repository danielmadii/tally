import { NextResponse } from "next/server";

/** Uniform JSON error handling for route handlers. */
export async function handle<T>(fn: () => Promise<T>): Promise<NextResponse> {
  try {
    const data = await fn();
    return NextResponse.json(data);
  } catch (err) {
    const status = (err as { status?: number }).status ?? 500;
    const message = err instanceof Error ? err.message : "Unexpected error";
    if (status >= 500) console.error("[api]", err);
    return NextResponse.json({ error: message }, { status });
  }
}

export function apiError(message: string, status: number): never {
  throw Object.assign(new Error(message), { status });
}

import type { Role, SessionUser } from "@/lib/types";

/** Server-side permission gate — never rely on hidden UI. */
export function requireRole(session: SessionUser, ...roles: Role[]) {
  if (!roles.includes(session.role)) {
    apiError("You don't have permission to do that", 403);
  }
}
