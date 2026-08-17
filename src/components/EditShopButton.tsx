"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";

export interface EditableShop {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  isActive?: boolean;
}

/**
 * Edit a shop from anywhere it appears — the shops grid, the shop page, or
 * Settings. One dialog, one code path.
 */
export default function EditShopButton({
  shop,
  style = "button",
}: {
  shop: EditableShop;
  /** "button" = bordered button, "link" = compact inline action for tables/cards */
  style?: "button" | "link";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: shop.name,
    city: shop.city ?? "",
    address: shop.address ?? "",
  });

  function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setForm({ name: shop.name, city: shop.city ?? "", address: shop.address ?? "" });
    setError(null);
    setOpen(true);
  }

  async function act(
    method: "PATCH" | "DELETE",
    body?: Record<string, unknown>,
    confirmText?: string
  ) {
    if (busy) return;
    if (confirmText && !window.confirm(confirmText)) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shops/${shop.id}`, {
        method,
        ...(body
          ? { headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) }
          : {}),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not complete that");
        return;
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/shops/${shop.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        onClick={openDialog}
        className={
          style === "button"
            ? "btn btn-secondary"
            : "flex items-center gap-1 text-xs font-medium text-primary"
        }
      >
        <Pencil className={style === "button" ? "h-4 w-4" : "h-3.5 w-3.5"} />
        Edit{style === "button" ? " shop" : ""}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={save}
            className="w-full max-w-md rounded-xl bg-white p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">Edit shop</h3>
              <button
                type="button"
                onClick={() => setOpen(false)}
                aria-label="Close"
                className="p-1 text-slate-400 hover:text-slate-600"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <label className="mt-5 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Shop name</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">City</span>
              <input
                value={form.city}
                onChange={(e) => setForm({ ...form, city: e.target.value })}
                placeholder="e.g. Baghdad"
                className="input"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
              <input
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                placeholder="Street / mall / floor…"
                className="input"
              />
            </label>

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
                onClick={() => act("PATCH", { isActive: shop.isActive === false })}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {shop.isActive === false ? "Reactivate shop" : "Deactivate shop"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    "DELETE",
                    undefined,
                    `Delete ${shop.name}? This only works while the shop has no sales.`
                  )
                }
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete shop
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
