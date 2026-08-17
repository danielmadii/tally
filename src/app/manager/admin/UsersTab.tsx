"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface UserRow {
  id: string;
  name: string;
  phone: string;
  role: string;
  isActive: boolean;
  lastLoginAt: string | null;
  shopId: string | null;
  shopName: string | null;
}

const ROLES = ["salesperson", "supervisor", "area_manager", "admin"] as const;

export default function UsersTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);
  const [showAdd, setShowAdd] = useState(false);
  const [form, setForm] = useState({ name: "", phone: "", pin: "", role: "salesperson", shopId: "" });
  const [busy, setBusy] = useState(false);

  const { data: usersData } = useQuery({
    queryKey: ["admin-users"],
    queryFn: async () => {
      const res = await fetch("/api/admin/users");
      if (!res.ok) throw new Error("Failed to load users");
      return res.json() as Promise<{ users: UserRow[] }>;
    },
  });
  const { data: shopsData } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      return res.json() as Promise<{ shops: { id: string; name: string; is_active: boolean }[] }>;
    },
  });
  const shops = (shopsData?.shops ?? []).filter((s) => s.is_active);

  async function patchUser(id: string, patch: Record<string, unknown>, okMsg: string) {
    setMessage(null);
    const res = await fetch(`/api/admin/users/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    const data = await res.json();
    setMessage(res.ok ? okMsg : data.error ?? "Failed");
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-users"] });
  }

  function resetPin(user: UserRow) {
    const pin = window.prompt(`New PIN for ${user.name} (4–6 digits):`);
    if (!pin) return;
    if (!/^\d{4,6}$/.test(pin)) {
      setMessage("PIN must be 4–6 digits");
      return;
    }
    patchUser(user.id, { pin }, `PIN reset for ${user.name}. Tell her in person, not in a group chat.`);
  }

  async function createUser(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/admin/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          pin: form.pin,
          role: form.role,
          shopId: form.shopId || null,
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? `${form.name} created — send her the link and the PIN.` : data.error ?? "Failed");
      if (res.ok) {
        setForm({ name: "", phone: "", pin: "", role: "salesperson", shopId: "" });
        setShowAdd(false);
        queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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

      <button
        onClick={() => setShowAdd((v) => !v)}
        className="btn press bg-slate-900 text-white hover:bg-slate-800"
      >
        {showAdd ? "Cancel" : "+ Add user"}
      </button>

      {showAdd && (
        <form onSubmit={createUser} className="mt-3 grid gap-3 card p-4 sm:grid-cols-2">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            required
            type="tel"
            placeholder="Phone (login), e.g. 0770 123 4567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <input
            required
            inputMode="numeric"
            pattern="\d{4,6}"
            placeholder="PIN (4–6 digits)"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
            className="rounded-xl border border-slate-300 px-4 py-3 text-sm outline-none focus:border-primary"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          >
            {ROLES.map((r) => (
              <option key={r} value={r}>
                {r.replace("_", " ")}
              </option>
            ))}
          </select>
          <select
            value={form.shopId}
            onChange={(e) => setForm({ ...form, shopId: e.target.value })}
            className="rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
          >
            <option value="">No shop assignment</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button
            type="submit"
            disabled={busy}
            className="btn btn-primary press"
          >
            {busy ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(usersData?.users ?? []).map((u) => (
              <tr key={u.id} className={`border-b border-slate-100 last:border-0 ${u.isActive ? "" : "opacity-50"}`}>
                <td className="px-4 py-3 font-medium">
                  {u.name}
                  {!u.isActive && (
                    <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 text-xs text-slate-500">
                      inactive
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.phone}</td>
                <td className="px-4 py-3">
                  <select
                    value={u.role}
                    onChange={(e) =>
                      patchUser(u.id, { role: e.target.value }, `${u.name} is now ${e.target.value.replace("_", " ")}`)
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    {ROLES.map((r) => (
                      <option key={r} value={r}>
                        {r.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <select
                    value={u.shopId ?? ""}
                    onChange={(e) =>
                      patchUser(
                        u.id,
                        { shopId: e.target.value || null },
                        `${u.name} transferred — past sales keep their original shop`
                      )
                    }
                    className="rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-xs"
                  >
                    <option value="">—</option>
                    {shops.map((s) => (
                      <option key={s.id} value={s.id}>
                        {s.name}
                      </option>
                    ))}
                  </select>
                </td>
                <td className="px-4 py-3">
                  <div className="flex gap-3 text-xs font-medium">
                    <button onClick={() => resetPin(u)} className="text-primary">
                      Reset PIN
                    </button>
                    <button
                      onClick={() =>
                        patchUser(
                          u.id,
                          { isActive: !u.isActive },
                          u.isActive ? `${u.name} deactivated` : `${u.name} reactivated`
                        )
                      }
                      className={u.isActive ? "text-red-600" : "text-green-700"}
                    >
                      {u.isActive ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
