"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { fmtMoney } from "@/lib/format";

interface Recon {
  id: string;
  shopName: string;
  date: string;
  tillTotal: number;
  recorded: number;
  variance: number;
}

export default function ReconcileScreen({
  shops,
  ownShopName,
  recent,
}: {
  shops: { id: string; name: string }[];
  ownShopName: string | null;
  recent: Recon[];
}) {
  const router = useRouter();
  const [shopId, setShopId] = useState(shops[0]?.id ?? "");
  const [tillTotal, setTillTotal] = useState("");
  const [busy, setBusy] = useState(false);
  const [result, setResult] = useState<{ variance: number; recorded: number } | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setResult(null);
    try {
      const res = await fetch("/api/reconciliation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          tillTotal: Number(tillTotal),
          ...(shops.length ? { shopId } : {}),
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.error ?? "Failed");
        return;
      }
      setResult({ variance: data.variance, recorded: data.recorded });
      router.refresh();
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="max-w-2xl">
      <h1 className="page-title">Till reconciliation</h1>

      <form onSubmit={submit} className="mt-4 space-y-3 card p-4">
        {shops.length > 0 ? (
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-slate-600">Shop</span>
            <select
              value={shopId}
              onChange={(e) => setShopId(e.target.value)}
              className="w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary"
            >
              {shops.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        ) : (
          <p className="text-sm text-slate-500">Shop: {ownShopName}</p>
        )}

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-slate-600">
            Till total for today
          </span>
          <input
            type="number"
            inputMode="decimal"
            min={0}
            step="0.01"
            required
            value={tillTotal}
            onChange={(e) => setTillTotal(e.target.value)}
            className="w-full rounded-xl border border-slate-300 px-4 py-3 text-lg tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
            placeholder="0.00"
          />
        </label>

        {error && <p className="rounded-lg bg-red-50 px-4 py-3 text-sm text-red-700">{error}</p>}
        {result && (
          <p
            className={`rounded-lg px-4 py-3 text-sm font-medium ${
              Math.abs(result.variance) < 0.005
                ? "bg-green-50 text-green-700"
                : "bg-amber-50 text-amber-800"
            }`}
          >
            Recorded {fmtMoney(result.recorded)} · variance {fmtMoney(result.variance)}
            {Math.abs(result.variance) < 0.005 ? " — clean" : " — investigate"}
          </p>
        )}

        <button
          type="submit"
          disabled={busy}
          className="press w-full rounded-xl bg-primary py-3.5 font-semibold text-white disabled:opacity-60"
        >
          {busy ? "Checking…" : "Save & check variance"}
        </button>
      </form>

      <h2 className="mt-8 text-lg font-semibold">Recent days</h2>
      <div className="mt-2 overflow-x-auto card">
        <table className="w-full min-w-[420px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-right">Till</th>
              <th className="px-4 py-3 text-right">Recorded</th>
              <th className="px-4 py-3 text-right">Variance</th>
            </tr>
          </thead>
          <tbody>
            {recent.map((r) => (
              <tr key={r.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">{r.date}</td>
                <td className="px-4 py-3 text-slate-500">{r.shopName}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.tillTotal)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtMoney(r.recorded)}</td>
                <td
                  className={`px-4 py-3 text-right font-semibold tabular-nums ${
                    Math.abs(r.variance) < 0.005 ? "text-green-700" : "text-amber-700"
                  }`}
                >
                  {fmtMoney(r.variance)}
                </td>
              </tr>
            ))}
            {recent.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-slate-400">
                  No reconciliations recorded yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
