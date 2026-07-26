"use client";

import { Menu } from "lucide-react";
import { Button } from "@/components/ui/button";
import { NotificationsDropdown } from "@/components/notifications/notifications-dropdown";
import { GlobalSearchField } from "@/components/search/global-search-field";
import { AccountMenu } from "./account-menu";
import { SidebarModeToggle } from "./sidebar-mode-toggle";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";

interface AppTopbarProps {
  onMenuClick: () => void;
}

export function AppTopbar({ onMenuClick }: AppTopbarProps) {
  const organization = useAuthStore((s) => s.organization);
  const { t } = useI18n();

  return (
    <header className="ierp-topbar sticky top-0 z-30 flex shrink-0 items-center gap-2 px-3 sm:gap-3 sm:px-4 lg:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="shrink-0 cursor-pointer lg:hidden"
        onClick={onMenuClick}
        aria-label={t("topbar.openMenu")}
      >
        <Menu className="h-5 w-5 rtl-flip" />
      </Button>

      <SidebarModeToggle />

      <GlobalSearchField className="min-w-0 flex-1 md:max-w-[min(100%,40rem)]" />

      {organization?.name && (
        <div className="hidden items-center gap-2 xl:flex">
          <span
            className="rounded-md border border-[var(--border-subtle)] bg-[var(--muted-bg)]/50 px-2 py-1 text-[11px] font-medium text-[var(--muted)]"
          >
            {organization.name}
          </span>
        </div>
      )}

      <div className="ms-auto flex shrink-0 items-center gap-0.5 sm:gap-1">
        <NotificationsDropdown />
        <AccountMenu />
      </div>
    </header>
  );
}
