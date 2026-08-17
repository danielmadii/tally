import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import { db } from "@/lib/server/supabase";
import { getStock } from "@/lib/server/queries";
import { fmtMoney } from "@/lib/format";
import StockInPanel from "./StockInPanel";

export const dynamic = "force-dynamic";

export default async function StockPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const { shop: shopParam } = await searchParams;

  const { data: shops, error } = await db()
    .from("shop")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;

  const shopId = shopParam ?? shops?.[0]?.id;
  const stock = shopId ? await getStock(shopId) : [];
  const lowCount = stock.filter((s) => s.low).length;

  return (
    <div>
      <h1 className="page-title">Stock on hand</h1>

      <div className="mt-3 flex gap-2 overflow-x-auto pb-1">
        {(shops ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/manager/stock?shop=${s.id}`}
            className={`whitespace-nowrap rounded-lg px-4 py-2 text-sm font-medium ${
              s.id === shopId ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      {lowCount > 0 && (
        <p className="mt-3 flex items-center gap-2 rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <TriangleAlert className="h-4 w-4 shrink-0" />
          {lowCount} item{lowCount === 1 ? "" : "s"} at or below reorder point
        </p>
      )}

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Item</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3 text-right">On hand</th>
            </tr>
          </thead>
          <tbody>
            {stock.map((r) => (
              <tr key={r.variantId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="text-xs text-slate-500">{r.brand}</p>
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.sku}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.price)}</td>
                <td className="px-4 py-3 text-right">
                  <span
                    className={`inline-block min-w-10 rounded-lg px-2 py-1 text-center font-semibold tabular-nums ${
                      r.low ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {r.qtyOnHand}
                  </span>
                </td>
              </tr>
            ))}
            {stock.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  No stock records for this shop yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {shopId && <StockInPanel shopId={shopId} />}
    </div>
  );
}
