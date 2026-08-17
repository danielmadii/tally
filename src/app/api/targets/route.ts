import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, requireRole } from "@/lib/server/api";
import { getSalespeopleWithTargets } from "@/lib/server/queries";
import { monthStart } from "@/lib/format";

export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    return { rows: await getSalespeopleWithTargets() };
  });
}

const Body = z.object({
  targets: z
    .array(z.object({ userId: z.string().uuid(), value: z.number().nonnegative().nullable() }))
    .min(1),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const body = Body.parse(await req.json());
    const mStart = monthStart();

    for (const t of body.targets) {
      if (t.value === null || t.value === 0) {
        const { error } = await db()
          .from("target")
          .delete()
          .eq("user_id", t.userId)
          .eq("period_month", mStart);
        if (error) throw error;
      } else {
        const { error } = await db()
          .from("target")
          .upsert(
            {
              period_month: mStart,
              user_id: t.userId,
              target_value: t.value,
              set_by: session.id,
              set_at: new Date().toISOString(),
            },
            { onConflict: "user_id,period_month" }
          );
        if (error) throw error;
      }
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "targets_set",
      entity: "target",
      after: { month: mStart, count: body.targets.length },
    });

    return { ok: true };
  });
}
