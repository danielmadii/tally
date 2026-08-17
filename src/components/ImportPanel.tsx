"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { FileSpreadsheet, Upload, X } from "lucide-react";

interface ParsedRow {
  brand: string;
  sku: string;
  name: string;
  barcode: string | null;
  price: number | null;
  costPrice: number | null;
  category: string | null;
  qty: number | null;
}

interface Preview {
  fileName: string;
  rows: ParsedRow[];
  skippedNoSku: number;
  brands: string[];
  priced: number;
}

/** Case/space-insensitive header matching so supplier files import as-is. */
function mapHeaders(headers: string[]) {
  const norm = headers.map((h) => String(h ?? "").trim().toLowerCase());
  const find = (...candidates: (string | RegExp)[]) =>
    norm.findIndex((h) =>
      candidates.some((c) => (typeof c === "string" ? h === c : c.test(h)))
    );
  return {
    brand: find("brand", "brand name"),
    sku: find("item code", "sku", "code", "item no", "item number"),
    name: find("item description", "description", "name", "product", "product name", "item name"),
    barcode: find("item barcode", "barcode", "ean", "ean13", "upc"),
    price: find(/^(retail |selling |unit )?price$/),
    cost: find(/cost/),
    category: find("category", "item category"),
    qty: find("qty", "quantity", "stock", "on hand", "opening stock", "stock qty"),
  };
}

