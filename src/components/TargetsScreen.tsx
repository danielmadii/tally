"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";

interface Row {
  userId: string;
  name: string;
  shopName: string;
  target: number | null;
}

export default function TargetsScreen() {
  const queryClient = useQueryClient();
  const [values, setValues] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const { data, isLoading } = useQuery({
    queryKey: ["admin-targets"],
    queryFn: async () => {
      const res = await fetch("/api/targets");
      if (!res.ok) throw new Error("Failed to load targets");
      return res.json() as Promise<{ rows: Row[] }>;
    },
  });
  const rows = data?.rows ?? [];

  useEffect(() => {
    if (data) {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- seed the form once data arrives
      setValues(Object.fromEntries(data.rows.map((r) => [r.userId, r.target?.toString() ?? ""])));
    }
  }, [data]);

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
      const resData = await res.json();
      setMessage(res.ok ? "Targets saved." : resData.error ?? "Failed to save");
      if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-targets"] });
    } finally {
      setBusy(false);
    }
  }

  const monthName = new Date().toLocaleDateString("en", { month: "long", year: "numeric" });

  return (
    <div className="max-w-2xl">
      <p className="text-sm text-slate-500">
        Monthly targets for {monthName} — they drive the attainment column on the leaderboard.
        Leave blank for no target.
      </p>

      {isLoading && <p className="mt-6 text-center text-sm text-slate-400">Loading…</p>}

      {rows.length > 0 && (
        <div className="card mt-4 overflow-hidden">
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
                      className="w-32 rounded-md border border-slate-300 px-3 py-2 text-right tabular-nums outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
                    />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {!isLoading && rows.length === 0 && (
        <p className="card mt-4 p-6 text-center text-sm text-slate-400">
          No salespeople yet — create them in the Users tab first.
        </p>
      )}

      {message && (
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      {rows.length > 0 && (
        <button onClick={save} disabled={busy} className="btn btn-primary mt-4">
          {busy ? "Saving…" : "Save targets"}
        </button>
      )}
    </div>
  );
}
