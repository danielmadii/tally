import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight, TriangleAlert, Users } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { getShopsOverview, getActiveShop } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";
import AddShopButton from "@/components/AddShopButton";
import EditShopButton from "@/components/EditShopButton";

export const dynamic = "force-dynamic";

export default async function ShopsPage() {
  const session = await requireSession();
  const activeShop = await getActiveShop(session.id);
  // A supervisor has exactly one shop — take them straight into it.
  if (session.role === "supervisor" && activeShop) {
    redirect(`/manager/shops/${activeShop.id}`);
  }

  const shops = await getShopsOverview();
  const isAdmin = session.role === "admin";

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Shops</h1>
        {isAdmin && <AddShopButton />}
      </div>

      <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shops.map((shop) => (
          <div
            key={shop.id}
            className={`card group relative p-5 transition-shadow hover:shadow-md ${
              shop.isActive ? "" : "opacity-60"
            }`}
          >
            {/* Whole card opens the shop; the Edit action sits above it. */}
            <Link
              href={`/manager/shops/${shop.id}`}
              aria-label={`Open ${shop.name}`}
              className="absolute inset-0 rounded-lg"
            />

            <div className="pointer-events-none relative">
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate text-2xl font-bold tracking-tight text-primary">
                    {shop.name}
                    {!shop.isActive && <span className="badge badge-neutral ml-2">closed</span>}
                  </p>
                  <p className="mt-1 text-xs text-slate-500">
                    {shop.city ?? "—"} · <span className="font-mono">{shop.code}</span>
                  </p>
                </div>
                <ChevronRight className="mt-1.5 h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
              </div>

              <p className="mt-4 text-xl font-semibold tabular-nums tracking-tight text-slate-900">
                {fmtMoney(shop.revenueToday)}
              </p>
              <p className="text-xs text-slate-500">
                today · {fmtInt(shop.transactionsToday)} sales · {fmtInt(shop.unitsToday)} units
              </p>
            </div>

            <div className="relative mt-4 flex items-center justify-between gap-3 border-t border-slate-100 pt-3 text-xs text-slate-500">
              <div className="pointer-events-none flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <Users className="h-3.5 w-3.5" />
                  {fmtInt(shop.staffCount)} staff
                </span>
                {shop.lowStockCount > 0 ? (
                  <span className="flex items-center gap-1.5 text-amber-700">
                    <TriangleAlert className="h-3.5 w-3.5" />
                    {fmtInt(shop.lowStockCount)} low stock
                  </span>
                ) : (
                  <span>Stock healthy</span>
                )}
              </div>
              {isAdmin && (
                <EditShopButton
                  style="link"
                  shop={{
                    id: shop.id,
                    code: shop.code,
                    name: shop.name,
                    city: shop.city,
                    address: shop.address,
                    isActive: shop.isActive,
                  }}
                />
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
