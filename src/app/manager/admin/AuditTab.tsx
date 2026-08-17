"use client";

import { useQuery } from "@tanstack/react-query";
import { fmtDate, fmtTime } from "@/lib/format";

interface Entry {
  id: string;
  action: string;
  entity: string | null;
  entityId: string | null;
  before: Record<string, unknown> | null;
  after: Record<string, unknown> | null;
  createdAt: string;
  actor: string;
}

function summarize(value: Record<string, unknown> | null): string {
  if (!value) return "";
  return Object.entries(value)
    .map(([k, v]) => `${k}: ${typeof v === "object" ? JSON.stringify(v) : String(v)}`)
    .join(" · ");
}

export default function AuditTab() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin-audit"],
    queryFn: async () => {
      const res = await fetch("/api/admin/audit");
      if (!res.ok) throw new Error("Failed to load audit log");
      return res.json() as Promise<{ entries: Entry[] }>;
    },
  });

  return (
    <div>
      <p className="text-sm text-slate-500">
        Every privileged action — voids, price changes, stock adjustments, target and
        permission changes — with actor and before/after values.
      </p>

      {isLoading && <p className="mt-6 text-center text-sm text-slate-400">Loading…</p>}

      <div className="mt-3 overflow-x-auto card">
        <table className="w-full min-w-[640px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">When</th>
              <th className="px-4 py-3">Who</th>
              <th className="px-4 py-3">Action</th>
              <th className="px-4 py-3">Detail</th>
            </tr>
          </thead>
          <tbody>
            {(data?.entries ?? []).map((e) => (
              <tr key={e.id} className="border-b border-slate-100 align-top last:border-0">
                <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                  {fmtDate(e.createdAt)} {fmtTime(e.createdAt)}
                </td>
                <td className="px-4 py-3 font-medium">{e.actor}</td>
                <td className="px-4 py-3">
                  <span className="rounded bg-slate-100 px-1.5 py-0.5 text-xs font-medium">
                    {e.action}
                  </span>
                  {e.entity && <span className="ml-1.5 text-xs text-slate-400">{e.entity}</span>}
                </td>
                <td className="px-4 py-3 text-xs text-slate-500">
                  {e.before && (
                    <p>
                      <span className="font-semibold text-slate-400">before</span>{" "}
                      {summarize(e.before)}
                    </p>
                  )}
                  {e.after && (
                    <p>
                      <span className="font-semibold text-slate-400">after</span>{" "}
                      {summarize(e.after)}
                    </p>
                  )}
                </td>
              </tr>
            ))}
            {!isLoading && (data?.entries ?? []).length === 0 && (
              <tr>
                <td colSpan={4} className="px-4 py-10 text-center text-slate-400">
                  Nothing logged yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
