import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

const Body = z.object({
  shopId: z.string().uuid().optional(),
  items: z
    .array(z.object({ variantId: z.string().uuid(), qty: z.number().int().positive() }))
    .min(1),
  note: z.string().max(300).optional(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "supervisor", "area_manager", "admin");
    const body = Body.parse(await req.json());

    // Supervisors receive stock only into their own shop.
    const shopId = session.role === "supervisor" ? session.shopId : body.shopId ?? session.shopId;
    if (!shopId) apiError("No shop selected", 400);

    const { data, error } = await db().rpc("stock_in", {
      p_shop_id: shopId,
      p_actor: session.id,
      p_items: body.items.map((i) => ({ variant_id: i.variantId, qty: i.qty })),
      p_note: body.note ?? null,
    });
    if (error) throw error;
    return data as { lines: number };
  });
}
