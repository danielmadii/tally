import { Download } from "lucide-react";
import { getLeaderboard } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const rows = await getLeaderboard();

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="page-title">Leaderboard — this month</h1>
        {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a navigation */}
        <a
          href="/api/export/leaderboard"
          className="btn btn-secondary"
        >
          <Download className="h-4 w-4" />
          Export CSV
        </a>
      </div>
      <p className="mt-1 text-sm text-slate-500">
        Attainment is pro-rated by elapsed days, so mid-month figures are fair.
      </p>

      <div className="mt-4 overflow-x-auto card">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Salesperson</th>
              <th className="px-4 py-3">Shop</th>
              <th className="px-4 py-3 text-right">Revenue</th>
              <th className="px-4 py-3 text-right">Units</th>
              <th className="px-4 py-3 text-right">Sales</th>
              <th className="px-4 py-3 text-right">Attainment</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.userId} className="border-b border-slate-100 last:border-0">
                <td className="px-4 py-3 font-semibold text-slate-400">{i + 1}</td>
                <td className="px-4 py-3 font-medium">{r.name}</td>
                <td className="px-4 py-3 text-slate-500">{r.shopName}</td>
                <td className="px-4 py-3 text-right font-semibold tabular-nums">
                  {fmtMoney(r.revenue)}
                </td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtInt(r.units)}</td>
                <td className="px-4 py-3 text-right tabular-nums">{fmtInt(r.transactions)}</td>
                <td className="px-4 py-3">
                  {r.attainmentPct !== null ? (
                    <div className="flex items-center justify-end gap-2">
                      <div className="h-2 w-20 overflow-hidden rounded-full bg-slate-100">
                        <div
                          className={`h-full rounded-full ${
                            r.attainmentPct >= 100 ? "bg-green-600" : "bg-primary"
                          }`}
                          style={{ width: `${Math.min(r.attainmentPct, 100)}%` }}
                        />
                      </div>
                      <span className="w-12 text-right font-semibold tabular-nums">
                        {r.attainmentPct}%
                      </span>
                    </div>
                  ) : (
                    <span className="block text-right text-slate-400">no target</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                  No salespeople yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
