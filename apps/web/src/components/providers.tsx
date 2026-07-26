"use client";

import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthInitializer } from "@/components/auth/auth-initializer";
import { HideNextDevBadge } from "@/components/hide-next-dev-badge";
import { NavigationProvider } from "@/lib/navigation-context";
import { I18nProvider } from "@/lib/i18n";
import { AppearanceProvider } from "@/lib/appearance/provider";
import { AppQueryProvider } from "@/lib/query/provider";
import type { Locale } from "@/lib/i18n/types";

export function Providers({
  children,
  initialLocale = "en",
}: {
  children: React.ReactNode;
  initialLocale?: Locale;
}) {
  return (
    <I18nProvider initialLocale={initialLocale}>
      <AppearanceProvider>
        <AppQueryProvider>
          <TooltipProvider delayDuration={300}>
            <NavigationProvider>
              <AuthInitializer>
                <HideNextDevBadge />
                {children}
              </AuthInitializer>
            </NavigationProvider>
          </TooltipProvider>
        </AppQueryProvider>
      </AppearanceProvider>
    </I18nProvider>
  );
}
