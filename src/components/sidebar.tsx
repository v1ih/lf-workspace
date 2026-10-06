"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarCheck,
  ChevronsLeft,
  ChevronsRight,
  FolderKanban,
  Globe2,
  LayoutDashboard,
  ListTodo,
  Menu,
  Settings,
  Timer,
  Trophy,
  Users,
  Wallet,
  Workflow,
  X,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";

type Item = { href: string; label: string; icon: LucideIcon };

// Always visible at the top, never scrolled away
const PINNED: Item[] = [
  { href: "/", label: "Dashboard", icon: LayoutDashboard },
  { href: "/today", label: "Today", icon: CalendarCheck },
];

const GROUPS: { group: string; items: Item[] }[] = [
  {
    group: "Work",
    items: [
      { href: "/work", label: "My Work", icon: ListTodo },
      { href: "/sprints", label: "Sprints", icon: Workflow },
      { href: "/projects", label: "Projects", icon: FolderKanban },
      { href: "/time", label: "Time Tracking", icon: Timer },
    ],
  },
  {
    group: "Business",
    items: [
      { href: "/clients", label: "Clients", icon: Briefcase },
      { href: "/crm", label: "CRM", icon: Users },
      { href: "/finance", label: "Finance", icon: Wallet },
    ],
  },
  {
    group: "Career",
    items: [
      { href: "/applications", label: "Applications", icon: Globe2 },
      { href: "/learning", label: "Learning", icon: BookOpen },
      { href: "/achievements", label: "Achievements", icon: Trophy },
    ],
  },
  {
    group: "Analytics",
    items: [{ href: "/reports", label: "Reports", icon: BarChart3 }],
  },
];

const SETTINGS: Item = { href: "/settings", label: "Settings", icon: Settings };


export function Sidebar({ initialCollapsed = false }: { initialCollapsed?: boolean }) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  // Initial value comes from a cookie read on the server, so the first paint is already right
  const [collapsed, setCollapsed] = useState(initialCollapsed);

  // The app shell reads this attribute to shrink its left padding
  useEffect(() => {
    const shell = document.getElementById("app-shell");
    if (shell) shell.dataset.sidebar = collapsed ? "collapsed" : "expanded";
  }, [collapsed]);

  function toggleCollapsed() {
    const next = !collapsed;
    setCollapsed(next);
    document.cookie = `${SIDEBAR_COOKIE}=${next ? "collapsed" : "expanded"}; path=/; max-age=31536000; samesite=lax`;
  }

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));
  // On mobile the drawer always shows labels
  const compact = collapsed && !open;

  const renderItem = ({ href, label, icon: Icon }: Item) => (
    <li key={href}>
      <Link
        href={href}
        onClick={() => setOpen(false)}
        title={compact ? label : undefined}
        className={cn(
          "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
          compact && "lg:justify-center lg:px-0",
          isActive(href) ? "bg-white/10 font-medium text-white" : "text-sidebar-ink/75 hover:bg-white/5 hover:text-white",
        )}
      >
        <Icon className={cn("size-4 shrink-0", isActive(href) && "text-accent")} />
        <span className={cn(compact && "lg:sr-only")}>{label}</span>
      </Link>
    </li>
  );

  return (
    <>
      {/* Mobile top bar */}
      <div className="sticky top-0 z-50 flex h-14 items-center justify-between bg-sidebar px-4 lg:hidden">
        <Brand />
        <button
          onClick={() => setOpen((v) => !v)}
          className="rounded-lg p-2 text-sidebar-ink hover:bg-white/10"
          aria-label={open ? "Close menu" : "Open menu"}
        >
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </div>

      <aside
        className={cn(
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar px-3 pb-3 pt-17 transition-[transform,width] lg:translate-x-0 lg:pt-5",
          open ? "translate-x-0" : "-translate-x-full",
          compact && "lg:w-16 lg:px-2",
        )}
      >
        <div className={cn("hidden px-3 pb-5 lg:block", compact && "lg:px-0")}>
          <Brand compact={compact} />
        </div>

        <ul className="space-y-0.5 border-b border-white/10 pb-3">{PINNED.map(renderItem)}</ul>

        <nav className="-mx-1 flex-1 space-y-5 overflow-y-auto px-1 py-4 [scrollbar-width:thin] [scrollbar-color:rgb(255_255_255/0.15)_transparent]">
          {GROUPS.map((section) => (
            <div key={section.group}>
              <p
                className={cn(
                  "px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-ink/45",
                  compact && "lg:sr-only",
                )}
              >
                {section.group}
              </p>
              <ul className="space-y-0.5">{section.items.map(renderItem)}</ul>
            </div>
          ))}
        </nav>

        <div className="space-y-0.5 border-t border-white/10 pt-3">
          <ul>{renderItem(SETTINGS)}</ul>
          <button
            onClick={toggleCollapsed}
            className={cn(
              "hidden w-full items-center gap-3 rounded-lg px-3 py-2 text-sm text-sidebar-ink/60 hover:bg-white/5 hover:text-white lg:flex",
              compact && "lg:justify-center lg:px-0",
            )}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            title={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? <ChevronsRight className="size-4" /> : <ChevronsLeft className="size-4" />}
            <span className={cn(compact && "lg:sr-only")}>Collapse</span>
          </button>
        </div>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}

function Brand({ compact }: { compact?: boolean }) {
  return (
    <Link href="/" className={cn("flex items-center gap-2.5", compact && "justify-center")}>
      <span className="grid size-8 shrink-0 place-items-center rounded-lg bg-accent text-xs font-bold text-white">LF</span>
      <span className={cn("text-sm font-semibold text-white", compact && "sr-only")}>LF Workspace</span>
    </Link>
  );
}
