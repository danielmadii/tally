import { NextRequest, NextResponse } from "next/server";
import { requireApiSession } from "@/lib/server/session";
import { requireRole } from "@/lib/server/api";
import {
  getLeaderboard,
  getProductPerformance,
  getDeadStock,
  getExceptions,
} from "@/lib/server/queries";
import { monthStart, businessDate } from "@/lib/format";

function toCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return "";
  const headers = Object.keys(rows[0]);
  const escape = (v: unknown) => {
    const s = v === null || v === undefined ? "" : String(v);
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  return [
    headers.join(","),
    ...rows.map((r) => headers.map((h) => escape(r[h])).join(",")),
  ].join("\n");
}

/** CSV export of any report; the filename carries the date range (§8.3). */
export async function GET(_req: NextRequest, ctx: { params: Promise<{ report: string }> }) {
  const session = await requireApiSession().catch(() => null);
  if (!session) return NextResponse.json({ error: "Not authenticated" }, { status: 401 });
  try {
    requireRole(session, "supervisor", "area_manager", "admin");
  } catch {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  const { report } = await ctx.params;
  const range = `${monthStart()}_to_${businessDate()}`;
  // Shop managers export their own shop's data only.
  const scope = session.role === "supervisor" ? session.shopId : null;

  let rows: Record<string, unknown>[];
  switch (report) {
    case "leaderboard":
      rows = (await getLeaderboard(scope)).map((r) => ({
        rank: 0,
        name: r.name,
        shop: r.shopName,
        revenue: r.revenue,
        units: r.units,
        transactions: r.transactions,
        target: r.target ?? "",
        attainment_pct: r.attainmentPct ?? "",
      }));
      rows.forEach((r, i) => (r.rank = i + 1));
      break;
    case "products":
      rows = (await getProductPerformance(scope)).map((r) => ({
        sku: r.sku,
        product: r.name,
        brand: r.brand,
        category: r.category,
        units: r.units,
        revenue: r.revenue,
      }));
      break;
    case "dead-stock":
      rows = (await getDeadStock(60, scope)).map((r) => ({
        shop: r.shopName,
        sku: r.sku,
        product: r.name,
        brand: r.brand,
        qty_on_hand: r.qtyOnHand,
      }));
      break;
    case "exceptions":
      rows = (await getExceptions(scope)).map((r) => ({
        sale_no: r.saleNo,
        sold_at: r.soldAt,
        salesperson: r.salesperson,
        shop: r.shopName,
        total: r.total,
        discount: r.discount,
        status: r.status,
        void_reason: r.voidReason ?? "",
      }));
      break;
    default:
      return NextResponse.json({ error: "Unknown report" }, { status: 404 });
  }

  return new NextResponse(toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="tally-${report}-${range}.csv"`,
    },
  });
}
