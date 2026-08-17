import { NextRequest } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";
import { businessDate } from "@/lib/format";

const Body = z.object({
  name: z.string().min(2).max(100).optional(),
  phone: z.string().min(4).max(20).optional(),
  isActive: z.boolean().optional(),
  pin: z.string().regex(/^\d{4,6}$/).optional(),
  role: z.enum(["salesperson", "supervisor", "area_manager", "admin"]).optional(),
  // null = unassign; a shop id transfers (date-ranged, history preserved)
  shopId: z.string().uuid().nullable().optional(),
});

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { id } = await ctx.params;
    const body = Body.parse(await req.json());

    const { data: user, error } = await db()
      .from("app_user")
      .select("id, full_name, phone, role, is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!user) apiError("User not found", 404);
    if (id === session.id && body.isActive === false) {
      apiError("You cannot deactivate your own account", 400);
    }
    if (id === session.id && body.role !== undefined && body.role !== "admin") {
      apiError("You cannot remove your own admin access", 400);
    }

    // The phone number is the login identifier — it must stay unique.
    if (body.phone !== undefined && body.phone.trim() !== user.phone) {
      const { data: clash } = await db()
        .from("app_user")
        .select("id")
        .eq("phone", body.phone.trim())
        .maybeSingle();
      if (clash) apiError("Another user already has that phone number", 409);
    }

    const updates: Record<string, unknown> = {};
    if (body.name !== undefined) updates.full_name = body.name.trim();
    if (body.phone !== undefined) updates.phone = body.phone.trim();
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.role !== undefined) updates.role = body.role;
    if (body.pin !== undefined) updates.pin_hash = bcrypt.hashSync(body.pin, 10);
    if (Object.keys(updates).length) {
      const { error: updateError } = await db().from("app_user").update(updates).eq("id", id);
      if (updateError) throw updateError;
    }

    if (body.shopId !== undefined) {
      // End the current assignment; history stays so past sales keep their shop.
      const today = businessDate();
      const { error: endError } = await db()
        .from("user_shop")
        .update({ end_date: today })
        .eq("user_id", id)
        .is("end_date", null);
      if (endError) throw endError;
      if (body.shopId) {
        const { error: assignError } = await db()
          .from("user_shop")
          .insert({ user_id: id, shop_id: body.shopId, start_date: today });
        if (assignError) throw assignError;
      }
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "user_update",
      entity: "app_user",
      entity_id: id,
      before: { name: user.full_name, phone: user.phone, role: user.role, is_active: user.is_active },
      after: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.phone !== undefined && { phone: body.phone }),
        ...(body.role !== undefined && { role: body.role }),
        ...(body.isActive !== undefined && { is_active: body.isActive }),
        ...(body.pin !== undefined && { pin: "reset" }),
        ...(body.shopId !== undefined && { shop_id: body.shopId }),
      },
    });

    return { ok: true };
  });
}
