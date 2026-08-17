"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard,
  Store,
  Trophy,
  Package,
  Boxes,
  ClipboardCheck,
  Calculator,
  Target,
  Settings,
  LogOut,
  Menu,
  X,
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
    items: [
      { href: "/manager", label: "Live dashboard", icon: LayoutDashboard },
      { href: "/manager/shops", label: "Shops", icon: Store },
      { href: "/manager/leaderboard", label: "Leaderboard", icon: Trophy },
      { href: "/manager/products", label: "Products", icon: Package },
    ],
  },
  {
    section: "Operations",
    items: [
      { href: "/manager/stock", label: "Stock", icon: Boxes },
      { href: "/manager/approvals", label: "Approvals", icon: ClipboardCheck },
      { href: "/manager/reconcile", label: "Reconcile", icon: Calculator },
    ],
  },
  {
    section: "Administration",
    items: [
      { href: "/manager/targets", label: "Targets", icon: Target, adminOnly: true },
      { href: "/manager/admin", label: "Admin", icon: Settings, adminOnly: true },
    ],
  },
];

const COLLAPSE_KEY = "tally-sidebar-collapsed";

function Sidebar({
  name,
  role,
  sections,
  pathname,
  collapsed,
  onNavigate,
  onToggleCollapse,
  onLogout,
}: {
  name: string;
  role: string;
  sections: { section: string; items: NavItem[] }[];
  pathname: string;
  collapsed: boolean;
  onNavigate: () => void;
  onToggleCollapse?: () => void;
  onLogout: () => void;
}) {
  return (
    <div className="flex h-full flex-col bg-slate-950 text-slate-400">
      <div className={`flex items-center gap-3 py-5 ${collapsed ? "justify-center px-2" : "px-5"}`}>
        <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary text-base font-bold text-white">
          T
        </div>
        {!collapsed && (
          <div>
            <p className="text-sm font-semibold text-white">Tally</p>
            <p className="text-[11px] text-slate-400">Sales &amp; Stock</p>
          </div>
        )}
      </div>

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

      <div className={`border-t border-slate-800 py-4 ${collapsed ? "px-2" : "px-4"}`}>
        {!collapsed && (
          <>
            <p className="text-sm font-semibold text-white">{name}</p>
            <p className="text-xs capitalize text-slate-400">{role.replace("_", " ")}</p>
          </>
        )}
        <button
          onClick={onLogout}
          title={collapsed ? "Sign out" : undefined}
          className={`mt-3 flex w-full items-center gap-2 rounded-lg bg-slate-800 py-2 text-xs font-medium text-slate-300 hover:bg-slate-700 hover:text-white ${
            collapsed ? "justify-center px-0" : "px-3"
          }`}
        >
          <LogOut className="h-4 w-4 shrink-0" />
          {!collapsed && "Sign out"}
        </button>
        {onToggleCollapse && (
          <button
            onClick={onToggleCollapse}
            title={collapsed ? "Expand menu" : undefined}
            className={`mt-2 flex w-full items-center gap-2 rounded-lg py-2 text-xs font-medium text-slate-400 hover:bg-slate-800 hover:text-white ${
              collapsed ? "justify-center px-0" : "px-3"
            }`}
          >
            {collapsed ? (
              <PanelLeftOpen className="h-4 w-4 shrink-0" />
            ) : (
              <PanelLeftClose className="h-4 w-4 shrink-0" />
            )}
            {!collapsed && "Collapse menu"}
          </button>
        )}
      </div>
    </div>
  );
}

export default function ManagerShell({
  name,
  role,
  children,
}: {
  name: string;
  role: string;
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

  const sections = NAV.map((s) => ({
    ...s,
    items: s.items.filter((i) => !i.adminOnly || role === "admin"),
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
          sections={sections}
          pathname={pathname}
          collapsed={collapsed}
          onNavigate={() => {}}
          onToggleCollapse={toggleCollapse}
          onLogout={logout}
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
              sections={sections}
              pathname={pathname}
              collapsed={false}
              onNavigate={() => setDrawerOpen(false)}
              onLogout={logout}
            />
          </div>
        </div>
      )}

      <div className="flex min-w-0 flex-1 flex-col">
        {/* Mobile top bar */}
        <header className="safe-top sticky top-0 z-20 flex items-center gap-3 border-b border-slate-200 bg-background/95 px-4 py-3 backdrop-blur lg:hidden">
          <button
            onClick={() => setDrawerOpen((v) => !v)}
            aria-label="Menu"
            className="rounded-lg p-2 text-slate-600 active:bg-slate-100"
          >
            {drawerOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
          </button>
          <p className="text-sm font-semibold">Tally</p>
        </header>

        <main className="mx-auto w-full max-w-6xl flex-1 px-4 pb-16 pt-6 lg:px-8">{children}</main>
      </div>
    </div>
  );
}
