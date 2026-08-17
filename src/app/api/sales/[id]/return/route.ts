import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

const Body = z.object({ note: z.string().max(300).optional() });

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "supervisor", "area_manager", "admin");
    const { id } = await ctx.params;
    const body = Body.parse(await req.json().catch(() => ({})));

    if (session.role === "supervisor") {
      const { data: sale } = await db().from("sale").select("shop_id").eq("id", id).maybeSingle();
      if (!sale) apiError("Sale not found", 404);
      if (sale.shop_id !== session.shopId) apiError("Not your shop", 403);
    }

    const { data, error } = await db().rpc("return_sale", {
      p_sale_id: id,
      p_actor: session.id,
      p_note: body.note ?? null,
    });
    if (error) throw error;
    return data;
  });
}
