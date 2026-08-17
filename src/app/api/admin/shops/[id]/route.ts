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
 * Delete a shop — only while it has no trading history. Once sales exist the
 * shop is part of the ledger and must be deactivated instead, so past figures
 * stay explainable.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { id } = await ctx.params;

    const { data: shop, error } = await db()
      .from("shop")
      .select("id, name")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!shop) apiError("Shop not found", 404);

    const { count: saleCount, error: saleError } = await db()
      .from("sale")
      .select("id", { count: "exact", head: true })
      .eq("shop_id", id);
    if (saleError) throw saleError;
    if (saleCount && saleCount > 0) {
      apiError(
        `${shop.name} has ${saleCount} recorded sale${saleCount === 1 ? "" : "s"}. Deactivate it instead so its history stays intact.`,
        409
      );
    }

    // No sales: safe to remove the shop and everything that only described it.
    for (const table of ["stock_movement", "stock_level", "user_shop", "reconciliation", "target"]) {
      const { error: cleanupError } = await db().from(table).delete().eq("shop_id", id);
      if (cleanupError) throw cleanupError;
    }
    const { error: deleteError } = await db().from("shop").delete().eq("id", id);
    if (deleteError) throw deleteError;

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "shop_delete",
      entity: "shop",
      entity_id: id,
      before: { name: shop.name },
    });

    return { ok: true };
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
