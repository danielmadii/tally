import { NextRequest } from "next/server";
import { z } from "zod";
import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle, apiError, requireRole } from "@/lib/server/api";
import { getRecordedTotal } from "@/lib/server/queries";
import { businessDate } from "@/lib/format";

const Body = z.object({
  shopId: z.string().uuid().optional(),
  date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  tillTotal: z.number().nonnegative(),
});

export async function POST(req: NextRequest) {
  return handle(async () => {
    const session = await requireApiSession();
    requireRole(session, "supervisor", "area_manager", "admin");
    const body = Body.parse(await req.json());

    const shopId = session.role === "supervisor" ? session.shopId : body.shopId ?? session.shopId;
    if (!shopId) apiError("No shop selected", 400);
    const date = body.date ?? businessDate();

    const { error } = await db()
      .from("reconciliation")
      .upsert(
        {
          shop_id: shopId,
          business_date: date,
          till_total: body.tillTotal,
          entered_by: session.id,
        },
        { onConflict: "shop_id,business_date" }
      );
    if (error) throw error;

    const recorded = await getRecordedTotal(shopId, date);
    return { date, tillTotal: body.tillTotal, recorded, variance: recorded - body.tillTotal };
  });
}
