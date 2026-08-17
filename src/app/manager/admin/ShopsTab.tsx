"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";

interface ShopRow {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
  opened_on: string | null;
}

export default function ShopsTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", city: "" });
  const [busy, setBusy] = useState(false);
  const [editing, setEditing] = useState<ShopRow | null>(null);
  const [editForm, setEditForm] = useState({ name: "", city: "", address: "" });

  const { data } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      return res.json() as Promise<{ shops: ShopRow[] }>;
    },
  });

  async function createShop(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/shops", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const resData = await res.json();
      setMessage(res.ok ? `${form.name} created.` : resData.error ?? "Failed");
      if (res.ok) {
        setForm({ code: "", name: "", city: "" });
        queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      }
    } finally {
      setBusy(false);
    }
  }

  function openEdit(shop: ShopRow) {
    setEditing(shop);
    setEditForm({ name: shop.name, city: shop.city ?? "", address: shop.address ?? "" });
  }

  async function saveEdit(e: React.FormEvent) {
    e.preventDefault();
    if (!editing || busy) return;
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch(`/api/admin/shops/${editing.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(editForm),
      });
      const resData = await res.json();
      setMessage(res.ok ? `${editForm.name} updated.` : resData.error ?? "Failed");
      if (res.ok) {
        setEditing(null);
        queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
      }
    } finally {
      setBusy(false);
    }
  }

  async function toggleActive(shop: ShopRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !shop.is_active }),
    });
    const resData = await res.json();
    setMessage(
      res.ok
        ? shop.is_active
          ? `${shop.name} deactivated — its history is preserved.`
          : `${shop.name} reactivated.`
        : resData.error ?? "Failed"
    );
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
  }

  return (
    <div>
      {message && (
        <p className="mb-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <form onSubmit={createShop} className="card grid gap-3 p-4 sm:grid-cols-4">
        <input
          required
          placeholder="Code (e.g. KRB)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          className="input uppercase"
        />
        <input
          required
          placeholder="Shop name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="input"
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="input"
        />
        <button type="submit" disabled={busy} className="btn btn-primary press">
          {busy ? "Creating…" : "+ Add shop"}
        </button>
      </form>

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.shops ?? []).map((s) => (
              <tr
                key={s.id}
                className={`border-b border-slate-100 last:border-0 ${s.is_active ? "" : "opacity-50"}`}
              >
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 font-medium">
                  {s.name}
                  {!s.is_active && <span className="badge badge-neutral ml-2">closed</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{s.city ?? "—"}</td>
                <td className="max-w-48 truncate px-4 py-3 text-slate-500">{s.address ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{s.opened_on ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-3 text-xs font-medium">
                    <button
                      onClick={() => openEdit(s)}
                      className="flex items-center gap-1 text-primary"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </button>
                    <button
                      onClick={() => toggleActive(s)}
                      className={s.is_active ? "text-red-600" : "text-green-700"}
                    >
                      {s.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setEditing(null)}
        >
          <form
            onSubmit={saveEdit}
            className="w-full max-w-md rounded-xl bg-white p-6 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-base font-semibold text-slate-900">Edit shop</h3>
                <p className="mt-0.5 text-xs text-slate-500">
                  Code <span className="font-mono">{editing.code}</span> — codes stay fixed so
                  history and exports remain traceable.
                </p>
              </div>
              <button
                type="button"
                onClick={() => setEditing(null)}
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
                value={editForm.name}
                onChange={(e) => setEditForm({ ...editForm, name: e.target.value })}
                className="input"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">City</span>
              <input
                value={editForm.city}
                onChange={(e) => setEditForm({ ...editForm, city: e.target.value })}
                className="input"
                placeholder="e.g. Baghdad"
              />
            </label>
            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Address</span>
              <input
                value={editForm.address}
                onChange={(e) => setEditForm({ ...editForm, address: e.target.value })}
                className="input"
                placeholder="Street / mall / floor…"
              />
            </label>

            <div className="mt-6 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setEditing(null)}
                className="btn btn-secondary"
              >
                Cancel
              </button>
              <button type="submit" disabled={busy} className="btn btn-primary">
                {busy ? "Saving…" : "Save changes"}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
}
