import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError } from "@/lib/server/api";
import { getActiveShop } from "@/lib/server/queries";

const Body = z.object({
  idempotencyKey: z.string().min(8),
  lines: z
    .array(
      z.object({
        variant_id: z.string().uuid(),
        qty: z.number().int().positive(),
        unit_price: z.number().nonnegative(),
        discount: z.number().nonnegative().default(0),
      })
    )
    .min(1),
  deviceHash: z.string().optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    // Resolve the shop now — a transfer must take effect on the next sale,
    // not whenever the salesperson happens to sign in again.
    const shop = await getActiveShop(session.id);
    if (!shop) apiError("You are not assigned to a shop. Ask your supervisor.", 403);
    if (!shop.isActive) {
      apiError(`${shop.name} is closed. Ask your administrator to assign you to a shop.`, 403);
    }
    const body = Body.parse(await req.json());

    // Server-side price check: the client sends prices for display, but the
    // ledger records the catalogue price. Discounts beyond role limits are refused.
    const variantIds = body.lines.map((l) => l.variant_id);
    const { data: variants, error } = await db()
      .from("variant")
      .select("id, price")
      .in("id", variantIds);
    if (error) throw error;
    const priceMap = new Map(variants!.map((v) => [v.id, Number(v.price)]));

    const lines = body.lines.map((l) => {
      const price = priceMap.get(l.variant_id);
      if (price === undefined) apiError(`Unknown item in basket`, 400);
      if (session.role === "salesperson" && l.discount > 0) {
        apiError("Discounts require a supervisor", 403);
      }
      return { ...l, unit_price: price };
    });

    const { data, error: rpcError } = await db().rpc("create_sale", {
      p_idempotency_key: body.idempotencyKey,
      p_shop_id: shop.id,
      p_salesperson_id: session.id,
      p_entered_by_id: session.id,
      p_lines: lines,
      p_device_hash: body.deviceHash ?? null,
    });
    if (rpcError) throw rpcError;

    return data as { id: string; sale_no: string; total: number; duplicate: boolean };
  });
}
