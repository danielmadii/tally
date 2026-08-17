import { NextRequest } from "next/server";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, requireRole } from "@/lib/server/api";

export async function GET(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const limit = Math.min(Number(req.nextUrl.searchParams.get("limit") ?? 200), 500);

    const { data, error } = await db()
      .from("audit_log")
      .select("id, action, entity, entity_id, before, after, created_at, actor:actor_id ( full_name )")
      .order("created_at", { ascending: false })
      .limit(limit);
    if (error) throw error;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    return {
      entries: (data as any[]).map((e) => ({
        id: e.id,
        action: e.action,
        entity: e.entity,
        entityId: e.entity_id,
        before: e.before,
        after: e.after,
        createdAt: e.created_at,
        actor: e.actor?.full_name ?? "system",
      })),
    };
  });
}