export default function ImportPanel({
  lockedShopId,
  lockedShopName,
  buttonLabel = "Import Excel",
}: {
  /** When set (e.g. on a shop page), items import into this shop — no picker. */
  lockedShopId?: string;
  lockedShopName?: string;
  buttonLabel?: string;
}) {
  const queryClient = useQueryClient();
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [shopId, setShopId] = useState(lockedShopId ?? "");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data: shopsData } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      return res.json() as Promise<{ shops: { id: string; name: string; is_active: boolean }[] }>;
    },
  });
  const shops = (shopsData?.shops ?? []).filter((s) => s.is_active);

  async function parseFile(file: File) {
    setMessage(null);
    setPreview(null);
    try {
      const XLSX = await import("xlsx");
      const wb = XLSX.read(await file.arrayBuffer());
      const ws = wb.Sheets[wb.SheetNames[0]];
      /* eslint-disable @typescript-eslint/no-explicit-any */
      const grid: any[][] = XLSX.utils.sheet_to_json(ws, { header: 1, defval: null });
      if (grid.length < 2) {
        setMessage("The file has no data rows.");
        return;
      }
      const cols = mapHeaders(grid[0] as string[]);
      if (cols.sku < 0 || cols.name < 0) {
        setMessage(
          "Could not find the item code / description columns. Expected headers like “Item Code” and “Item Description”."
        );
        return;
      }

      let skippedNoSku = 0;
      const rows: ParsedRow[] = [];
      for (const r of grid.slice(1)) {
        const sku = r[cols.sku] != null ? String(r[cols.sku]).trim() : "";
        const name = r[cols.name] != null ? String(r[cols.name]).trim() : "";
        if (!sku || !name) {
          skippedNoSku++;
          continue;
        }
        const num = (i: number) => {
          if (i < 0 || r[i] == null || r[i] === "") return null;
          const v = Number(r[i]);
          return Number.isFinite(v) && v > 0 ? v : null;
        };
        const str = (i: number) => (i >= 0 && r[i] != null && r[i] !== "" ? String(r[i]).trim() : null);
        const qtyRaw = cols.qty >= 0 && r[cols.qty] != null ? Number(r[cols.qty]) : null;
        rows.push({
          sku,
          name,
          brand: str(cols.brand) ?? "Unknown brand",
          barcode: str(cols.barcode),
          price: num(cols.price),
          costPrice: num(cols.cost),
          category: str(cols.category),
          qty: qtyRaw !== null && Number.isFinite(qtyRaw) && qtyRaw >= 0 ? Math.round(qtyRaw) : null,
        });
      }

      setPreview({
        fileName: file.name,
        rows,
        skippedNoSku,
        brands: [...new Set(rows.map((r) => r.brand))],
        priced: rows.filter((r) => r.price !== null).length,
      });
    } catch (err) {
      console.error(err);
      setMessage("Could not read that file — is it a valid .xlsx or .csv?");
    }
  }

  async function runImport() {
    if (!preview || busy) return;
    if (!shopId) {
      setMessage("Choose which shop these products belong to first.");
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/catalogue/import", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          rows: preview.rows,
          defaultCategory: "Imported",
          shopId,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setMessage(data.error ?? "Import failed");
        return;
      }
      const parts = [
        `${data.created} items imported`,
        data.unpriced ? `${data.unpriced} without a price (imported inactive — set prices to sell them)` : null,
        data.skippedExisting ? `${data.skippedExisting} already existed (skipped)` : null,
        data.duplicateBarcodesDropped ? `${data.duplicateBarcodesDropped} duplicate barcodes dropped` : null,
        data.inFileDuplicateSkus ? `${data.inFileDuplicateSkus} duplicate rows in file (skipped)` : null,
      ].filter(Boolean);
      setMessage(`Done: ${parts.join(" · ")}.`);
      setPreview(null);
      queryClient.invalidateQueries({ queryKey: ["admin-catalogue"] });
      queryClient.invalidateQueries({ queryKey: ["catalogue"] });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <input
        ref={fileRef}
        type="file"
        accept=".xlsx,.xls,.csv"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) parseFile(f);
          e.target.value = "";
        }}
      />
      <button onClick={() => fileRef.current?.click()} className="btn btn-secondary">
        <FileSpreadsheet className="h-4 w-4" />
        {buttonLabel}
      </button>

      {message && (
        <p className="mt-3 w-full rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">
          {message}
        </p>
      )}

      {preview && (
        <div className="card mt-3 w-full p-5">
          <div className="flex items-start justify-between">
            <div>
              <p className="text-sm font-semibold text-slate-900">{preview.fileName}</p>
              <p className="mt-1 text-sm text-slate-500">
                {preview.rows.length.toLocaleString()} items ready ·{" "}
                {preview.priced.toLocaleString()} with a price ·{" "}
                {(preview.rows.length - preview.priced).toLocaleString()} without (will import
                inactive)
                {preview.skippedNoSku > 0 &&
                  ` · ${preview.skippedNoSku} rows skipped (no code/description)`}
              </p>
              <p className="mt-1 text-xs text-slate-400">
                Brands: {preview.brands.slice(0, 6).join(", ")}
                {preview.brands.length > 6 && ` +${preview.brands.length - 6} more`}
              </p>
            </div>
            <button
              onClick={() => setPreview(null)}
              aria-label="Cancel import"
              className="p-1 text-slate-400 hover:text-slate-600"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="mt-3 overflow-x-auto rounded-md border border-slate-100">
            <table className="w-full min-w-[560px] text-xs">
              <thead>
                <tr className="bg-slate-50 text-start text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                  <th className="px-3 py-2">Code</th>
                  <th className="px-3 py-2">Description</th>
                  <th className="px-3 py-2">Brand</th>
                  <th className="px-3 py-2">Barcode</th>
                  <th className="px-3 py-2 text-end">Price</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.slice(0, 5).map((r) => (
                  <tr key={r.sku} className="border-t border-slate-100">
                    <td className="px-3 py-2 font-mono">{r.sku}</td>
                    <td className="px-3 py-2">{r.name}</td>
                    <td className="px-3 py-2 text-slate-500">{r.brand}</td>
                    <td className="px-3 py-2 font-mono text-slate-500">{r.barcode ?? "—"}</td>
                    <td className="px-3 py-2 text-end tabular-nums">
                      {r.price?.toLocaleString() ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p className="mt-1 text-[11px] text-slate-400">
            Showing the first 5 of {preview.rows.length.toLocaleString()} rows.
          </p>

          <div className="mt-4 flex flex-wrap items-center gap-3">
            {lockedShopId ? (
              <span className="text-sm text-slate-600">
                Importing into <span className="font-semibold text-slate-900">{lockedShopName}</span>
              </span>
            ) : (
              <label className="flex items-center gap-2 text-sm text-slate-600">
                Which shop?
                <select
                  value={shopId}
                  onChange={(e) => setShopId(e.target.value)}
                  className="input w-auto py-2"
                >
                  <option value="" disabled>
                    Choose a shop…
                  </option>
                  {shops.map((s) => (
                    <option key={s.id} value={s.id}>
                      {s.name}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <button
              onClick={runImport}
              disabled={busy || !shopId}
              className="btn btn-primary"
            >
              <Upload className="h-4 w-4" />
              {busy ? "Importing…" : `Import ${preview.rows.length.toLocaleString()} items`}
            </button>
          </div>
          <p className="mt-2 text-xs text-slate-400">
            Items will appear in the shop’s stock. If the file has a quantity column it becomes
            opening stock; otherwise items start at 0 on hand until you receive goods.
          </p>
        </div>
      )}
    </>
  );
}
