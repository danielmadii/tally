"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import {
  LayoutDashboard,
  Store,
  Package,
  UsersRound,
  ClipboardCheck,
  Calculator,
  Settings,
  LogOut,
  Menu,
  X,
  Bell,
  PanelLeftClose,
  PanelLeftOpen,
} from "lucide-react";

interface NavItem {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  adminOnly?: boolean;
}

const NAV: { section: string; items: NavItem[] }[] = [
  {
    section: "Overview",
    items: [{ href: "/manager", label: "Dashboard", icon: LayoutDashboard }],
  },
  {
    section: "Manage",
    items: [
      { href: "/manager/shops", label: "Shops", icon: Store },
      { href: "/manager/products", label: "Products", icon: Package },
      { href: "/manager/team", label: "Team", icon: UsersRound, adminOnly: true },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/manager/approvals", label: "Approvals", icon: ClipboardCheck },
      { href: "/manager/reconcile", label: "Reconcile", icon: Calculator },
    ],
  },
  {
    section: "System",
    items: [{ href: "/manager/admin", label: "Settings", icon: Settings, adminOnly: true }],
  },
];

const COLLAPSE_KEY = "tally-sidebar-collapsed";

function initials(name: string) {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((w) => w[0]!.toUpperCase())
    .join("");
}

function ProfileMenu({
  name,
  role,
  onLogout,
}: {
  name: string;
  role: string;
  onLogout: () => void;
}) {
  const [open, setOpen] = useState(false);
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Account"
        className="flex h-8 w-8 items-center justify-center rounded-full bg-primary text-xs font-semibold text-white hover:opacity-90"
      >
        {initials(name)}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-56 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            <div className="px-3 py-2">
              <p className="text-sm font-semibold text-slate-900">{name}</p>
              <p className="text-xs capitalize text-slate-500">{role.replace("_", " ")}</p>
            </div>
            <div className="my-1 border-t border-slate-100" />
            <button
              onClick={onLogout}
              className="flex w-full items-center gap-2 rounded-md px-3 py-2 text-sm text-slate-600 hover:bg-slate-50 hover:text-slate-900"
            >
              <LogOut className="h-4 w-4" />
              Sign out
            </button>
          </div>
        </>
      )}
    </div>
  );
}

function NotificationBell() {
  const [open, setOpen] = useState(false);
  const { data } = useQuery({
    queryKey: ["notifications"],
    queryFn: async () => {
      const res = await fetch("/api/notifications");
      if (!res.ok) throw new Error("notifications");
      return res.json() as Promise<{ voidRequests: number; lowStock: number }>;
    },
    refetchInterval: 60_000,
  });
  const total = (data?.voidRequests ?? 0) + (data?.lowStock ?? 0);

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Notifications"
        className="relative rounded-md p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-700"
      >
        <Bell className="h-[18px] w-[18px]" />
        {total > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-primary px-1 text-[10px] font-bold text-white">
            {total > 99 ? "99+" : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <div className="fixed inset-0 z-30" onClick={() => setOpen(false)} />
          <div className="absolute right-0 top-11 z-40 w-72 rounded-lg border border-slate-200 bg-white p-2 shadow-lg">
            {total === 0 && (
              <p className="px-3 py-4 text-center text-sm text-slate-400">All clear — nothing needs you.</p>
            )}
            {(data?.voidRequests ?? 0) > 0 && (
              <Link
                href="/manager/approvals"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">
                  {data!.voidRequests} void request{data!.voidRequests === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-slate-500">awaiting approval</span>
              </Link>
            )}
            {(data?.lowStock ?? 0) > 0 && (
              <Link
                href="/manager/shops"
                onClick={() => setOpen(false)}
                className="block rounded-md px-3 py-2.5 text-sm hover:bg-slate-50"
              >
                <span className="font-semibold text-slate-900">
                  {data!.lowStock} item{data!.lowStock === 1 ? "" : "s"}
                </span>{" "}
                <span className="text-slate-500">at or below reorder point</span>
              </Link>
            )}
          </div>
        </>
      )}
    </div>
  );
}

