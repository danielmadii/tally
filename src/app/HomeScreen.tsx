"use client";

import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import ProgressRing from "@/components/ProgressRing";
import { fmtMoney, fmtInt } from "@/lib/format";
import { useCatalogueSync } from "@/lib/client/catalogue";
import type { MyStats } from "@/lib/types";

/**
 * The motivation screen: four numbers and a button. She should want to open it.
 */
export default function HomeScreen({ firstName }: { firstName: string }) {
  useCatalogueSync(); // warm the local catalogue before she reaches Sell

  const { data: stats, isLoading } = useQuery<MyStats>({
    queryKey: ["me-stats"],
    queryFn: async () => {
      const res = await fetch("/api/me/stats");
      if (!res.ok) throw new Error("Failed to load stats");
      return res.json();
    },
    refetchInterval: 60_000,
  });

  const rankLabel =
    stats?.rank && stats.shopHeadcount > 0
      ? `#${stats.rank} of ${stats.shopHeadcount}`
      : "—";

  return (
    <div className="mx-auto max-w-md px-4 pt-6">
      <h1 className="page-title">Hi {firstName}</h1>
      <p className="text-sm text-slate-500">Here’s your day so far</p>

      <div className="mt-5 grid grid-cols-3 gap-3">
        <Stat label="Today" value={isLoading ? "…" : fmtMoney(stats?.todayRevenue ?? 0)} />
        <Stat label="Units" value={isLoading ? "…" : fmtInt(stats?.todayUnits ?? 0)} />
        <Stat label="Shop rank" value={isLoading ? "…" : rankLabel} />
      </div>

      <div className="mt-8 flex flex-col items-center card p-6">
        <ProgressRing
          pct={stats?.attainmentPct ?? null}
          label={stats?.attainmentPct != null ? `${stats.attainmentPct}%` : "—"}
          sublabel="of monthly target"
        />
        <p className="mt-4 text-sm text-slate-500">
          {stats?.monthTarget
            ? `${fmtMoney(stats.monthRevenue)} of ${fmtMoney(stats.monthTarget)} this month`
            : "No target set for this month yet"}
        </p>
      </div>

      <Link
        href="/sell"
        className="press mt-8 block rounded-2xl bg-primary py-5 text-center text-2xl font-bold text-white shadow-lg shadow-primary/20"
      >
        SELL
      </Link>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="card px-3 py-4 text-center">
      <p className="truncate text-lg font-bold tabular-nums">{value}</p>
      <p className="mt-0.5 text-[11px] font-medium uppercase tracking-wide text-slate-400">
        {label}
      </p>
    </div>
  );
}
