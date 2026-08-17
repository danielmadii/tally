import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

const Body = z.object({
  price: z.number().positive().optional(),
  costPrice: z.number().nonnegative().nullable().optional(),
  reorderPoint: z.number().int().nonnegative().optional(),
  isActive: z.boolean().optional(),
  addBarcode: z.string().min(4).max(30).optional(),
});

/**
 * Delete a product variant — only while it has never been sold. Sold items
 * are referenced by sale lines forever, so they are deactivated instead.
 */
export async function DELETE(_req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "admin");
    const { id } = await ctx.params;

    const { data: variant, error } = await db()
      .from("variant")
      .select("id, sku, product_id")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!variant) apiError("Product not found", 404);

    const { count, error: lineError } = await db()
      .from("sale_line")
      .select("id", { count: "exact", head: true })
      .eq("variant_id", id);
    if (lineError) throw lineError;
    if (count && count > 0) {
      apiError(
        `${variant.sku} has been sold ${count} time${count === 1 ? "" : "s"}. Deactivate it instead so past sales stay readable.`,
        409
      );
    }

    for (const table of ["variant_barcode", "price_history", "stock_movement", "stock_level"]) {
      const { error: cleanupError } = await db().from(table).delete().eq("variant_id", id);
      if (cleanupError) throw cleanupError;
    }
    const { error: deleteError } = await db().from("variant").delete().eq("id", id);
    if (deleteError) throw deleteError;

    // Remove the parent product too once it has no variants left.
    const { count: siblings } = await db()
      .from("variant")
      .select("id", { count: "exact", head: true })
      .eq("product_id", variant.product_id);
    if (!siblings) {
      await db().from("product").delete().eq("id", variant.product_id);
    }

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "variant_delete",
      entity: "variant",
      entity_id: id,
      before: { sku: variant.sku },
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

    const { data: variant, error } = await db()
      .from("variant")
      .select("id, sku, price, cost_price, is_active")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!variant) apiError("Variant not found", 404);

    const priceChanged =
      body.price !== undefined && Number(variant.price) !== body.price;

    const updates: Record<string, unknown> = {};
    if (body.price !== undefined) updates.price = body.price;
    if (body.costPrice !== undefined) updates.cost_price = body.costPrice;
    if (body.reorderPoint !== undefined) updates.reorder_point = body.reorderPoint;
    if (body.isActive !== undefined) updates.is_active = body.isActive;
    if (Object.keys(updates).length) {
      const { error: updateError } = await db().from("variant").update(updates).eq("id", id);
      if (updateError) throw updateError;
    }

    // A price change never rewrites history — close the old row, open a new one.
    if (priceChanged) {
      await db()
        .from("price_history")
        .update({ valid_to: new Date().toISOString() })
        .eq("variant_id", id)
        .is("valid_to", null);
      await db().from("price_history").insert({
        variant_id: id,
        price: body.price,
        cost_price: body.costPrice !== undefined ? body.costPrice : variant.cost_price,
        changed_by: session.id,
      });
    }

    if (body.addBarcode) {
      const barcode = body.addBarcode.trim();
      const { data: clash } = await db()
        .from("variant_barcode")
        .select("variant_id")
        .eq("barcode", barcode)
        .maybeSingle();
      if (clash) apiError("That barcode is already bound to a variant", 409);
      const { error: bcError } = await db()
        .from("variant_barcode")
        .insert({ variant_id: id, barcode, is_primary: false });
      if (bcError) throw bcError;
    }

    if (priceChanged || body.isActive !== undefined || body.addBarcode) {
      await db().from("audit_log").insert({
        actor_id: session.id,
        action: "variant_update",
        entity: "variant",
        entity_id: id,
        before: { price: Number(variant.price), is_active: variant.is_active },
        after: {
          ...(body.price !== undefined && { price: body.price }),
          ...(body.isActive !== undefined && { is_active: body.isActive }),
          ...(body.addBarcode && { added_barcode: body.addBarcode }),
        },
      });
    }

    return { ok: true };
  });
}