function Sidebar({
  name,
  role,
  brandTitle,
  brandSubtitle,
  sections,
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapse,
}: {
  name: string;
  role: string;
  brandTitle: string;
  brandSubtitle: string;
  sections: { section: string; items: NavItem[] }[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse?: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-400">
      <div className={`flex items-center gap-3 py-5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
          {brandTitle[0]?.toUpperCase()}
        </div>
        {!collapsed && (
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-white">{brandTitle}</p>
            <p className="text-[11px] text-slate-400">{brandSubtitle}</p>
          </div>
        )}
        {onToggleCollapse && !collapsed && (
          <button
            onClick={onToggleCollapse}
            title="Collapse menu"
            aria-label="Collapse menu"
            className="ml-auto rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
          >
            <PanelLeftClose className="h-4 w-4" />
          </button>
        )}
      </div>
      {onToggleCollapse && collapsed && (
        <button
          onClick={onToggleCollapse}
          title="Expand menu"
          aria-label="Expand menu"
          className="mx-auto mb-2 rounded-md p-1.5 text-slate-500 hover:bg-white/5 hover:text-slate-200"
        >
          <PanelLeftOpen className="h-4 w-4" />
        </button>
      )}

      <nav className={`flex-1 overflow-y-auto pb-4 ${collapsed ? "px-2" : "px-3"}`}>
        {sections.map((section) => (
          <div key={section.section} className="mt-4 first:mt-1">
            {!collapsed ? (
              <p className="px-2 pb-1.5 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                {section.section}
              </p>
            ) : (
              <div className="mx-2 mb-1.5 border-t border-slate-800" />
            )}
            <ul className="space-y-0.5">
              {section.items.map((item) => {
                const active =
                  item.href === "/manager"
                    ? pathname === "/manager"
                    : pathname === item.href || pathname.startsWith(`${item.href}/`);
                const Icon = item.icon;
                return (
                  <li key={item.href}>
                    <Link
                      href={item.href}
                      onClick={onNavigate}
                      title={collapsed ? item.label : undefined}
                      className={`relative flex items-center gap-3 rounded-md py-2 text-[13px] font-medium transition-colors ${
                        collapsed ? "justify-center px-0" : "px-3"
                      } ${
                        active
                          ? "bg-white/10 text-white"
                          : "text-slate-400 hover:bg-white/5 hover:text-slate-100"
                      }`}
                    >
                      {active && (
                        <span className="absolute inset-y-1.5 left-0 w-0.5 rounded-full bg-primary" />
                      )}
                      <Icon className="h-4 w-4 shrink-0" />
                      {!collapsed && item.label}
                    </Link>
                  </li>
                );
              })}
            </ul>
          </div>
        ))}
      </nav>

      {!collapsed && (
        <div className="border-t border-slate-800 px-4 py-4">
          <p className="text-sm font-semibold text-white">{name}</p>
          <p className="text-xs capitalize text-slate-400">{role.replace("_", " ")}</p>
        </div>
      )}
    </div>
  );
}

export default function ManagerShell({
  name,
  role,
  shopName,
  children,
}: {
  name: string;
  role: string;
  shopName?: string | null;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    // localStorage isn't available during SSR, so the persisted preference can
    // only be applied after mount — one intentional post-hydration render.
    if (localStorage.getItem(COLLAPSE_KEY) === "1") {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setCollapsed(true);
    }
  }, []);

  function toggleCollapse() {
    setCollapsed((prev) => {
      localStorage.setItem(COLLAPSE_KEY, prev ? "0" : "1");
      return !prev;
    });
  }

  async function logout() {
    await fetch("/api/auth/logout", { method: "POST" });
    router.replace("/login");
    router.refresh();
  }

  // Shop managers see their own shop as the workspace, not the chain brand.
  const isShopManager = role === "supervisor" && !!shopName;
  const brandTitle = isShopManager ? shopName! : "Tally";
  const brandSubtitle = isShopManager ? "Powered by Tally" : "Sales & Stock";

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items
      .filter((i) => !i.adminOnly || role === "admin")
      .map((i) =>
        isShopManager && i.href === "/manager/shops" ? { ...i, label: "My shop" } : i
      ),
  })).filter((s) => s.items.length > 0);

  return (
    <div className="flex min-h-dvh">
      {/* Desktop sidebar: always visible, collapsible to an icon rail */}
      <aside
        className={`sticky top-0 hidden h-dvh shrink-0 transition-[width] duration-200 lg:block ${
          collapsed ? "w-[72px]" : "w-64"
        }`}
      >
        <Sidebar
          name={name}
          role={role}
          brandTitle={brandTitle}
          brandSubtitle={brandSubtitle}
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => {}}
          onToggleCollapse={toggleCollapse}
        />
      </aside>

      {/* Mobile drawer (never collapsed) */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40 lg:hidden" onClick={() => setDrawerOpen(false)}>
          <div className="absolute inset-0 bg-black/50" />
          <div
            className="absolute inset-y-0 left-0 w-72 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <Sidebar
              name={name}
              role={role}
              brandTitle={brandTitle}
              brandSubtitle={brandSubtitle}
              sections={sections}
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setDrawerOpen(false)}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Slim top bar: menu (mobile) left, notification bell right */}
        <header className="safe-top sticky top-0 z-20 flex h-12 items-center justify-between border-b border-slate-200 bg-white/95 px-4 backdrop-blur lg:px-6">
          <div className="flex items-center gap-3 lg:hidden">
            <button
              onClick={() => setDrawerOpen((v) => !v)}
              aria-label="Menu"
              className="rounded-md p-2 text-slate-600 active:bg-slate-100"
            >
              {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
            <p className="text-sm font-semibold">{brandTitle}</p>
          </div>
          <div className="hidden lg:block" />
          <div className="flex items-center gap-2">
            <NotificationBell />
            <ProfileMenu name={name} role={role} onLogout={logout} />
          </div>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
