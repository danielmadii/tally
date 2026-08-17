"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fmtMoney } from "@/lib/format";
import ImportPanel from "@/components/ImportPanel";
import BarcodeView from "@/components/BarcodeView";
import InlineBarcode from "@/components/InlineBarcode";
import EditProductButton from "@/components/EditProductButton";

interface VariantRow {
  id: string;
  sku: string;
  name: string;
  brand: string;
  category: string;
  price: number;
  costPrice: number | null;
  reorderPoint: number;
  isActive: boolean;
  barcodes: string[];
  qtyOnHand: number | null;
}

interface NewVariant {
  sku: string;
  shadeName: string;
  shadeCode: string;
  sizeLabel: string;
  price: string;
  costPrice: string;
  barcode: string;
}

const emptyVariant = (): NewVariant => ({
  sku: "",
  shadeName: "",
  shadeCode: "",
  sizeLabel: "",
  price: "",
  costPrice: "",
  barcode: "",
});

export default function CatalogueScreen({
  shopId,
  shopName,
}: {
  shopId: string;
  shopName: string;
}) {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState({ productName: "", brandName: "", categoryName: "" });
  const [variants, setVariants] = useState<NewVariant[]>([emptyVariant()]);
  const [viewingBarcode, setViewingBarcode] = useState<{ value: string; name: string } | null>(null);
  const [page, setPage] = useState(0);
  const [pageSize, setPageSize] = useState(40);
  const [brandFilter, setBrandFilter] = useState("");
  const [stockFilter, setStockFilter] = useState<"all" | "in" | "out">("all");
  const [sort, setSort] = useState<"sku" | "price-desc" | "price-asc" | "stock-desc" | "stock-asc">(
    "sku"
  );

  const { data, isLoading } = useQuery({
    queryKey: ["admin-catalogue", shopId],
    queryFn: async () => {
      const res = await fetch(`/api/admin/catalogue?shop=${shopId}`);
      if (!res.ok) throw new Error("Failed to load catalogue");
      return res.json() as Promise<{
        brands: { id: string; name: string }[];
        variants: VariantRow[];
      }>;
    },
  });

  // Brands actually carried by this shop — no empty options.
  const shopBrands = useMemo(
    () => [...new Set((data?.variants ?? []).map((v) => v.brand).filter(Boolean))].sort(),
    [data]
  );

  const rows = useMemo(() => {
    let list = data?.variants ?? [];
    const q = filter.trim().toLowerCase();
    if (q) {
      list = list.filter((v) =>
        [v.name, v.brand, v.category, v.sku, ...v.barcodes].join(" ").toLowerCase().includes(q)
      );
    }
    if (brandFilter) list = list.filter((v) => v.brand === brandFilter);
    if (stockFilter !== "all") {
      list = list.filter((v) =>
        stockFilter === "in" ? (v.qtyOnHand ?? 0) > 0 : (v.qtyOnHand ?? 0) === 0
      );
    }

    const sorted = [...list];
    switch (sort) {
      case "price-desc":
        sorted.sort((a, b) => b.price - a.price);
        break;
      case "price-asc":
        sorted.sort((a, b) => a.price - b.price);
        break;
      case "stock-desc":
        sorted.sort((a, b) => (b.qtyOnHand ?? 0) - (a.qtyOnHand ?? 0));
        break;
      case "stock-asc":
        sorted.sort((a, b) => (a.qtyOnHand ?? 0) - (b.qtyOnHand ?? 0));
        break;
      default:
        sorted.sort((a, b) => a.sku.localeCompare(b.sku));
    }
    return sorted;
  }, [data, filter, brandFilter, stockFilter, sort]);

  const pageCount = Math.max(1, Math.ceil(rows.length / pageSize));
  const pageRows = rows.slice(page * pageSize, page * pageSize + pageSize);

  async function createProduct(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const payload = {
        ...product,
        variants: variants
          .filter((v) => v.sku.trim())
          .map((v) => ({
            sku: v.sku,
            shadeName: v.shadeName || undefined,
            shadeCode: v.shadeCode || undefined,
            sizeLabel: v.sizeLabel || undefined,
            price: Number(v.price),
            costPrice: v.costPrice ? Number(v.costPrice) : undefined,
            barcode: v.barcode || undefined,
          })),
      };
      if (!payload.variants.length || payload.variants.some((v) => !Number.isFinite(v.price) || v.price <= 0)) {
        setMessage("Every variant needs a SKU and a positive price");
        return;
      }
      const res = await fetch("/api/admin/catalogue", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, shopId }),
      });
      const resData = await res.json();
      setMessage(res.ok ? `${product.productName} created with ${payload.variants.length} variant(s).` : resData.error ?? "Failed");
      if (res.ok) {
        setProduct({ productName: "", brandName: "", categoryName: "" });
        setVariants([emptyVariant()]);
        setShowAdd(false);
        queryClient.invalidateQueries({ queryKey: ["admin-catalogue", shopId] });
      }
    } finally {
      setBusy(false);
    }
  }

  return (
    <div>
      {message && (
        <p className="mb-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <div className="flex flex-wrap items-center gap-3">
        <input
          value={filter}
          onChange={(e) => {
            setFilter(e.target.value);
            setPage(0);
          }}
          placeholder="Filter by name, brand, SKU, barcode…"
          className="min-w-56 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="btn press bg-slate-900 text-white hover:bg-slate-800"
        >
          {showAdd ? "Cancel" : "+ Add product"}
        </button>
        <ImportPanel lockedShopId={shopId} lockedShopName={shopName} />
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-slate-500">
          Brand
          <select
            value={brandFilter}
            onChange={(e) => {
              setBrandFilter(e.target.value);
              setPage(0);
            }}
            className="input w-auto py-1.5"
          >
            <option value="">All brands</option>
            {shopBrands.map((b) => (
              <option key={b} value={b}>
                {b}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-500">
          Stock
          <select
            value={stockFilter}
            onChange={(e) => {
              setStockFilter(e.target.value as "all" | "in" | "out");
              setPage(0);
            }}
            className="input w-auto py-1.5"
          >
            <option value="all">All items</option>
            <option value="in">In stock</option>
            <option value="out">Out of stock</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-500">
          Sort
          <select
            value={sort}
            onChange={(e) => {
              setSort(e.target.value as typeof sort);
              setPage(0);
            }}
            className="input w-auto py-1.5"
          >
            <option value="sku">Item code</option>
            <option value="price-desc">Price — high to low</option>
            <option value="price-asc">Price — low to high</option>
            <option value="stock-desc">Stock — most first</option>
            <option value="stock-asc">Stock — least first</option>
          </select>
        </label>

        <label className="flex items-center gap-2 text-sm text-slate-500">
          Show
          <select
            value={pageSize}
            onChange={(e) => {
              setPageSize(Number(e.target.value));
              setPage(0);
            }}
            className="input w-auto py-1.5"
          >
            {[20, 40, 100, 200].map((n) => (
              <option key={n} value={n}>
                {n} per page
              </option>
            ))}
          </select>
        </label>

        <span className="ms-auto text-sm text-slate-400">
          {rows.length.toLocaleString()} item{rows.length === 1 ? "" : "s"}
        </span>
      </div>

      {showAdd && (
        <form onSubmit={createProduct} className="mt-3 card p-4">
          <div className="grid gap-3 sm:grid-cols-3">
            <input
              required
              placeholder="Product name"
              value={product.productName}
              onChange={(e) => setProduct({ ...product, productName: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <input
              required
              list="brand-list"
              placeholder="Brand (new or existing)"
              value={product.brandName}
              onChange={(e) => setProduct({ ...product, brandName: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
            />
            <datalist id="brand-list">
              {(data?.brands ?? []).map((b) => (
                <option key={b.id} value={b.name} />
              ))}
            </datalist>
            <input
              required
              placeholder="Category"
              value={product.categoryName}
              onChange={(e) => setProduct({ ...product, categoryName: e.target.value })}
              className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
            />
          </div>

          <p className="mt-4 text-xs font-semibold uppercase tracking-wide text-slate-400">
            Variants (shades / sizes) — each is what actually sells
          </p>
          {variants.map((v, i) => (
            <div key={i} className="mt-2 grid grid-cols-2 gap-2 rounded-xl bg-slate-50 p-3 sm:grid-cols-7">
              <input
                placeholder="SKU *"
                value={v.sku}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, sku: e.target.value.toUpperCase() } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs uppercase outline-none focus:border-primary"
              />
              <input
                placeholder="Shade name"
                value={v.shadeName}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, shadeName: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="Shade #"
                value={v.shadeCode}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, shadeCode: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="Size"
                value={v.sizeLabel}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, sizeLabel: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="Price *"
                inputMode="decimal"
                value={v.price}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, price: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="Cost"
                inputMode="decimal"
                value={v.costPrice}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, costPrice: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
              <input
                placeholder="Barcode"
                value={v.barcode}
                onChange={(e) => setVariants((p) => p.map((x, j) => (j === i ? { ...x, barcode: e.target.value } : x)))}
                className="rounded-lg border border-slate-300 px-3 py-2 text-xs outline-none focus:border-primary"
              />
            </div>
          ))}
          <div className="mt-3 flex gap-3">
            <button
              type="button"
              onClick={() => setVariants((p) => [...p, emptyVariant()])}
              className="rounded-lg bg-slate-100 px-4 py-2 text-sm font-medium"
            >
              + Another variant
            </button>
            <button
              type="submit"
              disabled={busy}
              className="press rounded-lg bg-primary px-5 py-2 text-sm font-semibold text-white disabled:opacity-60"
            >
              {busy ? "Creating…" : "Create product"}
            </button>
          </div>
        </form>
      )}

      {!isLoading && rows.length === 0 && !filter.trim() && (
        <div className="card mt-4 border-dashed p-8 text-center">
          <p className="text-base font-semibold text-slate-900">
            No products in {shopName} yet
          </p>
          <p className="mx-auto mt-1 max-w-md text-sm text-slate-500">
            Import a supplier list with “Import Excel”, or add products one at a time.
          </p>
        </div>
      )}

      {(rows.length > 0 || filter.trim()) && (
      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[820px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Barcode</th>
              <th className="px-4 py-3 text-end">In stock</th>
              <th className="px-4 py-3 text-end">Cost</th>
              <th className="px-4 py-3 text-end">Price</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {pageRows.map((v) => (
              <tr
                key={v.id}
                className={`border-b border-slate-100 last:border-0 ${v.isActive ? "" : "opacity-50"}`}
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{v.name}</p>
                  <p className="font-mono text-xs text-slate-400">{v.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{v.brand}</td>
                <td className="px-4 py-2">
                  {v.barcodes.length ? (
                    <InlineBarcode
                      value={v.barcodes[0]}
                      onClick={() => setViewingBarcode({ value: v.barcodes[0], name: v.name })}
                    />
                  ) : (
                    <span className="text-xs text-slate-400">No barcode</span>
                  )}
                  {v.barcodes.length > 1 && (
                    <span className="text-[11px] text-slate-400">
                      +{v.barcodes.length - 1} more
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-end">
                  <span
                    className={`inline-block min-w-10 rounded-md px-2 py-1 text-center text-xs font-semibold tabular-nums ${
                      (v.qtyOnHand ?? 0) <= v.reorderPoint
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-700"
                    }`}
                  >
                    {v.qtyOnHand ?? 0}
                  </span>
                </td>
                <td className="px-4 py-3 text-end tabular-nums text-slate-500">
                  {v.costPrice !== null ? fmtMoney(v.costPrice) : "—"}
                </td>
                <td className="px-4 py-3 text-end font-semibold tabular-nums">
                  {v.price > 0 ? fmtMoney(v.price) : <span className="text-slate-400">no price</span>}
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end">
                    <EditProductButton shopId={shopId} variant={v} />
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      )}

      {rows.length > pageSize && (
        <div className="mt-3 flex items-center justify-between text-sm text-slate-500">
          <span>
            Showing {(page * pageSize + 1).toLocaleString()}–
            {Math.min((page + 1) * pageSize, rows.length).toLocaleString()} of{" "}
            {rows.length.toLocaleString()}
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              disabled={page === 0}
              className="btn btn-secondary h-8"
            >
              Previous
            </button>
            <button
              onClick={() => setPage((p) => Math.min(pageCount - 1, p + 1))}
              disabled={page >= pageCount - 1}
              className="btn btn-secondary h-8"
            >
              Next
            </button>
          </div>
        </div>
      )}

      {viewingBarcode && (
        <BarcodeView
          value={viewingBarcode.value}
          name={viewingBarcode.name}
          onClose={() => setViewingBarcode(null)}
        />
      )}
    </div>
  );
}
