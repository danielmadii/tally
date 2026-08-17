import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";
import { businessDate } from "@/lib/format";

const Body = z.object({ reason: z.string().max(300).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "supervisor", "area_manager", "admin");
    const { id } = await ctx.params;
    const body = Body.parse(await req.json().catch(() => ({})));

    const { data: sale, error } = await db()
      .from("sale")
      .select("id, shop_id, business_date, status")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!sale) apiError("Sale not found", 404);

    // Supervisors approve only in their own shop, and only same-day voids —
    // older ones need an area manager or admin (§10.1).
    if (session.role === "supervisor") {
      if (sale.shop_id !== session.shopId) apiError("Not your shop", 403);
      if (sale.business_date !== businessDate()) {
        apiError("Voids after the business day need an area manager or admin", 403);
      }
    }

    const { data, error: rpcError } = await db().rpc("void_sale", {
      p_sale_id: id,
      p_actor: session.id,
      p_reason: body.reason ?? null,
    });
    if (rpcError) throw rpcError;
    return data;
  });
}
