import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronRight } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { db } from "@/lib/server/supabase";
import CatalogueScreen from "./CatalogueScreen";

export const dynamic = "force-dynamic";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ shop?: string }>;
}) {
  const session = await requireSession();
  // Only admins maintain the catalogue; everyone else gets the sales report.
  if (session.role !== "admin") redirect("/manager/products/performance");

  const { shop: shopParam } = await searchParams;
  const { data: shops, error } = await db()
    .from("shop")
    .select("id, code, name, city")
    .eq("is_active", true)
    .order("name");
  if (error) throw error;

  const shop = (shops ?? []).find((s) => s.id === shopParam) ?? null;

  // Products always belong to a shop — choose one before anything is listed.
  if (!shop) {
    return (
      <div>
        <h1 className="page-title">Products</h1>

        <div className="mt-5 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {(shops ?? []).map((s) => (
            <Link
              key={s.id}
              href={`/manager/products?shop=${s.id}`}
              className="card group flex items-center justify-between p-5 transition-shadow hover:shadow-md"
            >
              <div className="min-w-0">
                <p className="truncate text-2xl font-bold tracking-tight text-primary">{s.name}</p>
                <p className="mt-1 text-xs text-slate-500">
                  {s.city ?? "—"} · <span className="font-mono">{s.code}</span>
                </p>
              </div>
              <ChevronRight className="h-4 w-4 shrink-0 text-slate-300 transition-transform group-hover:translate-x-0.5" />
            </Link>
          ))}
          {(shops ?? []).length === 0 && (
            <p className="card p-8 text-center text-sm text-slate-400">
              No shops yet — create one first in Shops.
            </p>
          )}
        </div>
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-2xl font-bold tracking-tight text-primary">{shop.name}</h1>

      <div className="mt-4 flex gap-2 overflow-x-auto pb-1">
        {(shops ?? []).map((s) => (
          <Link
            key={s.id}
            href={`/manager/products?shop=${s.id}`}
            className={`whitespace-nowrap rounded-md px-4 py-2 text-sm font-medium ${
              s.id === shop.id
                ? "bg-primary text-white"
                : "border border-slate-200 bg-white text-slate-600"
            }`}
          >
            {s.name}
          </Link>
        ))}
      </div>

      <div className="mt-4">
        <CatalogueScreen shopId={shop.id} shopName={shop.name} />
      </div>
    </div>
  );
}
