"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import EditUserButton from "@/components/EditUserButton";

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

const ROLES = [
  { value: "salesperson", label: "Salesperson" },
  { value: "supervisor", label: "Shop manager" },
  { value: "area_manager", label: "Area manager" },
  { value: "admin", label: "Administrator" },
] as const;

const roleLabel = (role: string) =>
  ROLES.find((r) => r.value === role)?.label ?? role.replace("_", " ");

export default function TeamScreen() {
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

  async function toggleActive(user: UserRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/users/${user.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !user.isActive }),
    });
    const data = await res.json();
    setMessage(
      res.ok
        ? user.isActive
          ? `${user.name} deactivated — they can no longer sign in.`
          : `${user.name} reactivated.`
        : data.error ?? "Failed"
    );
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
      setMessage(
        res.ok ? `${form.name} created — send them the link and the PIN.` : data.error ?? "Failed"
      );
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
        <p className="mb-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <button
        onClick={() => setShowAdd((v) => !v)}
        className="btn press bg-slate-900 text-white hover:bg-slate-800"
      >
        {showAdd ? "Cancel" : "+ Add user"}
      </button>

      {showAdd && (
        <form onSubmit={createUser} className="card mt-3 grid gap-3 p-4 sm:grid-cols-2">
          <input
            required
            placeholder="Full name"
            value={form.name}
            onChange={(e) => setForm({ ...form, name: e.target.value })}
            className="input"
          />
          <input
            required
            type="tel"
            placeholder="Phone (login), e.g. 0770 123 4567"
            value={form.phone}
            onChange={(e) => setForm({ ...form, phone: e.target.value })}
            className="input"
          />
          <input
            required
            inputMode="numeric"
            pattern="\d{4,6}"
            placeholder="PIN (4–6 digits)"
            value={form.pin}
            onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
            className="input"
          />
          <select
            value={form.role}
            onChange={(e) => setForm({ ...form, role: e.target.value })}
            className="input"
          >
            {ROLES.map((r) => (
              <option key={r.value} value={r.value}>
                {r.label}
              </option>
            ))}
          </select>
          <select
            value={form.shopId}
            onChange={(e) => setForm({ ...form, shopId: e.target.value })}
            className="input"
          >
            <option value="">No shop assignment</option>
            {shops.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
          <button type="submit" disabled={busy} className="btn btn-primary press">
            {busy ? "Creating…" : "Create user"}
          </button>
        </form>
      )}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Phone</th>
              <th className="px-4 py-3">Role</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-end">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(usersData?.users ?? []).map((u) => (
              <tr
                key={u.id}
                className={`border-b border-slate-100 last:border-0 ${u.isActive ? "" : "opacity-50"}`}
              >
                <td className="px-4 py-3 font-medium">
                  {u.name}
                  {!u.isActive && <span className="badge badge-neutral ms-2">inactive</span>}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{u.phone}</td>
                <td className="px-4 py-3 text-slate-600">{roleLabel(u.role)}</td>
                <td className="px-4 py-3 text-slate-500">{u.shopName ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <EditUserButton
                      user={{
                        id: u.id,
                        name: u.name,
                        phone: u.phone,
                        role: u.role,
                        shopId: u.shopId,
                        isActive: u.isActive,
                      }}
                    />
                    <button
                      onClick={() => toggleActive(u)}
                      className={`text-xs font-medium ${
                        u.isActive ? "text-red-600" : "text-green-700"
                      }`}
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
