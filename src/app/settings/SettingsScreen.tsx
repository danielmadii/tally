"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

export default function SettingsScreen({
  name,
  phone,
  shopName,
}: {
  name: string;
  phone: string;
  shopName: string | null;
}) {
  const router = useRouter();
  const [form, setForm] = useState({ currentPin: "", newPin: "", confirmPin: "" });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  async function changePin(e: React.FormEvent) {
    e.preventDefault();
    if (busy) return;
    if (form.newPin !== form.confirmPin) {
      setMessage({ ok: false, text: "The two new PINs do not match." });
      return;
    }
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/me/pin", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPin: form.currentPin, newPin: form.newPin }),
      });
      const data = await res.json();
      setMessage(
        res.ok
          ? { ok: true, text: "PIN changed — use it next time you sign in." }
          : { ok: false, text: data.error ?? "Could not change your PIN" }
      );
      if (res.ok) setForm({ currentPin: "", newPin: "", confirmPin: "" });
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="card p-4">
        <Row label="Name" value={name} />
        <Row label="Phone" value={phone} mono />
        <Row label="Shop" value={shopName ?? "—"} last />
      </div>

      <form onSubmit={changePin} className="card mt-4 p-4">
        <h2 className="text-sm font-semibold text-slate-900">Change PIN</h2>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Current PIN</span>
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.currentPin}
            onChange={(e) => setForm({ ...form, currentPin: e.target.value.replace(/\D/g, "") })}
            className="input py-3 text-center text-lg tracking-[0.4em]"
            placeholder="••••"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-500">New PIN</span>
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.newPin}
            onChange={(e) => setForm({ ...form, newPin: e.target.value.replace(/\D/g, "") })}
            className="input py-3 text-center text-lg tracking-[0.4em]"
            placeholder="••••"
          />
        </label>

        <label className="mt-3 block">
          <span className="mb-1 block text-xs font-medium text-slate-500">Repeat new PIN</span>
          <input
            required
            type="password"
            inputMode="numeric"
            maxLength={6}
            value={form.confirmPin}
            onChange={(e) => setForm({ ...form, confirmPin: e.target.value.replace(/\D/g, "") })}
            className="input py-3 text-center text-lg tracking-[0.4em]"
            placeholder="••••"
          />
        </label>

        {message && (
          <p
            className={`mt-3 rounded-md px-3.5 py-2.5 text-sm ${
              message.ok ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
            }`}
          >
            {message.text}
          </p>
        )}

        <button type="submit" disabled={busy} className="btn btn-primary press mt-4 h-11 w-full">
          {busy ? "Saving…" : "Change PIN"}
        </button>
      </form>

      <button
        onClick={logout}
        className="btn btn-secondary press mt-4 h-11 w-full text-red-600"
      >
        <LogOut className="h-4 w-4" />
        Sign out
      </button>
    </div>
  );
}

function Row({
  label,
  value,
  mono = false,
  last = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
  last?: boolean;
}) {
  return (
    <div
      className={`flex items-center justify-between py-2.5 ${
        last ? "" : "border-b border-slate-100"
      }`}
    >
      <span className="text-sm text-slate-500">{label}</span>
      <span className={`text-sm font-medium text-slate-900 ${mono ? "font-mono" : ""}`}>
        {value}
      </span>
    </div>
  );
}
