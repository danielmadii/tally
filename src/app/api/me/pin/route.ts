import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError } from "@/lib/server/api";

const Body = z.object({
  currentPin: z.string().min(4).max(6),
  newPin: z.string().regex(/^\d{4,6}$/),
});

/** Let people change their own PIN — the current one proves it is them. */
export async function PATCH(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    const body = Body.parse(await req.json());

    const { data: user, error } = await db()
      .from("app_user")
      .select("id, pin_hash")
      .eq("id", session.id)
      .maybeSingle();
    if (error) throw error;
    if (!user) apiError("Account not found", 404);
    if (!(await bcrypt.compare(body.currentPin, user.pin_hash))) {
      apiError("That is not your current PIN", 403);
    }
    if (body.currentPin === body.newPin) {
      apiError("The new PIN must be different", 400);
    }

    const { error: updateError } = await db()
      .from("app_user")
      .update({ pin_hash: bcrypt.hashSync(body.newPin, 10) })
      .eq("id", session.id);
    if (updateError) throw updateError;

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "pin_change",
      entity: "app_user",
      entity_id: session.id,
    });

    return { ok: true };
  });
}
