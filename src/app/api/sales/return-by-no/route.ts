import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";

const Body = z.object({
  saleNo: z.string().min(3).max(30),
  note: z.string().max(300).optional(),
});

/** Record a return by sale number — the counter workflow: the customer brings
 *  the item back, the supervisor types the number from My Sales / the export. */
export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "supervisor", "area_manager", "admin");
    const body = Body.parse(await req.json());

    const { data: sale, error } = await db()
      .from("sale")
      .select("id, shop_id, status")
      .eq("sale_no", body.saleNo.trim().toUpperCase())
      .maybeSingle();
    if (error) throw error;
    if (!sale) apiError("No sale with that number", 404);
    if (sale.status !== "completed") apiError(`Sale is already ${sale.status}`, 400);
    if (session.role === "supervisor" && sale.shop_id !== session.shopId) {
      apiError("Not your shop", 403);
    }

    const { data, error: rpcError } = await db().rpc("return_sale", {
      p_sale_id: sale.id,
      p_actor: session.id,
      p_note: body.note ?? null,
    });
    if (rpcError) throw rpcError;
    return data;
  });
}
