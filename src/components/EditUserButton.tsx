"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Pencil, X } from "lucide-react";

export interface EditableUser {
  id: string;
  name: string;
  phone: string;
  role: string;
  shopId: string | null;
  isActive?: boolean;
}

const ROLES = [
  { value: "salesperson", label: "Salesperson" },
  { value: "supervisor", label: "Shop manager" },
  { value: "area_manager", label: "Area manager" },
  { value: "admin", label: "Administrator" },
] as const;

/** Edit a person: name, login number, role, shop, and PIN reset — one dialog. */
export default function EditUserButton({
  user,
  style = "link",
}: {
  user: EditableUser;
  style?: "button" | "link";
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState({
    name: user.name,
    phone: user.phone,
    role: user.role,
    shopId: user.shopId ?? "",
    pin: "",
  });

  const { data: shopsData } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      return res.json() as Promise<{ shops: { id: string; name: string; is_active: boolean }[] }>;
    },
    enabled: open,
  });
  const shops = (shopsData?.shops ?? []).filter((s) => s.is_active);

  function openDialog(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    setForm({
      name: user.name,
      phone: user.phone,
      role: user.role,
      shopId: user.shopId ?? "",
      pin: "",
    });
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
      const res = await fetch(`/api/admin/users/${user.id}`, {
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
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  async function save(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.pin && !/^\d{4,6}$/.test(form.pin)) {
      setError("A PIN must be 4–6 digits.");
      return;
    }
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: form.name,
          phone: form.phone,
          role: form.role,
          shopId: form.shopId || null,
          ...(form.pin ? { pin: form.pin } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Could not save");
        return;
      }
      setOpen(false);
      queryClient.invalidateQueries({ queryKey: ["admin-users"] });
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
        Edit{style === "button" ? " user" : ""}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4"
          onClick={() => setOpen(false)}
        >
          <form
            onSubmit={save}
            className="max-h-[90dvh] w-full max-w-md overflow-y-auto rounded-xl bg-white p-6 text-left shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between">
              <h3 className="text-base font-semibold text-slate-900">Edit user</h3>
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
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Full name</span>
              <input
                required
                autoFocus
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                className="input"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                Phone number <span className="font-normal text-slate-400">— this is the login</span>
              </span>
              <input
                required
                type="tel"
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
                placeholder="07xx xxx xxxx"
                className="input"
              />
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Role</span>
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
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">Shop</span>
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
              {form.shopId !== (user.shopId ?? "") && (
                <span className="mt-1 block text-xs text-slate-400">
                  Moving someone to another shop keeps their past sales with the old shop.
                </span>
              )}
            </label>

            <label className="mt-4 block">
              <span className="mb-1.5 block text-sm font-medium text-slate-700">
                New PIN <span className="font-normal text-slate-400">— leave blank to keep the current one</span>
              </span>
              <input
                inputMode="numeric"
                maxLength={6}
                value={form.pin}
                onChange={(e) => setForm({ ...form, pin: e.target.value.replace(/\D/g, "") })}
                placeholder="4–6 digits"
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
                onClick={() => act("PATCH", { isActive: user.isActive === false })}
                className="text-xs font-medium text-slate-500 hover:text-slate-800"
              >
                {user.isActive === false ? "Reactivate user" : "Deactivate user"}
              </button>
              <button
                type="button"
                disabled={busy}
                onClick={() =>
                  act(
                    "DELETE",
                    undefined,
                    `Delete ${user.name}? This only works while they have no recorded sales.`
                  )
                }
                className="text-xs font-medium text-red-600 hover:text-red-700"
              >
                Delete user
              </button>
            </div>
          </form>
        </div>
      )}
    </>
  );
}
