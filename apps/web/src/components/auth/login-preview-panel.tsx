"use client";

import Image from "next/image";
import {
  Building2,
  Package,
  Shield,
  UserRound,
  Users,
  Warehouse,
  type LucideIcon,
} from "lucide-react";
import { useEffect, useState } from "react";
import type { LoginPreviewMetric, LoginPreviewResponse } from "@ierp/shared";
import { DEMO_ORGANIZATION_NAME } from "@ierp/shared";
import { apiFetch } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

/** Approved full-bleed left-panel artwork */
export const LOGIN_HERO_SRC = "/media/login/earth-space-login-hero.png";

const METRIC_ICONS: Record<LoginPreviewMetric["id"], LucideIcon> = {
  branches: Building2,
  employees: Users,
  customers: UserRound,
  warehouses: Warehouse,
  products: Package,
};

const METRIC_LABEL_KEYS: Record<LoginPreviewMetric["id"], string> = {
  branches: "login.preview.branches",
  employees: "login.preview.employees",
  customers: "login.preview.customers",
  warehouses: "login.preview.warehouses",
  products: "login.preview.products",
};

function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 32 32"
      className={cn("h-7 w-7 shrink-0", className)}
      aria-hidden
    >
      <path
        d="M16 2.5 28.5 9.5v13L16 29.5 3.5 22.5v-13L16 2.5Z"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
      />
      <circle cx="16" cy="16" r="3.25" fill="currentColor" />
    </svg>
  );
}

export function LoginPreviewPanel({ className }: { className?: string }) {
  const { t } = useI18n();
  const [preview, setPreview] = useState<LoginPreviewResponse | null>(null);

  useEffect(() => {
    let cancelled = false;
    void apiFetch<LoginPreviewResponse>("/auth/login-preview", { skipAuth: true })
      .then((data) => {
        if (!cancelled) setPreview(data);
      })
      .catch(() => {
        if (!cancelled) {
          setPreview({
            organizationName: DEMO_ORGANIZATION_NAME,
            organizationSlug: "al-noor-trading",
            status: "unavailable",
            metrics: [],
          });
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const orgName = preview?.organizationName ?? DEMO_ORGANIZATION_NAME;
  const metrics = preview?.metrics ?? [];
  const operational = preview?.status === "operational";

  return (
    <div
      className={cn(
        "relative flex h-full min-h-0 flex-col overflow-hidden text-white",
        className
      )}
    >
      {/* Full-panel cover — position tuned so Earth/horizon/sunrise match blueprint */}
      <Image
        src={LOGIN_HERO_SRC}
        alt={t("login.heroImageAlt")}
        fill
        priority
        sizes="(max-width: 1024px) 0px, 62vw"
        className="ierp-login-hero-img pointer-events-none select-none object-cover"
      />

      {/* Directional readability — top-left text only; Earth/sunrise stay bright */}
      <div
        className="ierp-login-hero-overlay pointer-events-none absolute inset-0"
        aria-hidden
      />

      <div className="relative z-10 flex h-full min-h-0 flex-col px-[clamp(1.5rem,2.2vw,2.75rem)] py-[clamp(1.25rem,2vh,2.25rem)]">
        <div className="flex items-center gap-3 text-[#E94E77]">
          <BrandMark />
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] sm:text-xs">
            Nazzal Business Systems
          </p>
        </div>

        <div className="mt-[clamp(1.35rem,2.8vh,2rem)] max-w-[34rem]">
          <h1 className="text-[clamp(2rem,2.6vw,3.05rem)] font-bold leading-[1.05] tracking-tight">
            <span className="text-white">Innovation </span>
            <span className="bg-gradient-to-r from-[#ff6b8a] to-[#c084fc] bg-clip-text font-semibold text-transparent">
              ERP
            </span>
          </h1>
          <p className="mt-[clamp(0.55rem,1vh,0.85rem)] max-w-[30rem] text-[clamp(0.9rem,1.05vw,1rem)] leading-relaxed text-white/78">
            {t("login.heroTagline")}
          </p>
        </div>

        {/* KPI sits higher over Earth; inset so it clears the brightest horizon */}
        <div className="mt-auto space-y-[clamp(0.65rem,1.2vh,1rem)] px-[clamp(0.35rem,1.4vw,1.15rem)] pb-[clamp(0.35rem,1vh,0.65rem)] pt-[clamp(1.25rem,3vh,2.25rem)]">
          <div className="w-full rounded-2xl border border-white/14 bg-[#0a0f1c]/48 px-[clamp(0.85rem,1.2vw,1.15rem)] py-[clamp(0.85rem,1.3vh,1.15rem)] shadow-[0_16px_40px_rgba(0,0,0,0.32)] backdrop-blur-xl">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate text-[13px] text-white/85 sm:text-sm">
                <span className="text-white/70">{t("login.preview.live")}</span>
                <span className="text-white/40"> • </span>
                <span className="font-medium text-white">{orgName}</span>
              </p>
              <span
                className={cn(
                  "inline-flex shrink-0 items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-medium",
                  operational
                    ? "bg-emerald-500/15 text-emerald-300"
                    : "bg-white/[0.08] text-white/55"
                )}
              >
                <span
                  className={cn(
                    "h-1.5 w-1.5 rounded-full",
                    operational
                      ? "bg-emerald-400 shadow-[0_0_6px_rgba(52,211,153,0.9)]"
                      : "bg-white/40"
                  )}
                  aria-hidden
                />
                {operational
                  ? t("login.preview.operational")
                  : t("login.preview.unavailable")}
              </span>
            </div>

            {metrics.length > 0 ? (
              <div
                className="grid gap-2"
                style={{
                  gridTemplateColumns: `repeat(${Math.min(metrics.length, 5)}, minmax(0, 1fr))`,
                }}
              >
                {metrics.map((metric) => {
                  const Icon = METRIC_ICONS[metric.id];
                  return (
                    <div
                      key={metric.id}
                      className="rounded-xl border border-white/10 bg-white/[0.04] px-2 py-2.5 text-center sm:px-2.5 sm:py-3"
                    >
                      <Icon
                        className="mx-auto mb-1.5 h-4 w-4 text-cyan-300/90"
                        aria-hidden
                      />
                      <p className="text-base font-bold tabular-nums tracking-tight text-white sm:text-lg">
                        {metric.value.toLocaleString()}
                      </p>
                      <p className="mt-0.5 text-[10px] leading-tight text-cyan-100/55 sm:text-[11px]">
                        {t(METRIC_LABEL_KEYS[metric.id], metric.label)}
                      </p>
                    </div>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-white/50">{t("login.preview.metricsPending")}</p>
            )}
          </div>

          <div className="flex items-center gap-2.5 px-0.5">
            <Shield
              className="h-4 w-4 shrink-0 text-[#E94E77]"
              aria-hidden
            />
            <p className="text-[12px] leading-snug sm:text-[13px]">
              <span className="font-semibold text-white">
                {t("login.securityTitle")}
              </span>{" "}
              <span className="text-white/58">{t("login.securityHint")}</span>
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
