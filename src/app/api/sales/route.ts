import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError } from "@/lib/server/api";

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
    if (!session.shopId) apiError("No shop assignment", 403);
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
      p_shop_id: session.shopId,
      p_salesperson_id: session.id,
      p_entered_by_id: session.id,
      p_lines: lines,
      p_device_hash: body.deviceHash ?? null,
    });
    if (rpcError) throw rpcError;

    return data as { id: string; sale_no: string; total: number; duplicate: boolean };
  });
}
