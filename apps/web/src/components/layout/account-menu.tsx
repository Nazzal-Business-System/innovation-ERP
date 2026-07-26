"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import {
  Bell,
  Languages,
  LogOut,
  Palette,
  Settings2,
  UserRound,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { PresenceBadge } from "@/components/presence/presence-badge";
import { SidebarUserSummary } from "@/components/layout/sidebar-user-summary";
import {
  resolveAccountProfileHref,
  resolveAccountSettingsHref,
  resolveAppearanceHref,
  resolveLanguageHref,
  resolveNotificationPrefsHref,
} from "@/lib/account-settings";
import { markPresenceOffline } from "@/lib/presence-api";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function AccountMenu() {
  const { t } = useI18n();
  const user = useAuthStore((s) => s.user);
  const permissions = useAuthStore((s) => s.permissions);
  const logout = useAuthStore((s) => s.logout);
  const [signingOut, setSigningOut] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => setMounted(true), []);

  const profileHref = resolveAccountProfileHref(permissions);
  const settingsHref = resolveAccountSettingsHref(permissions);
  const appearanceHref = resolveAppearanceHref(permissions);
  const languageHref = resolveLanguageHref(permissions);
  const notificationsHref = resolveNotificationPrefsHref(permissions);

  async function handleSignOut() {
    if (signingOut) return;
    setSigningOut(true);
    try {
      await markPresenceOffline();
    } finally {
      logout();
      window.location.href = "/login";
    }
  }

  if (!mounted) {
    return (
      <Button
        variant="ghost"
        className="h-9 cursor-pointer gap-0 rounded-lg px-2 hover:bg-[var(--muted-bg)]"
        aria-label={t("topbar.accountMenu", "Account menu")}
        disabled
      >
        <SidebarUserSummary showPresence />
      </Button>
    );
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          className={cn(
            "h-9 cursor-pointer gap-0 rounded-lg px-2 hover:bg-[var(--muted-bg)]",
            "data-[state=open]:bg-[var(--muted-bg)] focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
          )}
          aria-label={t("topbar.accountMenu", "Account menu")}
        >
          <SidebarUserSummary showPresence />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-64" sideOffset={8}>
        <DropdownMenuLabel className="font-normal">
          <div className="flex items-start gap-2.5">
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium text-[var(--foreground)]">
                {user?.name}
              </p>
              <p className="truncate text-xs text-[var(--muted)]">{user?.email}</p>
              <div className="mt-1.5">
                <PresenceBadge
                  lastSeenAt={user?.lastSeenAt}
                  lastActiveAt={user?.lastActiveAt}
                  showLabel
                />
              </div>
            </div>
          </div>
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={profileHref} className="flex items-center gap-2">
            <UserRound className="h-4 w-4 opacity-70" aria-hidden />
            {t("topbar.myProfile", "My Profile")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={settingsHref} className="flex items-center gap-2">
            <Settings2 className="h-4 w-4 opacity-70" aria-hidden />
            {t("topbar.settings", "Settings")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={appearanceHref} className="flex items-center gap-2">
            <Palette className="h-4 w-4 opacity-70" aria-hidden />
            {t("topbar.appearance", "Appearance / Theme")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={languageHref} className="flex items-center gap-2">
            <Languages className="h-4 w-4 opacity-70" aria-hidden />
            {t("topbar.language", "Language")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuItem asChild className="cursor-pointer">
          <Link href={notificationsHref} className="flex items-center gap-2">
            <Bell className="h-4 w-4 opacity-70" aria-hidden />
            {t("topbar.notificationPrefs", "Notification Preferences")}
          </Link>
        </DropdownMenuItem>
        <DropdownMenuSeparator />
        <DropdownMenuItem
          className="cursor-pointer text-[var(--destructive)] focus:text-[var(--destructive)]"
          disabled={signingOut}
          onSelect={(e) => {
            e.preventDefault();
            void handleSignOut();
          }}
        >
          <LogOut className="h-4 w-4 opacity-70" aria-hidden />
          {signingOut ? t("common.loading", "Loading…") : t("nav.signOut", "Sign out")}
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
