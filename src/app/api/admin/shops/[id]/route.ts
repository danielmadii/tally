import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

const Body = z.object({
  isActive: z.boolean().optional(),
  name: z.string().min(2).max(100).optional(),
  city: z.string().max(100).optional(),
  address: z.string().max(200).optional(),
});

/**
 * Delete a closed shop and everything recorded against it. Deactivation is the
 * required first step, so this can never be a one-click accident, and the
 * shop's salespeople are deactivated with it.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { id } = await ctx.params;

    const { data: shop, error } = await db()
      .from("shop")
      .select("id, name, is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!shop) apiError("Shop not found", 404);
    if (shop.is_active) {
      apiError(`Deactivate ${shop.name} first, then delete it.`, 409);
    }

    const { data, error: rpcError } = await db().rpc("delete_shop_cascade", {
      p_shop_id: id,
      p_actor: session.id,
    });
    if (rpcError) throw rpcError;

    return data as {
      name: string;
      salesDeleted: number;
      salespeopleDeactivated: number;
    };
  });
}

export async function PATCH(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { id } = await ctx.params;
    const body = Body.parse(await req.json());

    const { data: shop, error } = await db()
      .from("shop")
      .select("id, name, is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!shop) apiError("Shop not found", 404);

    // Never delete a shop — deactivating keeps its history intact.
    const updates: Record<string, unknown> = {};
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (body.name !== undefined) updates.name = body.name.trim();
    if (body.city !== undefined) updates.city = body.city.trim() || null;
    if (body.address !== undefined) updates.address = body.address.trim() || null;
    if (Object.keys(updates).length) {
      const { error: updateError } = await db().from("shop").update(updates).eq("id", id);
      if (updateError) throw updateError;
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "shop_update",
      entity: "shop",
      entity_id: id,
      before: { name: shop.name, is_active: shop.is_active },
      after: updates,
    });

    return { ok: true };
  });
}
