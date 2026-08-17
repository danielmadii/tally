import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { ArrowLeft, TriangleAlert } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { getShopDetail } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";
import StockInPanel from "@/components/StockInPanel";
import ImportPanel from "../../admin/ImportPanel";
import EditShopButton from "@/components/EditShopButton";

export const dynamic = "force-dynamic";

export default async function ShopDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireSession();
  const { id } = await params;

  // Supervisors see their own shop only — scope enforced server-side.
  if (session.role === "supervisor" && session.shopId !== id) {
    redirect(`/manager/shops/${session.shopId}`);
  }

  const detail = await getShopDetail(id);
  if (!detail) notFound();
  const { shop, today, staff, stock } = detail;
  const lowCount = stock.filter((s) => s.low).length;

  return (
    <div>
      {session.role !== "supervisor" && (
        <Link
          href="/manager/shops"
          className="mb-3 inline-flex items-center gap-1.5 text-sm font-medium text-slate-500 hover:text-slate-700"
        >
          <ArrowLeft className="h-4 w-4" />
          All shops
        </Link>
      )}

      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="page-title">
            {shop.name}
            {!shop.is_active && <span className="badge badge-neutral ml-2 align-middle">closed</span>}
          </h1>
          <p className="page-desc">
            {shop.city ?? "—"} · <span className="font-mono">{shop.code}</span>
          </p>
        </div>
        {session.role === "admin" && (
          <EditShopButton
            shop={{
              id: shop.id,
              code: shop.code,
              name: shop.name,
              city: shop.city,
              address: shop.address,
            }}
          />
        )}
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue today" value={fmtMoney(today.revenue)} />
        <StatCard label="Transactions today" value={fmtInt(today.transactions)} />
        <StatCard label="Units today" value={fmtInt(today.units)} />
      </div>

      <section className="mt-8">
        <h2 className="section-label">Salespeople — this month</h2>
        <div className="card mt-2 overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                <th className="px-4 py-3">Salesperson</th>
                <th className="px-4 py-3 text-right">Today</th>
                <th className="px-4 py-3 text-right">Month</th>
                <th className="px-4 py-3 text-right">Units</th>
                <th className="px-4 py-3 text-right">Attainment</th>
              </tr>
            </thead>
            <tbody>
              {staff.map((s) => (
                <tr key={s.userId} className="border-b border-slate-100 last:border-0">
                  <td className="px-4 py-3 font-medium">{s.name}</td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(s.todayRevenue)}</td>
                  <td className="px-4 py-3 text-right font-semibold tabular-nums">
                    {fmtMoney(s.monthRevenue)}
                  </td>
                  <td className="px-4 py-3 text-right tabular-nums">{fmtInt(s.monthUnits)}</td>
                  <td className="px-4 py-3">
                    {s.attainmentPct !== null ? (
                      <div className="flex items-center justify-end gap-2">
                        <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                          <div
                            className={`h-full rounded-full ${
                              s.attainmentPct >= 100 ? "bg-green-600" : "bg-primary"
                            }`}
                            style={{ width: `${Math.min(s.attainmentPct, 100)}%` }}
                          />
                        </div>
                        <span className="w-12 text-right font-semibold tabular-nums">
                          {s.attainmentPct}%
                        </span>
                      </div>
                    ) : (
                      <span className="block text-right text-slate-400">no target</span>
                    )}
                  </td>
                </tr>
              ))}
              {staff.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                    No salespeople assigned to this shop.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mt-8">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="section-label">Products &amp; stock — this shop</h2>
          {lowCount > 0 && (
            <span className="badge badge-warn">
              <TriangleAlert className="h-3.5 w-3.5" />
              {lowCount} at or below reorder point
            </span>
          )}
        </div>

        {stock.length === 0 && (
          <div className="card mt-3 border-dashed p-8 text-center">
            <p className="text-base font-semibold text-slate-900">
              No products in this shop yet
            </p>
            <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
              Import your product list from an Excel file — brand, item code, description,
              barcode and price. Everything ends up in this shop automatically.
            </p>
            <div className="mt-4 flex flex-col items-center gap-2">
              {session.role === "admin" ? (
                <ImportPanel
                  lockedShopId={id}
                  lockedShopName={shop.name}
                  buttonLabel="Import products (Excel)"
                />
              ) : (
                <p className="text-sm text-slate-400">
                  Ask an administrator to import the product list.
                </p>
              )}
            </div>
          </div>
        )}

        {stock.length > 0 && session.role === "admin" && (
          <div className="mt-3">
            <ImportPanel
              lockedShopId={id}
              lockedShopName={shop.name}
              buttonLabel="Import products (Excel)"
            />
          </div>
        )}

        {stock.length > 0 && (
        <div className="card mt-3 overflow-x-auto">
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
                      className={`inline-block min-w-10 rounded-md px-2 py-1 text-center font-semibold tabular-nums ${
                        r.low ? "bg-amber-100 text-amber-800" : "bg-slate-100 text-slate-700"
                      }`}
                    >
                      {r.qtyOnHand}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        )}

        <StockInPanel shopId={id} />
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
