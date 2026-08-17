"use client";

import { useState } from "react";
import { useSearchParams } from "next/navigation";
import UsersTab from "./UsersTab";
import ShopsTab from "./ShopsTab";
import CatalogueTab from "./CatalogueTab";
import AuditTab from "./AuditTab";
import TargetsScreen from "@/components/TargetsScreen";

const tabs = ["Users", "Shops", "Catalogue", "Targets", "Audit log"] as const;
type Tab = (typeof tabs)[number];

export default function AdminScreen() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("tab");
  const [tab, setTab] = useState<Tab>(
    tabs.find((t) => t.toLowerCase() === requested?.toLowerCase()) ?? "Users"
  );

  return (
    <div>
      <h1 className="page-title">Settings</h1>

      <div className="mt-3 flex gap-1 overflow-x-auto rounded-xl bg-slate-200/70 p-1">
        {tabs.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`flex-1 whitespace-nowrap rounded-lg px-4 py-2.5 text-sm font-semibold ${
              tab === t ? "bg-white shadow-sm" : "text-slate-500"
            }`}
          >
            {t}
          </button>
        ))}
      </div>

      <div className="mt-5">
        {tab === "Users" && <UsersTab />}
        {tab === "Shops" && <ShopsTab />}
        {tab === "Catalogue" && <CatalogueTab />}
        {tab === "Targets" && <TargetsScreen />}
        {tab === "Audit log" && <AuditTab />}
      </div>
    </div>
  );
}
