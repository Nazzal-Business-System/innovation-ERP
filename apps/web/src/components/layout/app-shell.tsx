"use client";

import { memo, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { DemoBanner } from "@/components/demo/demo-banner";
import { GlobalSearchProvider } from "@/components/search/global-search-field";
import { NavigationPrefetcher } from "@/components/navigation/navigation-prefetcher";
import { AppSidebar } from "./app-sidebar";
import { AppTopbar } from "./app-topbar";
import { AppScrollLock } from "./app-scroll-lock";
import { SidebarPinsHydrator } from "./sidebar-pins-hydrator";

export const AppShell = memo(function AppShell({ children }: { children: React.ReactNode }) {
  const [mobileOpen, setMobileOpen] = useState(false);
  const pathname = usePathname();

  /**
   * Close the mobile drawer on every route change (sidebar click, account links,
   * browser Back/Forward, soft navigation). Leaving `mobileOpen` true keeps
   * `button.ierp-mobile-drawer-backdrop` (`bg-[var(--overlay)]`) covering the page.
   */
  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <GlobalSearchProvider>
      <AppScrollLock />
      <div className="flex h-dvh max-h-dvh flex-col overflow-hidden bg-[var(--background)]">
        <NavigationPrefetcher enabled />
        <SidebarPinsHydrator />
        <DemoBanner />
        <div className="flex min-h-0 flex-1 overflow-hidden">
          <AppSidebar mobileOpen={mobileOpen} onMobileClose={() => setMobileOpen(false)} />
          <div className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
            <AppTopbar onMenuClick={() => setMobileOpen(true)} />
            <main className="ierp-main-content min-h-0 min-w-0 flex-1 overflow-x-hidden overflow-y-auto overscroll-y-contain">
              {children}
            </main>
          </div>
        </div>
      </div>
    </GlobalSearchProvider>
  );
});
