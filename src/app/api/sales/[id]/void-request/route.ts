import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError } from "@/lib/server/api";

const Body = z.object({
  reason: z.enum([
    "wrong_item",
    "wrong_quantity",
    "customer_changed_mind",
    "wrong_person",
    "price_error",
  ]),
  note: z.string().max(500).optional(),
});

export async function POST(req: NextRequest, ctx: { params: Promise<{ id: string }> }) {
  return handle(async () => {
    const session = await requireApiSession();
    const { id } = await ctx.params;
    const body = Body.parse(await req.json());

    const { data: sale, error } = await db()
      .from("sale")
      .select("id, salesperson_id, status, void_requested_at")
      .eq("id", id)
      .maybeSingle();
    if (error) throw error;
    if (!sale) apiError("Sale not found", 404);
    if (sale.salesperson_id !== session.id && session.role === "salesperson") {
      apiError("Not your sale", 403);
    }
    if (sale.status !== "completed") apiError("Sale is not open", 400);
    if (sale.void_requested_at) apiError("Void already requested", 400);

    const reason = body.note ? `${body.reason}: ${body.note}` : body.reason;
    const { error: updateError } = await db()
      .from("sale")
      .update({ void_requested_at: new Date().toISOString(), void_request_reason: reason })
      .eq("id", id);
    if (updateError) throw updateError;

    await db().from("audit_log").insert({
      actor_id: session.id,
      action: "void_request",
      entity: "sale",
      entity_id: id,
      after: { reason },
    });

    return { ok: true };
  });
}
