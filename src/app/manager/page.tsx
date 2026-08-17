import Link from "next/link";
import { getLiveDashboard } from "@/lib/server/queries";
import { fmtMoney, fmtInt } from "@/lib/format";
import HourlyChart from "./HourlyChart";

export const dynamic = "force-dynamic";

export default async function LiveDashboard() {
  const data = await getLiveDashboard();
  const today = new Date().toLocaleDateString("en", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <h1 className="page-title">Live dashboard</h1>
          <p className="page-desc">Chain-wide performance for today, {today}</p>
        </div>
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
          <h2 className="section-label">Shops</h2>
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
