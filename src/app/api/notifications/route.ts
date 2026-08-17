import { db } from "@/lib/server/supabase";
import { requireApiSession } from "@/lib/server/session";
import { handle } from "@/lib/server/api";

/** Bell counters: pending void approvals and low-stock items, role-scoped. */
export async function GET() {
  return handle(async () => {
    const session = await requireApiSession();
    const shopScope = session.role === "supervisor" ? session.shopId : null;

    let voidQuery = db()
      .from("sale")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed")
      .not("void_requested_at", "is", null);
    if (shopScope) voidQuery = voidQuery.eq("shop_id", shopScope);

    const [voidRes, lowRes] = await Promise.all([voidQuery, db().rpc("low_stock_counts")]);
    if (voidRes.error) throw voidRes.error;
    if (lowRes.error) throw lowRes.error;

    /* eslint-disable @typescript-eslint/no-explicit-any */
    const lowStock = ((lowRes.data ?? []) as any[])
      .filter((r) => !shopScope || r.shop_id === shopScope)
      .reduce((s, r) => s + Number(r.low_count), 0);

    return { voidRequests: voidRes.count ?? 0, lowStock };
  });
}
