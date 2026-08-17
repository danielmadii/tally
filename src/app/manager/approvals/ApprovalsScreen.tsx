"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Download } from "lucide-react";
import { fmtMoney, fmtTime, fmtDate } from "@/lib/format";

interface VoidRequest {
  id: string;
  saleNo: string;
  soldAt: string;
  total: number;
  requestedAt: string;
  reason: string;
  salesperson: string;
  shopName: string;
  lines: string[];
}

interface ExceptionRow {
  id: string;
  saleNo: string;
  soldAt: string;
  total: number;
  discount: number;
  status: string;
  voidReason: string | null;
  salesperson: string;
  shopName: string;
}

export default function ApprovalsScreen({
  requests,
  exceptions,
}: {
  requests: VoidRequest[];
  exceptions: ExceptionRow[];
}) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [returnNo, setReturnNo] = useState("");

  async function approveVoid(id: string) {
    setBusy(id);
    setMessage(null);
    try {
      const res = await fetch(`/api/sales/${id}/void`, { method: "POST" });
      const data = await res.json();
      setMessage(res.ok ? "Void approved — stock restored." : data.error ?? "Failed");
      if (res.ok) router.refresh();
    } finally {
      setBusy(null);
    }
  }

  async function recordReturn(e: React.FormEvent) {
    e.preventDefault();
    if (!returnNo.trim()) return;
    setBusy("return");
    setMessage(null);
    try {
      const res = await fetch("/api/sales/return-by-no", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ saleNo: returnNo.trim() }),
      });
      const data = await res.json();
      setMessage(res.ok ? `Return recorded for ${returnNo.trim()} — stock restored.` : data.error ?? "Failed");
      if (res.ok) {
        setReturnNo("");
        router.refresh();
      }
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <h1 className="page-title">Void requests</h1>

      {message && (
        <p className="mt-3 rounded-xl bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <div className="mt-4 space-y-3">
        {requests.length === 0 && (
          <p className="card px-4 py-8 text-center text-sm text-slate-400">
            No pending void requests.
          </p>
        )}
        {requests.map((r) => (
          <div key={r.id} className="card p-4">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-semibold">
                  {r.saleNo} · {fmtMoney(r.total)}
                </p>
                <p className="text-sm text-slate-500">
                  {r.salesperson} · {r.shopName} · sold {fmtDate(r.soldAt)} {fmtTime(r.soldAt)}
                </p>
                <p className="mt-1 text-sm">
                  <span className="rounded bg-amber-50 px-1.5 py-0.5 font-medium text-amber-700">
                    {r.reason.replace(/_/g, " ")}
                  </span>
                </p>
                <ul className="mt-2 text-xs text-slate-500">
                  {r.lines.map((l, i) => (
                    <li key={i}>{l}</li>
                  ))}
                </ul>
              </div>
              <button
                onClick={() => approveVoid(r.id)}
                disabled={busy === r.id}
                className="btn btn-primary press"
              >
                {busy === r.id ? "Approving…" : "Approve void"}
              </button>
            </div>
          </div>
        ))}
      </div>

      <h2 className="mt-10 text-lg font-semibold">Record a return</h2>
      <form onSubmit={recordReturn} className="mt-3 flex max-w-md gap-2">
        <input
          value={returnNo}
          onChange={(e) => setReturnNo(e.target.value)}
          placeholder="Sale number, e.g. S260814-00012"
          className="flex-1 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-primary/15"
        />
        <button
          type="submit"
          disabled={busy === "return"}
          className="btn press bg-slate-900 text-white hover:bg-slate-800"
        >
          Return
        </button>
      </form>

      <h2 className="mt-10 text-lg font-semibold">Exceptions — this month</h2>
      <div className="mt-1 flex items-center justify-end">
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a navigation */}
        <a
          href="/api/export/exceptions"
          className="flex items-center gap-1.5 text-sm font-medium text-primary"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
      <div className="mt-3 overflow-x-auto card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-start text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Sale</th>
              <th className="px-4 py-3">Salesperson</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-end">Total</th>
              <th className="px-4 py-3 text-end">Discount</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody>
            {exceptions.map((s) => (
              <tr key={s.id} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3">
                  <p className="font-medium">{s.saleNo}</p>
                  <p className="text-xs text-slate-400">
                    {fmtDate(s.soldAt)} {fmtTime(s.soldAt)}
                  </p>
                </td>
                <td className="px-4 py-3">{s.salesperson}</td>
                <td className="px-4 py-3 text-slate-500">{s.shopName}</td>
                <td className="px-4 py-3 text-end tabular-nums">{fmtMoney(s.total)}</td>
                <td className="px-4 py-3 text-end tabular-nums">
                  {s.discount > 0 ? fmtMoney(s.discount) : "—"}
                </td>
                <td className="px-4 py-3">
                  {s.status === "voided" ? (
                    <span className="rounded bg-red-50 px-1.5 py-0.5 text-xs font-medium text-red-700">
                      voided{s.voidReason ? ` · ${s.voidReason.replace(/_/g, " ")}` : ""}
                    </span>
                  ) : (
                    <span className="text-xs text-slate-500">{s.status}</span>
                  )}
                </td>
              </tr>
            ))}
            {exceptions.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-10 text-center text-slate-400">
                  No exceptions this month.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
