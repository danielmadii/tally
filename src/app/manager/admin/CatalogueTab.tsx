"use client";

import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fmtMoney } from "@/lib/format";
import ImportPanel from "./ImportPanel";
import BarcodeView from "@/components/BarcodeView";

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

export default function CatalogueTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [filter, setFilter] = useState("");
  const [showAdd, setShowAdd] = useState(false);
  const [busy, setBusy] = useState(false);
  const [product, setProduct] = useState({ productName: "", brandName: "", categoryName: "" });
  const [variants, setVariants] = useState<NewVariant[]>([emptyVariant()]);
  const [priceEdits, setPriceEdits] = useState<Record<string, string>>({});
  const [viewingBarcode, setViewingBarcode] = useState<{ value: string; name: string } | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-catalogue"],
    queryFn: async () => {
      const res = await fetch("/api/admin/catalogue");
      if (!res.ok) throw new Error("Failed to load catalogue");
      return res.json() as Promise<{
        brands: { id: string; name: string }[];
        variants: VariantRow[];
      }>;
    },
  });

  const rows = useMemo(() => {
    const all = data?.variants ?? [];
    const q = filter.trim().toLowerCase();
    if (!q) return all;
    return all.filter((v) =>
      [v.name, v.brand, v.category, v.sku, ...v.barcodes].join(" ").toLowerCase().includes(q)
    );
  }, [data, filter]);

  async function patchVariant(id: string, patch: Record<string, unknown>, okMsg: string) {
    setMessage(null);
    const res = await fetch(`/api/admin/variants/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const resData = await res.json();
    setMessage(res.ok ? okMsg : resData.error ?? "Failed");
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-catalogue"] });
  }

  function savePrice(v: VariantRow) {
    const raw = priceEdits[v.id];
    if (raw === undefined) return;
    const price = Number(raw);
    if (!Number.isFinite(price) || price <= 0) {
      setMessage("Price must be a positive number");
      return;
    }
    if (price === v.price) return;
    patchVariant(v.id, { price }, `${v.sku} price updated — old price kept in history.`);
    setPriceEdits((prev) => {
      const next = { ...prev };
      delete next[v.id];
      return next;
    });
  }

  function addBarcode(v: VariantRow) {
    const barcode = window.prompt(`New barcode for ${v.sku}:`);
    if (!barcode?.trim()) return;
    patchVariant(v.id, { addBarcode: barcode.trim() }, `Barcode added to ${v.sku}.`);
  }

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
        body: JSON.stringify(payload),
      });
      const resData = await res.json();
      setMessage(res.ok ? `${product.productName} created with ${payload.variants.length} variant(s).` : resData.error ?? "Failed");
      if (res.ok) {
        setProduct({ productName: "", brandName: "", categoryName: "" });
        setVariants([emptyVariant()]);
        setShowAdd(false);
        queryClient.invalidateQueries({ queryKey: ["admin-catalogue"] });
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
          onChange={(e) => setFilter(e.target.value)}
          placeholder="Filter by name, brand, SKU, barcode…"
          className="min-w-56 flex-1 rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          onClick={() => setShowAdd((v) => !v)}
          className="btn press bg-slate-900 text-white hover:bg-slate-800"
        >
          {showAdd ? "Cancel" : "+ Add product"}
        </button>
        <ImportPanel />
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

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[760px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Variant</th>
              <th className="px-4 py-3">Brand</th>
              <th className="px-4 py-3">Barcodes</th>
              <th className="px-4 py-3 text-right">Cost</th>
              <th className="px-4 py-3 text-right">Price</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {rows.map((v) => (
              <tr key={v.id} className={`border-b border-slate-100 last:border-0 ${v.isActive ? "" : "opacity-50"}`}>
                <td className="px-4 py-3">
                  <p className="font-medium">{v.name}</p>
                  <p className="font-mono text-xs text-slate-400">{v.sku}</p>
                </td>
                <td className="px-4 py-3 text-slate-500">{v.brand}</td>
                <td className="px-4 py-3 font-mono text-xs">
                  {v.barcodes.length
                    ? v.barcodes.map((code) => (
                        <button
                          key={code}
                          onClick={() => setViewingBarcode({ value: code, name: v.name })}
                          title="Show scannable barcode"
                          className="mr-1.5 rounded bg-slate-100 px-1.5 py-0.5 text-slate-600 hover:bg-slate-200 hover:text-slate-900"
                        >
                          {code}
                        </button>
                      ))
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right tabular-nums text-slate-500">
                  {v.costPrice !== null ? fmtMoney(v.costPrice) : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <input
                    inputMode="decimal"
                    value={priceEdits[v.id] ?? String(v.price)}
                    onChange={(e) => setPriceEdits((p) => ({ ...p, [v.id]: e.target.value }))}
                    onBlur={() => savePrice(v)}
                    onKeyDown={(e) => e.key === "Enter" && (e.target as HTMLInputElement).blur()}
                    className="w-24 rounded-lg border border-slate-200 px-2 py-1.5 text-right text-sm tabular-nums outline-none focus:border-primary"
                  />
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 text-xs font-medium">
                    <button onClick={() => addBarcode(v)} className="text-primary">
                      + Barcode
                    </button>
                    <button
                      onClick={() =>
                        patchVariant(
                          v.id,
                          { isActive: !v.isActive },
                          v.isActive ? `${v.sku} deactivated` : `${v.sku} reactivated`
                        )
                      }
                      className={v.isActive ? "text-red-600" : "text-green-700"}
                    >
                      {v.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

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
