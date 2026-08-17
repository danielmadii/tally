"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/manager/products/catalogue", label: "Catalogue" },
  { href: "/manager/products", label: "Performance" },
];

/** Products module: manage the catalogue, or read how it is selling. */
export default function ProductsTabs({ adminOnly = true }: { adminOnly?: boolean }) {
  const pathname = usePathname();
  const visible = adminOnly ? tabs : tabs.filter((t) => t.href === "/manager/products");
  if (visible.length < 2) return null;

  return (
    <div className="mt-4 flex gap-1 rounded-lg bg-slate-200/70 p-1 sm:inline-flex">
      {visible.map((t) => {
        const active = pathname === t.href;
        return (
          <Link
            key={t.href}
            href={t.href}
            className={`flex-1 whitespace-nowrap rounded-md px-5 py-2 text-center text-sm font-semibold ${
              active ? "bg-white shadow-sm text-slate-900" : "text-slate-500 hover:text-slate-700"
            }`}
          >
            {t.label}
          </Link>
        );
      })}
    </div>
  );
}
