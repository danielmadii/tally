"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface ShopRow {
  id: string;
  code: string;
  name: string;
  city: string | null;
  is_active: boolean;
  opened_on: string | null;
}

export default function ShopsTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [form, setForm] = useState({ code: "", name: "", city: "" });
  const [busy, setBusy] = useState(false);

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
        <p className="mb-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <form onSubmit={createShop} className="grid gap-3 card p-4 sm:grid-cols-4">
        <input
          required
          placeholder="Code (e.g. DWT)"
          value={form.code}
          onChange={(e) => setForm({ ...form, code: e.target.value.toUpperCase() })}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm uppercase outline-none focus:border-primary"
        />
        <input
          required
          placeholder="Shop name"
          value={form.name}
          onChange={(e) => setForm({ ...form, name: e.target.value })}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <input
          placeholder="City"
          value={form.city}
          onChange={(e) => setForm({ ...form, city: e.target.value })}
          className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
        />
        <button
          type="submit"
          disabled={busy}
          className="btn btn-primary press"
        >
          {busy ? "Creating…" : "+ Add shop"}
        </button>
      </form>

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[480px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3"></th>
            </tr>
          </thead>
          <tbody>
            {(data?.shops ?? []).map((s) => (
              <tr key={s.id} className={`border-b border-slate-100 last:border-0 ${s.is_active ? "" : "opacity-50"}`}>
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 font-medium">
                  {s.name}
                  {!s.is_active && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      closed
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-500">{s.city ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{s.opened_on ?? "—"}</td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => toggleActive(s)}
                    className={`text-xs font-medium ${s.is_active ? "text-red-600" : "text-green-700"}`}
                  >
                    {s.is_active ? "Deactivate" : "Reactivate"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
