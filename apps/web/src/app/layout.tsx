import type { Metadata } from "next";
import { cookies } from "next/headers";
import { GeistSans } from "geist/font/sans";
import { APP_NAME } from "@ierp/shared";
import { Providers } from "@/components/providers";
import { ThemeInitScript } from "@/components/theme-init-script";
import { LOCALE_COOKIE_KEY, type Locale } from "@/lib/i18n/types";
import "./globals.css";

export const metadata: Metadata = {
  title: `${APP_NAME} | Nazzal Business System`,
  description: "Innovation ERP — integrated operations platform for growing businesses",
};

export default async function RootLayout({ children }: { children: React.ReactNode }) {
  const cookieStore = await cookies();
  const locale: Locale = cookieStore.get(LOCALE_COOKIE_KEY)?.value === "ar" ? "ar" : "en";
  const dir = locale === "ar" ? "rtl" : "ltr";

  return (
    <html lang={locale} dir={dir} className={GeistSans.className} suppressHydrationWarning>
      <head>
        <ThemeInitScript />
        {process.env.NODE_ENV === "development" ? (
          <style
            dangerouslySetInnerHTML={{
              __html: `nextjs-portal,nextjs-dev-tools-indicator{display:none!important;visibility:hidden!important;pointer-events:none!important;opacity:0!important;width:0!important;height:0!important;overflow:hidden!important}`,
            }}
          />
        ) : null}
      </head>
      <body className="bg-[var(--background)] font-sans antialiased">
        <Providers initialLocale={locale}>{children}</Providers>
      </body>
    </html>
  );
}
