import Link from "next/link";
import { BarChart3, Download } from "lucide-react";
import { requireSession } from "@/lib/server/session";
import { getLiveDashboard, getLeaderboard } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";
import HourlyChart from "./HourlyChart";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Shop managers are competitors — they see their own shop only.
  const session = await requireSession();
  const scope = session.role === "supervisor" ? session.shopId : null;

  const [data, leaderboard] = await Promise.all([
    getLiveDashboard(scope),
    getLeaderboard(scope),
  ]);
  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h1 className="page-title">Dashboard</h1>
          <p className="page-desc">
            {scope ? `${session.shopName} — today, ${today}` : `Chain-wide performance for today, ${today}`}
          </p>
        </div>
        <Link href="/manager/products/performance" className="btn btn-secondary">
          <BarChart3 className="h-4 w-4" />
          Sales performance
        </Link>
      </div>

      <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard label="Revenue today" value={fmtMoney(data.totalRevenue)} />
        <StatCard label="Transactions" value={fmtInt(data.totalTransactions)} />
        <StatCard
          label="Average basket"
          value={
            data.totalTransactions
              ? fmtMoney(data.totalRevenue / data.totalTransactions)
              : "—"
          }
        />
      </div>

      <div className="card mt-6 p-5">
        <div className="flex items-baseline justify-between">
          <h2 className="text-sm font-semibold text-slate-900">Revenue by hour</h2>
          <span className="text-xs text-slate-400">Today</span>
        </div>
        <div className="mt-4">
          <HourlyChart data={data.hourlyTrend} />
        </div>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="section-label">{scope ? "Your shop" : "Shops"}</h2>
          <div className="mt-2 space-y-3">
            {data.perShop.map((shop) => (
              <Link
                key={shop.shopId}
                href={`/manager/shops/${shop.shopId}`}
                className="card flex items-center justify-between p-4 transition-shadow hover:shadow-md"
              >
                <div>
                  <p className="text-sm font-semibold text-slate-900">{shop.name}</p>
                  <p className="mt-0.5 text-xs text-slate-500">
                    {fmtInt(shop.transactions)} sales · {fmtInt(shop.units)} units
                  </p>
                </div>
                <p className="text-base font-semibold tabular-nums text-slate-900">
                  {fmtMoney(shop.revenue)}
                </p>
              </Link>
            ))}
          </div>
        </section>

        <section>
          <h2 className="section-label">Top salespeople today</h2>
          <div className="mt-2 space-y-3">
            {data.topSalespeople.length === 0 && (
              <p className="card p-4 text-sm text-slate-400">No sales recorded yet today.</p>
            )}
            {data.topSalespeople.map((p, i) => (
              <div key={p.name} className="card flex items-center justify-between p-4">
                <span className="flex items-center gap-3 text-sm font-medium text-slate-900">
                  <span className="flex h-6 w-6 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold text-slate-600">
                    {i + 1}
                  </span>
                  {p.name}
                </span>
                <span className="text-sm font-semibold tabular-nums text-slate-900">
                  {fmtMoney(p.revenue)}
                </span>
              </div>
            ))}
          </div>
        </section>
      </div>

      <section className="mt-10">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold">Leaderboard — this month</h2>
            <p className="text-sm text-slate-500">
              Attainment is pro-rated by elapsed days, so mid-month figures are fair.
            </p>
          </div>
          {/* eslint-disable-next-line @next/next/no-html-link-for-pages -- CSV download, not a navigation */}
          <a href="/api/export/leaderboard" className="btn btn-secondary">
            <Download className="h-4 w-4" />
            Export CSV
          </a>
        </div>

        <div className="card mt-3 overflow-x-auto">
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
              {leaderboard.map((r, i) => (
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
              {leaderboard.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-10 text-center text-slate-400">
                    No salespeople yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function StatCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="card p-5">
      <p className="section-label">{label}</p>
      <p className="mt-2 text-2xl font-semibold tabular-nums tracking-tight text-slate-900">
        {value}
      </p>
    </div>
  );
}
