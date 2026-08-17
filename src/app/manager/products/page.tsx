import Link from "next/link";
import { Download } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/server/supabase";
import { getProductPerformance, getDeadStock } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";
import ProductsTabs from "./ProductsTabs";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const session = await requireSession();
  const { shop: shopParam } = await searchParams;

  const { data: shops, error } = await db()
    .from("shop")
    .select("id, name")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;

  // Supervisors are scoped to their own shop; managers pick a shop or all.
  const shopId = session.role === "supervisor" ? session.shopId : shopParam || null;
  const shopName = shopId ? shops?.find((s) => s.id === shopId)?.name ?? null : null;

  const [performance, deadStock] = await Promise.all([
    getProductPerformance(shopId),
    getDeadStock(60, shopId),
  ]);

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="page-title">Products</h1>
          <p className="page-desc">
            {shopName ? `How ${shopName} is selling this month` : "How the chain is selling this month"}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a navigation */}
        <a href="/api/export/products" className="btn btn-secondary">
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      <ProductsTabs adminOnly={session.role === "admin"} />

      {session.role !== "supervisor" && (
        <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
          <Link
            href="/manager/products"
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
              !shopId ? "bg-primary text-white" : "bg-white text-slate-600 border border-slate-200"
            }`}
          >
            All shops
          </Link>
          {(shops ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/manager/products?shop=${s.id}`}
              className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
                s.id === shopId
                  ? "bg-primary text-white"
                  : "bg-white text-slate-600 border border-slate-200"
              }`}
            >
              {s.name}
            </Link>
          ))}
        </div>
      )}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Category</th>
              <th className="px-4 py-3 text-right">Units sold</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              {shopId && <th className="px-4 py-3 text-right">On hand</th>}
            </tr>
          </thead>
          <tbody>
            {performance.map((r, i) => (
              <tr key={r.variantId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-400">{i + 1}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="font-mono text-xs text-slate-400">{r.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.brand}</td>
                <td className="px-4 py-3 text-slate-500">{r.category}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtInt(r.units)}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtMoney(r.revenue)}</td>
                {shopId && (
                  <td className="px-4 py-3 text-right">
                    <span
                      className={`inline-block min-w-10 rounded-md px-2 py-1 text-center font-semibold tabular-nums ${
                        (r.qtyOnHand ?? 0) <= 3
                          ? "bg-amber-100 text-amber-800"
                          : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.qtyOnHand ?? 0}
                    </span>
                  </td>
                )}
              </tr>
            ))}
            {performance.length === 0 && (
              <tr>
                <td colSpan={shopId ? 7 : 6} className="px-4 py-10 text-center text-slate-400">
                  No sales this month{shopName ? ` in ${shopName}` : ""} yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      <div className="mt-10 flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold">Dead stock</h2>
          <p className="text-sm text-slate-500">
            Stock on hand with no sale in 60 days{shopName ? ` — ${shopName}` : ""}
          </p>
        </div>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a navigation */}
        <a href="/api/export/dead-stock" className="btn btn-secondary">
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>

      <div className="card mt-3 overflow-x-auto">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3 text-right">On hand</th>
            </tr>
          </thead>
          <tbody>
            {deadStock.map((r, i) => (
              <tr key={i} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 text-slate-500">{r.shopName}</td>
                <td className="px-4 py-3">
                  <p className="font-medium">{r.name}</p>
                  <p className="font-mono text-xs text-slate-400">{r.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{r.brand}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">{fmtInt(r.qtyOnHand)}</td>
              </tr>
            ))}
            {deadStock.length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nothing gathering dust.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
