"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { House, ScanBarcode, ReceiptText, LogOut } from "lucide-react";

const tabs = [
  { href: "/", label: "Home", icon: House },
  { href: "/sell", label: "Sell", icon: ScanBarcode },
  { href: "/sales", label: "My sales", icon: ReceiptText },
];

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

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  return (
    <div className="flex min-h-dvh flex-col">
      <header className="safe-top sticky top-0 z-20 border-b border-slate-200 bg-background/95 backdrop-blur">
        <div className="flex items-center justify-between px-4 py-3">
          <div>
            <p className="text-sm font-semibold leading-tight">{name}</p>
            <p className="text-xs text-slate-500">{shopName ?? "No shop"}</p>
          </div>
          <button
            onClick={logout}
            aria-label="Sign out"
            className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-medium text-slate-500 active:bg-slate-100"
          >
            <LogOut className="h-4 w-4" />
            Sign out
          </button>
        </div>
      </header>

      <main className="flex-1 pb-24">{children}</main>

      <nav className="safe-bottom fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white">
        <div className="mx-auto flex max-w-md">
          {tabs.map((t) => {
            const active = pathname === t.href;
            const Icon = t.icon;
            return (
              <Link
                key={t.href}
                href={t.href}
                className={`flex flex-1 flex-col items-center gap-1 py-2.5 text-xs font-medium ${
                  active ? "text-primary" : "text-slate-400"
                }`}
              >
                <Icon className="h-6 w-6" strokeWidth={active ? 2.2 : 1.8} />
                {t.label}
              </Link>
            );
          })}
        </div>
      </nav>
    </div>
  );
}
