"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [phone, setPhone] = useState("");
  const [pin, setPin] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phone, pin, remember }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Login failed");
        return;
      }
      router.replace(data.role === "salesperson" ? "/" : "/manager");
      router.refresh();
    } catch {
      setError("Network problem — try again");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-4 safe-bottom">
      <div className="w-full max-w-sm">
        <div className="mb-8 flex flex-col items-center">
          <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-xl font-bold text-white">
            T
          </div>
          <h1 className="mt-4 text-xl font-semibold tracking-tight text-slate-900">
            Sign in to Tally
          </h1>
          <p className="mt-1 text-sm text-slate-500">Sales attribution &amp; stock</p>
        </div>

        <form onSubmit={submit} className="card p-6">
          <label className="block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">
              Phone number
            </span>
            <input
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className="input py-2.5 text-base"
              placeholder="07xx xxx xxxx"
            />
          </label>

          <label className="mt-4 block">
            <span className="mb-1.5 block text-sm font-medium text-slate-700">PIN</span>
            <input
              type="password"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              required
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ""))}
              className="input py-2.5 text-center text-xl tracking-[0.4em]"
              placeholder="••••"
            />
          </label>

          <label className="mt-4 flex items-center gap-2.5 text-sm text-slate-600">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded accent-primary"
            />
            Keep me signed in for 30 days
          </label>

          {error && (
            <p className="mt-4 rounded-md bg-red-50 px-3.5 py-2.5 text-sm text-red-700">
              {error}
            </p>
          )}

          <button type="submit" disabled={busy} className="btn btn-primary mt-5 h-11 w-full text-base">
            {busy ? "Signing in…" : "Sign in"}
          </button>
        </form>

        <p className="mt-6 text-center text-xs text-slate-400">
          Forgot your PIN? Your supervisor can issue a new one.
        </p>
      </div>
    </main>
  );
}
