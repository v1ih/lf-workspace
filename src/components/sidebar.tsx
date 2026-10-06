"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import {
  BarChart3,
  BookOpen,
  Briefcase,
  CalendarCheck,
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
} from "lucide-react";
import { cn } from "@/lib/utils";

const NAV = [
  {
    group: "Work",
    items: [
      { href: "/", label: "Dashboard", icon: LayoutDashboard },
      { href: "/today", label: "Today", icon: CalendarCheck },
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
  {
    group: "System",
    items: [{ href: "/settings", label: "Settings", icon: Settings }],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  const isActive = (href: string) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

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
          "fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-sidebar px-3 py-5 transition-transform lg:translate-x-0",
          open ? "translate-x-0" : "-translate-x-full",
        )}
      >
        <div className="hidden px-3 pb-6 lg:block">
          <Brand />
        </div>
        <nav className="flex-1 space-y-5 overflow-y-auto pt-14 lg:pt-0">
          {NAV.map((section) => (
            <div key={section.group}>
              <p className="px-3 pb-1.5 text-[10px] font-semibold uppercase tracking-[0.14em] text-sidebar-ink/45">
                {section.group}
              </p>
              <ul className="space-y-0.5">
                {section.items.map(({ href, label, icon: Icon }) => (
                  <li key={href}>
                    <Link
                      href={href}
                      onClick={() => setOpen(false)}
                      className={cn(
                        "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition-colors",
                        isActive(href)
                          ? "bg-white/10 font-medium text-white"
                          : "text-sidebar-ink/75 hover:bg-white/5 hover:text-white",
                      )}
                    >
                      <Icon className={cn("size-4", isActive(href) && "text-accent")} />
                      {label}
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </nav>
      </aside>

      {open && <div className="fixed inset-0 z-30 bg-black/30 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  );
}

function Brand() {
  return (
    <Link href="/" className="flex items-center gap-2.5">
      <span className="grid size-8 place-items-center rounded-lg bg-accent text-xs font-bold text-white">LF</span>
      <span className="text-sm font-semibold text-white">LF Workspace</span>
    </Link>
  );
}
