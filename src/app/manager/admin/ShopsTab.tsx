"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import AddShopButton from "@/components/AddShopButton";
import EditShopButton from "@/components/EditShopButton";

interface ShopRow {
  id: string;
  code: string;
  name: string;
  city: string | null;
  address: string | null;
  is_active: boolean;
  opened_on: string | null;
}

export default function ShopsTab() {
  const queryClient = useQueryClient();
  const [message, setMessage] = useState<string | null>(null);

  const { data } = useQuery({
    queryKey: ["admin-shops"],
    queryFn: async () => {
      const res = await fetch("/api/admin/shops");
      if (!res.ok) throw new Error("Failed to load shops");
      return res.json() as Promise<{ shops: ShopRow[] }>;
    },
  });

  async function toggleActive(shop: ShopRow) {
    setMessage(null);
    const res = await fetch(`/api/admin/shops/${shop.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ isActive: !shop.is_active }),
    });
    const resData = await res.json();
    setMessage(
      res.ok
        ? shop.is_active
          ? `${shop.name} deactivated — its history is preserved.`
          : `${shop.name} reactivated.`
        : resData.error ?? "Failed"
    );
    if (res.ok) queryClient.invalidateQueries({ queryKey: ["admin-shops"] });
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Shops can also be added and edited from the Shops page.
        </p>
        <AddShopButton />
      </div>

      {message && (
        <p className="mt-3 rounded-md bg-slate-100 px-4 py-3 text-sm text-slate-700">{message}</p>
      )}

      <div className="card mt-4 overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="bg-slate-50 border-b border-slate-200 text-left text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <th className="px-4 py-3">Code</th>
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">City</th>
              <th className="px-4 py-3">Address</th>
              <th className="px-4 py-3">Opened</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {(data?.shops ?? []).map((s) => (
              <tr
                key={s.id}
                className={`border-b border-slate-100 last:border-0 ${s.is_active ? "" : "opacity-50"}`}
              >
                <td className="px-4 py-3 font-mono text-xs">{s.code}</td>
                <td className="px-4 py-3 font-medium">
                  {s.name}
                  {!s.is_active && <span className="badge badge-neutral ml-2">closed</span>}
                </td>
                <td className="px-4 py-3 text-slate-500">{s.city ?? "—"}</td>
                <td className="max-w-48 truncate px-4 py-3 text-slate-500">{s.address ?? "—"}</td>
                <td className="px-4 py-3 text-slate-500">{s.opened_on ?? "—"}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-3">
                    <EditShopButton
                      style="link"
                      shop={{
                        id: s.id,
                        code: s.code,
                        name: s.name,
                        city: s.city,
                        address: s.address,
                      }}
                    />
                    <button
                      onClick={() => toggleActive(s)}
                      className={`text-xs font-medium ${
                        s.is_active ? "text-red-600" : "text-green-700"
                      }`}
                    >
                      {s.is_active ? "Deactivate" : "Reactivate"}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
