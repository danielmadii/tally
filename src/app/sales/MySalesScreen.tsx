"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { fmtMoney, fmtTime, fmtDate } from "@/lib/format";
import type { MySale } from "@/lib/types";

const VOID_REASONS = [
  { value: "wrong_item", label: "Wrong item" },
  { value: "wrong_quantity", label: "Wrong quantity" },
  { value: "customer_changed_mind", label: "Customer changed mind" },
  { value: "wrong_person", label: "Entered under wrong person" },
  { value: "price_error", label: "Price error" },
] as const;

export default function MySalesScreen() {
  const [period, setPeriod] = useState<"today" | "month">("today");
  const [expanded, setExpanded] = useState<string | null>(null);
  const [voiding, setVoiding] = useState<string | null>(null);
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery({
    queryKey: ["my-sales", period],
    queryFn: async () => {
      const res = await fetch(`/api/sales/mine?period=${period}`);
      if (!res.ok) throw new Error("Failed to load sales");
      return res.json() as Promise<{ sales: MySale[] }>;
    },
  });

  async function requestVoid(saleId: string, reason: string) {
    const res = await fetch(`/api/sales/${saleId}/void-request`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reason }),
    });
    setVoiding(null);
    if (res.ok) {
      queryClient.invalidateQueries({ queryKey: ["my-sales"] });
    }
  }

  const sales = data?.sales ?? [];
  const total = sales.filter((s) => s.status === "completed").reduce((s, x) => s + x.total, 0);

  return (
    <div className="mx-auto max-w-md px-4 pt-4">
      <div className="flex rounded-xl bg-slate-200/70 p-1">
        {(["today", "month"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`flex-1 rounded-lg py-2.5 text-sm font-semibold capitalize ${
              period === p ? "bg-white shadow-sm" : "text-slate-500"
            }`}
          >
            {p === "today" ? "Today" : "This month"}
          </button>
        ))}
      </div>

      <div className="mt-4 flex items-baseline justify-between px-1">
        <span className="text-sm text-slate-500">{sales.length} sales</span>
        <span className="text-lg font-bold tabular-nums">{fmtMoney(total)}</span>
      </div>

      {isLoading && <p className="mt-8 text-center text-sm text-slate-400">Loading…</p>}
      {!isLoading && sales.length === 0 && (
        <p className="mt-8 text-center text-sm text-slate-400">No sales yet — go sell!</p>
      )}

      <ul className="mt-2 space-y-2">
        {sales.map((sale) => {
          const open = expanded === sale.id;
          return (
            <li key={sale.id} className="card">
              <button
                onClick={() => setExpanded(open ? null : sale.id)}
                className="flex w-full items-center justify-between px-4 py-3.5 text-left"
              >
                <div>
                  <p className="text-sm font-semibold">{sale.saleNo}</p>
                  <p className="text-xs text-slate-500">
                    {period === "month" ? `${fmtDate(sale.soldAt)} · ` : ""}
                    {fmtTime(sale.soldAt)}
                    {sale.status !== "completed" && (
                      <span className="ml-2 rounded bg-slate-100 px-1.5 py-0.5 font-medium uppercase text-slate-500">
                        {sale.status}
                      </span>
                    )}
                    {sale.voidRequestedAt && sale.status === "completed" && (
                      <span className="ml-2 rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                        void requested
                      </span>
                    )}
                  </p>
                </div>
                <span className="text-base font-bold tabular-nums">{fmtMoney(sale.total)}</span>
              </button>

              {open && (
                <div className="border-t border-slate-100 px-4 py-3">
                  <ul className="space-y-1.5">
                    {sale.lines.map((l, i) => (
                      <li key={i} className="flex justify-between text-sm">
                        <span className="text-slate-600">
                          {l.qty} × {l.name}
                        </span>
                        <span className="tabular-nums">{fmtMoney(l.lineTotal)}</span>
                      </li>
                    ))}
                  </ul>
                  {sale.status === "completed" && !sale.voidRequestedAt && (
                    <button
                      onClick={() => setVoiding(sale.id)}
                      className="mt-3 text-xs font-medium text-red-600"
                    >
                      Request void
                    </button>
                  )}
                </div>
              )}
            </li>
          );
        })}
      </ul>

      {voiding && (
        <div className="fixed inset-0 z-50 flex flex-col justify-end bg-black/40" onClick={() => setVoiding(null)}>
          <div
            className="safe-bottom rounded-t-3xl bg-white p-5"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-semibold">Why void this sale?</h3>
            <p className="mt-1 text-xs text-slate-500">
              Your supervisor will review and approve the void.
            </p>
            <div className="mt-4 space-y-2">
              {VOID_REASONS.map((r) => (
                <button
                  key={r.value}
                  onClick={() => requestVoid(voiding, r.value)}
                  className="w-full rounded-xl bg-slate-100 py-3.5 text-sm font-medium active:bg-slate-200"
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
