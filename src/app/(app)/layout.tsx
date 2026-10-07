import { cookies } from "next/headers";
import { getCurrentUser } from "@/lib/dal";
import { SIDEBAR_COOKIE } from "@/lib/sidebar";
import { Sidebar } from "@/components/sidebar";
import { Topbar } from "@/components/topbar";
import { DemoBanner } from "@/components/demo-banner";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const collapsed = (await cookies()).get(SIDEBAR_COOKIE)?.value === "collapsed";

  return (
    // data-sidebar is kept in sync by the Sidebar when it's toggled
    <div id="app-shell" data-sidebar={collapsed ? "collapsed" : "expanded"} className="group/shell min-h-screen">
      <Sidebar initialCollapsed={collapsed} />
      <div className="transition-[padding] lg:pl-64 lg:group-data-[sidebar=collapsed]/shell:pl-16">
        {user.isDemo && <DemoBanner />}
        <Topbar user={user} />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-8 sm:py-8">{children}</main>
      </div>
    </div>
  );
}
