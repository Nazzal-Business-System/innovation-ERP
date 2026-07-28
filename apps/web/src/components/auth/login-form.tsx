"use client";

import { FormEvent, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  BarChart3,
  Building2,
  ChevronDown,
  Crown,
  Eye,
  EyeOff,
  Globe,
  LogIn,
  Lock,
  Mail,
  Package,
  ShoppingCart,
  Users,
  type LucideIcon,
} from "lucide-react";
import { API_VERSION, DEMO_CREDENTIALS, DEMO_PASSWORD } from "@ierp/shared";
import { EmployeeDemoLoginDialog } from "@/components/auth/employee-demo-login-dialog";
import { LoginIconInput } from "@/components/auth/login-icon-input";
import { LoginPreviewPanel } from "@/components/auth/login-preview-panel";
import { Button } from "@/components/ui/button";
import { resolveAuthorizedRedirect, resolveHomeRoute } from "@/lib/auth-home-route";
import { getStoredToken, useAuthStore } from "@/lib/auth-store";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

const REMEMBER_EMAIL_KEY = "ierp_login_remember_email";

const ROLE_ICONS: Record<string, LucideIcon> = {
  CEO: Crown,
  "Finance Manager": BarChart3,
  "Sales Manager": ShoppingCart,
  "Inventory Manager": Package,
  "HR Manager": Users,
  "Branch Manager": Building2,
};

const DEMO_ROLE_ORDER = [
  "CEO",
  "Finance Manager",
  "Sales Manager",
  "Inventory Manager",
  "HR Manager",
  "Branch Manager",
] as const;

