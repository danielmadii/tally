"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, ScanBarcode, ReceiptText, Settings, LogOut } from "lucide-react";
import { useT } from "@/lib/i18n/client";

const tabs = [
  { href: "/", key: "home", icon: House },
  { href: "/sell", key: "sell", icon: ScanBarcode },
  { href: "/sales", key: "mySales", icon: ReceiptText },
  { href: "/settings", key: "settings", icon: Settings },
] as const;

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

export default function SalesShell({
  name,
  shopName,
  children,
}: {
  name: string;
  shopName: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const { t } = useT();
  const [menuOpen, setMenuOpen] = useState(false);

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between gap-3 px-4 py-3">
          <p className="truncate text-base font-bold tracking-tight text-primary">
            {shopName ?? t("noShop")}
          </p>

          <div className="relative shrink-0">
            <button
              onClick={() => setMenuOpen((v) => !v)}
              aria-label={t("account")}
              className="flex h-9 w-9 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white"
            >
              {initials(name)}
            </button>

            {menuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setMenuOpen(false)} />
                <div className="absolute end-0 top-11 z-40 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
                  <div className="px-3 py-2">
                    <p className="text-sm font-semibold text-slate-900">{name}</p>
                    <p className="text-xs text-slate-500">{shopName ?? t("noShop")}</p>
                  </div>
                  <div className="my-1 border-t border-slate-100" />
                  <Link
                    href="/settings"
                    onClick={() => setMenuOpen(false)}
                    className="flex items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <Settings className="h-4 w-4" />
                    {t("settings")}
                  </Link>
                  <button
                    onClick={logout}
                    className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50"
                  >
                    <LogOut className="h-4 w-4" />
                    {t("signOut")}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md">
          {tabs.map((tab) => {
            const active = pathname === tab.href;
            const Icon = tab.icon;
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-[11px] font-medium ${
                  active ? "text-primary" : "text-slate-400"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                {t(tab.key)}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
