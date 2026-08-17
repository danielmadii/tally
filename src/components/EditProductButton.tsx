"use client";

import { useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";
import Modal from "@/components/Modal";

export interface EditableVariant {
  id: string;
  sku: string;
  name: string;
  brand: string;
  price: number;
  costPrice: number | null;
  reorderPoint: number;
  isActive: boolean;
  barcodes: string[];
}

/** Edit one product: price, cost, reorder point, barcodes, status. */
export default function EditProductButton({
  variant,
  shopId,
}: {
  variant: EditableVariant;
  shopId: string;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    price: String(variant.price),
    costPrice: variant.costPrice !== null ? String(variant.costPrice) : "",
    reorderPoint: String(variant.reorderPoint),
    addBarcode: "",
  });

  function openDialog() {
    setForm({
      price: String(variant.price),
      costPrice: variant.costPrice !== null ? String(variant.costPrice) : "",
      reorderPoint: String(variant.reorderPoint),
      addBarcode: "",
    });
    setError(null);
    setOpen(true);
  }

  function refresh() {
    queryClient.invalidateQueries({ queryKey: ["admin-catalogue", shopId] });
    queryClient.invalidateQueries({ queryKey: ["catalogue"] });
  }

  async function send(method: "PATCH" | "DELETE", body?: Record<string, unknown>) {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/variants/${variant.id}`, {
        method,
        ...(body
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return false;
      }
      refresh();
      return true;
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    const price = Number(form.price);
    if (!Number.isFinite(price) || price <= 0) {
      setError("Price must be a positive number.");
      return;
    }
    const patch: Record<string, unknown> = {
      price,
      reorderPoint: Math.max(0, parseInt(form.reorderPoint || "0", 10)),
      costPrice: form.costPrice.trim() ? Number(form.costPrice) : null,
    };
    if (form.addBarcode.trim()) patch.addBarcode = form.addBarcode.trim();
    if (await send("PATCH", patch)) setOpen(false);
  }

  return (
    <>
      <button
        onClick={openDialog}
        aria-label={`Edit ${variant.sku}`}
        title="Edit product"
        className="rounded-md p-1.5 text-slate-400 hover:bg-slate-100 hover:text-primary"
      >
        <Pencil className="h-4 w-4" />
      </button>

      {open && (
        <Modal onClose={() => setOpen(false)}>
          <form
            onSubmit={save}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4">
              <div className="min-w-0">
                <h3 className="truncate text-base font-semibold text-slate-900">{variant.name}</h3>
                <p className="mt-0.5 font-mono text-xs text-slate-400">
                  {variant.sku} · {variant.brand}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="mt-5 grid gap-4 sm:grid-cols-2">
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">
                  Selling price
                </span>
                <input
                  required
                  inputMode="decimal"
                  value={form.price}
                  onChange={(e) => setForm({ ...form, price: e.target.value })}
                  className="input text-right tabular-nums"
                />
              </label>
              <label className="block">
                <span className="mb-1.5 block text-sm font-medium text-slate-700">Cost price</span>
                <input
                  inputMode="decimal"
                  value={form.costPrice}
                  onChange={(e) => setForm({ ...form, costPrice: e.target.value })}
                  placeholder="—"
                  className="input text-right tabular-nums"
                />
              </label>
            </div>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Reorder point{" "}
                <span className="font-normal text-slate-400">— warn below this quantity</span>
              </span>
              <input
                inputMode="numeric"
                value={form.reorderPoint}
                onChange={(e) => setForm({ ...form, reorderPoint: e.target.value })}
                className="input text-right tabular-nums"
              />
            </label>

            <div className="mt-4">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Barcodes</span>
              {variant.barcodes.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-1.5">
                  {variant.barcodes.map((b) => (
                    <li
                      key={b}
                      className="rounded bg-slate-100 px-2 py-1 font-mono text-xs text-slate-600"
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="mb-2 text-xs text-slate-400">None yet.</p>
              )}
              <input
                value={form.addBarcode}
                onChange={(e) => setForm({ ...form, addBarcode: e.target.value })}
                placeholder="Add another barcode"
                className="input"
              />
            </div>

            {error && (
              <p className="mt-4 rounded-md bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
                {error}
              </p>
            )}

            <div className="mt-6 flex justify-end gap-2">
              <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (await send("PATCH", { isActive: !variant.isActive })) setOpen(false);
                }}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {variant.isActive ? "Deactivate — hide from the sell screen" : "Reactivate"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={async () => {
                  if (!window.confirm(`Delete ${variant.sku}? Only possible if never sold.`)) return;
                  if (await send("DELETE")) setOpen(false);
                }}
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete
              </button>
            </div>
          </form>
        </Modal>
      )}
    </>
  );
}