export function LoginForm() {
  const router = useRouter();
  const { t, locale, setLocale } = useI18n();
  const login = useAuthStore((s) => s.login);
  const fetchMe = useAuthStore((s) => s.fetchMe);
  const loginLoading = useAuthStore((s) => s.loginLoading);
  const error = useAuthStore((s) => s.error);
  const clearError = useAuthStore((s) => s.clearError);
  const authReady = useAuthStore((s) => s.authReady);
  const initialized = useAuthStore((s) => s.initialized);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [rememberDevice, setRememberDevice] = useState(false);
  const [selectedDemo, setSelectedDemo] = useState<string | null>(null);
  const [redirecting, setRedirecting] = useState(false);
  const [forgotHint, setForgotHint] = useState<string | null>(null);
  const [employeeDialogOpen, setEmployeeDialogOpen] = useState(false);
  const sessionRestoreStarted = useRef(false);

  const isLoading = loginLoading || redirecting;
  const demoLoginEnabled =
    process.env.NEXT_PUBLIC_ENABLE_DEMO_LOGIN !== "false" &&
    process.env.NODE_ENV !== "production";

  const intendedRedirect = useMemo(() => {
    if (typeof window === "undefined") return null;
    try {
      const next = new URLSearchParams(window.location.search).get("next");
      return next && next.startsWith("/") ? next : null;
    } catch {
      return null;
    }
  }, []);

  const demoAccounts = useMemo(() => {
    const byRole = new Map(DEMO_CREDENTIALS.map((c) => [c.role, c]));
    return DEMO_ROLE_ORDER.map((role) => byRole.get(role)).filter(
      (c): c is (typeof DEMO_CREDENTIALS)[number] => Boolean(c)
    );
  }, []);

  useEffect(() => {
    router.prefetch("/dashboard");
    try {
      const saved = localStorage.getItem(REMEMBER_EMAIL_KEY);
      if (saved) {
        setEmail(saved);
        setRememberDevice(true);
      }
    } catch {
      /* ignore */
    }
  }, [router]);

  useEffect(() => {
    if (!initialized || redirecting || loginLoading) return;
    if (authReady) {
      setRedirecting(true);
      const permissions = useAuthStore.getState().permissions;
      router.replace(resolveAuthorizedRedirect(permissions, intendedRedirect));
      return;
    }
    const token = getStoredToken();
    if (!token || sessionRestoreStarted.current) return;
    sessionRestoreStarted.current = true;
    void fetchMe().then((ok) => {
      sessionRestoreStarted.current = false;
      if (ok) {
        setRedirecting(true);
        const permissions = useAuthStore.getState().permissions;
        router.replace(resolveAuthorizedRedirect(permissions, intendedRedirect));
      }
    });
  }, [initialized, authReady, redirecting, loginLoading, fetchMe, router, intendedRedirect]);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (isLoading) return;
    clearError();
    setForgotHint(null);
    setRedirecting(true);
    try {
      if (rememberDevice) {
        localStorage.setItem(REMEMBER_EMAIL_KEY, email.trim());
      } else {
        localStorage.removeItem(REMEMBER_EMAIL_KEY);
      }
      await login(email.trim(), password);
      const permissions = useAuthStore.getState().permissions;
      router.replace(resolveAuthorizedRedirect(permissions, intendedRedirect));
    } catch {
      setRedirecting(false);
    }
  }

  function quickFill(demoEmail: string) {
    if (isLoading) return;
    setEmail(demoEmail);
    setPassword(DEMO_PASSWORD);
    setSelectedDemo(demoEmail);
    setForgotHint(null);
    clearError();
  }

  async function handleEmployeeLogin(demoEmail: string, demoPassword: string) {
    if (isLoading) return;
    clearError();
    setForgotHint(null);
    setEmployeeDialogOpen(false);
    setRedirecting(true);
    try {
      await login(demoEmail, demoPassword);
      const permissions = useAuthStore.getState().permissions;
      router.replace(resolveHomeRoute(permissions));
    } catch {
      setRedirecting(false);
    }
  }

  return (
    <div className="ierp-login-screen relative flex h-full min-h-0 flex-1 flex-col overflow-hidden">
      <div className="ierp-login-ambient pointer-events-none absolute inset-0" aria-hidden />

      {/*
        Strict 100dvh fit: shell flex-1 min-h-0 + footer shrink-0.
        Page scrollbar was caused by shell min-heights + outer padding + footer
        exceeding the viewport; that is removed here.
      */}
      <div className="ierp-login-frame relative z-10 flex h-full min-h-0 flex-1 flex-col">
        <div
          className={cn(
            "ierp-login-shell mx-auto flex min-h-0 w-full max-w-[min(1520px,93vw)] flex-1 flex-col overflow-hidden",
            "rounded-[1.25rem] border border-white/[0.08]",
            "bg-[#080c18]/90 shadow-[0_24px_80px_rgba(0,0,0,0.5)]",
            /* ~61 / 39 ≈ 60–62% / 38–40% */
            "lg:grid lg:grid-cols-[minmax(0,1.56fr)_minmax(0,1fr)]"
          )}
        >
          <div className="hidden min-h-0 overflow-hidden lg:block">
            <LoginPreviewPanel className="h-full" />
          </div>

          <div className="flex min-h-0 flex-1 flex-col p-0 lg:p-2.5 lg:ps-0">
            <div className="ierp-login-panel flex min-h-0 flex-1 flex-col overflow-hidden lg:rounded-[1rem]">
              {/*
                Vertical balance: form block optically centered;
                role grid sits lower; security footer stays pinned.
              */}
              <div className="flex min-h-0 flex-1 flex-col overflow-y-auto overscroll-contain px-[clamp(1.25rem,2.2vw,2.25rem)] pt-[clamp(1rem,2.2vh,1.75rem)] lg:overflow-hidden">
                <div className="flex min-h-0 flex-1 flex-col">
                  <div className="flex flex-1 flex-col justify-center">
                    <div className="mb-3 lg:hidden">
                      <p className="text-[11px] font-semibold uppercase tracking-[0.2em] text-[#E94E77]">
                        Nazzal Business Systems
                      </p>
                      <h1 className="mt-1 text-xl font-bold text-white">
                        Innovation <span className="text-[#E94E77]">ERP</span>
                      </h1>
                    </div>

                    <h2 className="text-[clamp(1.4rem,1.8vw,1.75rem)] font-bold tracking-tight text-white">
                      {t("login.welcomeBack")}
                    </h2>
                    <p className="mt-1.5 text-sm leading-snug text-white/52">
                      {t("login.welcomeSubtitle")}
                    </p>

                    <form
                      onSubmit={(e) => void handleSubmit(e)}
                      className="mt-[clamp(1rem,1.8vh,1.35rem)] space-y-[clamp(0.75rem,1.4vh,1rem)]"
                      aria-busy={isLoading}
                      noValidate
                    >
                      <div className="space-y-1.5">
                        <label
                          htmlFor="email"
                          className="block text-[13px] font-medium text-white/80"
                        >
                          {t("login.email")}
                        </label>
                        <LoginIconInput
                          id="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => {
                            setEmail(e.target.value);
                            setSelectedDemo(null);
                          }}
                          placeholder="ceo@nazzal.demo"
                          required
                          disabled={isLoading}
                          aria-invalid={Boolean(error) || undefined}
                          leadingIcon={<Mail className="h-4 w-4" aria-hidden />}
                        />
                      </div>

                      <div className="space-y-1.5">
                        <label
                          htmlFor="password"
                          className="block text-[13px] font-medium text-white/80"
                        >
                          {t("login.password")}
                        </label>
                        <LoginIconInput
                          id="password"
                          type={showPassword ? "text" : "password"}
                          autoComplete="current-password"
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          required
                          disabled={isLoading}
                          aria-invalid={Boolean(error) || undefined}
                          leadingIcon={<Lock className="h-4 w-4" aria-hidden />}
                          trailing={
                            <button
                              type="button"
                              className="flex h-8 w-8 cursor-pointer items-center justify-center rounded-md text-white/40 transition-colors hover:text-white/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50 disabled:cursor-not-allowed disabled:opacity-50"
                              onClick={() => setShowPassword((v) => !v)}
                              aria-label={
                                showPassword
                                  ? t("login.hidePassword")
                                  : t("login.showPassword")
                              }
                              disabled={isLoading}
                            >
                              {showPassword ? (
                                <EyeOff className="h-4 w-4" aria-hidden />
                              ) : (
                                <Eye className="h-4 w-4" aria-hidden />
                              )}
                            </button>
                          }
                        />
                      </div>

                      <div className="flex items-center justify-between gap-3">
                        <label className="inline-flex cursor-pointer items-center gap-2.5 text-[13px] leading-none text-white/70">
                          <input
                            type="checkbox"
                            checked={rememberDevice}
                            onChange={(e) => setRememberDevice(e.target.checked)}
                            disabled={isLoading}
                            className="relative top-px h-3.5 w-3.5 shrink-0 cursor-pointer rounded border-white/25 accent-[#E94E77] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50"
                          />
                          {t("login.rememberDevice")}
                        </label>
                        <button
                          type="button"
                          className="cursor-pointer text-[13px] font-medium leading-none text-[#E94E77] transition-colors hover:text-[#ff6b8a] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50"
                          onClick={() => setForgotHint(t("login.forgotPasswordHint"))}
                          disabled={isLoading}
                        >
                          {t("login.forgotPassword")}
                        </button>
                      </div>

                      {(error || forgotHint) && (
                        <div
                          className={cn(
                            "rounded-lg border px-3 py-2 text-sm",
                            error
                              ? "border-rose-400/25 bg-rose-500/10 text-rose-200"
                              : "border-white/10 bg-white/5 text-white/70"
                          )}
                          role={error ? "alert" : "status"}
                        >
                          {error ?? forgotHint}
                        </div>
                      )}

                      <Button
                        type="submit"
                        className="ierp-login-submit h-[clamp(2.65rem,4.2vh,2.9rem)] w-full gap-2 text-sm font-semibold"
                        loading={isLoading}
                        loadingText={
                          redirecting ? t("login.redirecting") : t("login.signingIn")
                        }
                      >
                        {t("login.submit")}
                        {!isLoading ? <LogIn className="h-4 w-4" aria-hidden /> : null}
                      </Button>
                    </form>
                  </div>

                  <div className="shrink-0 pb-[clamp(0.65rem,1.4vh,1rem)] pt-[clamp(1rem,2vh,1.35rem)]">
                    <div className="mb-2.5 flex items-center gap-3">
                      <div className="h-px flex-1 bg-white/10" />
                      <p className="shrink-0 text-[11px] text-white/42">
                        {t("login.orContinueAs")}
                      </p>
                      <div className="h-px flex-1 bg-white/10" />
                    </div>

                    <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 sm:gap-2">
                      {demoAccounts.map((cred) => {
                        const Icon = ROLE_ICONS[cred.role] ?? Crown;
                        const active = selectedDemo === cred.email;
                        return (
                          <button
                            key={cred.email}
                            type="button"
                            disabled={isLoading}
                            onClick={() => quickFill(cred.email)}
                            aria-label={`${t("login.quickFill")}: ${cred.role}`}
                            aria-pressed={active}
                            className={cn(
                              "group flex cursor-pointer items-center gap-2 rounded-xl border px-2.5 py-2 text-start transition-all sm:px-3 sm:py-2.5",
                              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50",
                              "disabled:pointer-events-none disabled:opacity-40",
                              active
                                ? "border-[#E94E77]/45 bg-[#E94E77]/12"
                                : "border-white/10 bg-white/[0.03] hover:border-white/18 hover:bg-white/[0.06]"
                            )}
                          >
                            <Icon
                              className={cn(
                                "h-3.5 w-3.5 shrink-0",
                                active
                                  ? "text-[#ff7a96]"
                                  : "text-[#E94E77]/90 group-hover:text-[#ff7a96]"
                              )}
                              aria-hidden
                            />
                            <span className="truncate text-[12px] font-medium leading-none text-white/90 sm:text-[13px]">
                              {cred.role}
                            </span>
                          </button>
                        );
                      })}
                    </div>

                    {demoLoginEnabled ? (
                      <button
                        type="button"
                        disabled={isLoading}
                        onClick={() => setEmployeeDialogOpen(true)}
                        className={cn(
                          "mt-2.5 flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-dashed border-white/15 px-3 py-2.5 text-sm font-medium text-white/85",
                          "transition-colors hover:border-[#E94E77]/40 hover:bg-[#E94E77]/10",
                          "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50",
                          "disabled:pointer-events-none disabled:opacity-40"
                        )}
                      >
                        <Users className="h-4 w-4 text-[#E94E77]" aria-hidden />
                        {t("login.loginAsEmployee", "Login as employee")}
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>

              <div className="flex shrink-0 items-center justify-between gap-3 border-t border-white/[0.08] px-[clamp(1.25rem,2.2vw,2.25rem)] py-[clamp(0.7rem,1.3vh,0.9rem)]">
                <p className="inline-flex min-w-0 items-center gap-2 text-[11px] text-white/55 sm:text-xs">
                  <Lock className="h-3.5 w-3.5 shrink-0 text-white/50" aria-hidden />
                  <span className="truncate leading-none">{t("login.encryptedNotice")}</span>
                </p>
                <p className="shrink-0 text-[11px] tabular-nums leading-none text-white/48 sm:text-xs">
                  {t("login.version").replace("{version}", API_VERSION)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="mt-[clamp(0.5rem,1.2vh,0.75rem)] flex shrink-0 flex-wrap items-center justify-center gap-x-5 gap-y-1.5">
          <p className="text-center text-[11px] text-white/45 sm:text-xs">
            {t("login.copyright")}
          </p>
          <div
            className="inline-flex items-center gap-3"
            role="group"
            aria-label={t("login.language")}
          >
            <button
              type="button"
              className={cn(
                "inline-flex cursor-pointer items-center gap-1.5 text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50 sm:text-xs",
                locale === "en" ? "text-white/80" : "text-white/45 hover:text-white/70"
              )}
              onClick={() => setLocale("en")}
              aria-pressed={locale === "en"}
            >
              <Globe className="h-3.5 w-3.5" aria-hidden />
              English
              <ChevronDown className="h-3 w-3 opacity-60" aria-hidden />
            </button>
            <button
              type="button"
              className={cn(
                "cursor-pointer text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#E94E77]/50 sm:text-xs",
                locale === "ar" ? "text-white/80" : "text-white/45 hover:text-white/70"
              )}
              onClick={() => setLocale("ar")}
              aria-pressed={locale === "ar"}
            >
              العربية
            </button>
          </div>
        </footer>
      </div>

      <EmployeeDemoLoginDialog
        open={employeeDialogOpen}
        onOpenChange={setEmployeeDialogOpen}
        onSelect={(emailAddr, pwd) => {
          void handleEmployeeLogin(emailAddr, pwd);
        }}
        disabled={isLoading}
      />
    </div>
  );
}
