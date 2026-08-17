"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface Row {
  userId: string;
  name: string;
  shopName: string;
  target: number | null;
}

export default function TargetsScreen({ rows }: { rows: Row[] }) {
  const router = useRouter();
  const [values, setValues] = useState<Record<string, string>>(
    Object.fromEntries(rows.map((r) => [r.userId, r.target?.toString() ?? ""]))
  );
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  async function save() {
    setBusy(true);
    setMessage(null);
    try {
      const res = await fetch("/api/targets", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          targets: rows.map((r) => ({
            userId: r.userId,
            value: values[r.userId]?.trim() ? Number(values[r.userId]) : null,
          })),
        }),
      });
      const data = await res.json();
      setMessage(res.ok ? "Targets saved." : data.error ?? "Failed to save");
      if (res.ok) router.refresh();
    } finally {
      setBusy(false);
    }
  }

  const monthName = new Date().toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl">
      <h1 className="page-title">Monthly targets — {monthName}</h1>
      <p className="mt-1 text-sm text-slate-500">
        Targets drive the attainment column on the leaderboard. Leave blank for no target.
      </p>

      <div className="mt-4 overflow-hidden card">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Salesperson</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-right">Target</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-500">{r.shopName}</td>
                <td className="px-4 py-2 text-right">
                  <input
                    type="number"
                    inputMode="decimal"
                    min={0}
                    value={values[r.userId] ?? ""}
                    onChange={(e) =>
                      setValues((prev) => ({ ...prev, [r.userId]: e.target.value }))
                    }
                    placeholder="—"
                    className="w-28 rounded-lg border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                  />
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {message && (
        <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <button
        onClick={save}
        disabled={busy}
        className="press mt-4 rounded-xl bg-primary px-6 py-3 font-semibold text-white disabled:opacity-60"
      >
        {busy ? "Saving…" : "Save targets"}
      </button>
    </div>
  );
}
