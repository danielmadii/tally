"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import TargetsScreen from "@/components/TargetsScreen";
import AuditTab from "./AuditTab";

const tabs = ["Targets", "Audit log"] as const;
type Tab = (typeof tabs)[number];

export default function AdminScreen() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    tabs.find((t) => t.toLowerCase() === requested?.toLowerCase()) ?? "Targets"
  );

  return (
    <div>
      <h1 className="page-title">Settings</h1>
      <p className="page-desc">
        System-wide configuration. Shops, products and people are managed in their own sections.
      </p>

      <div className="mt-4 flex gap-1 rounded-lg bg-slate-200/70 p-1 sm:inline-flex">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-md px-5 py-2 text-sm font-semibold ${
              tab === t ? "bg-white text-slate-900 shadow-sm" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Targets" && <TargetsScreen />}
        {tab === "Audit log" && <AuditTab />}
      </div>
    </div>
  );
}
