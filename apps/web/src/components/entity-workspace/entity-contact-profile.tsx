"use client";

import type { ReactNode } from "react";
import { Mail, MapPin, Phone, User } from "lucide-react";
import { cn } from "@/lib/utils";
import { useI18n } from "@/lib/i18n";

export type ContactMethod = {
  id: string;
  kind: "email" | "phone" | "location" | "other";
  label: string;
  value: string | null | undefined;
  href?: string;
};

export type ContactMetaItem = {
  id: string;
  label: string;
  value: ReactNode;
  mono?: boolean;
};

/**
 * Compact contact/profile composition for master-data workspaces.
 * Groups identity, contact methods, and commercial terms without one-card-per-field sprawl.
 */
export function EntityContactProfile({
  contactName,
  typeLabel,
  status,
  code,
  methods,
  terms,
  className,
}: {
  contactName?: string | null;
  typeLabel?: string | null;
  status?: ReactNode;
  code?: string | null;
  methods: ContactMethod[];
  terms?: ContactMetaItem[];
  className?: string;
}) {
  const { t } = useI18n();
  const visibleMethods = methods.filter((m) => m.value);

  return (
    <div className={cn("ew-contact-profile space-y-4", className)}>
      <div className="ew-contact-identity flex flex-wrap items-start justify-between gap-3 border-b border-[var(--border-subtle)] pb-3">
        <div className="min-w-0 space-y-1">
          <p className="flex items-center gap-2 text-sm font-semibold text-[var(--foreground)]">
            <User className="h-4 w-4 shrink-0 text-[var(--muted)]" aria-hidden />
            <span className="truncate">{contactName?.trim() || t("masterData.noContactName")}</span>
          </p>
          <div className="flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-[var(--muted)]">
            {typeLabel ? <span>{typeLabel}</span> : null}
            {typeLabel && code ? <span aria-hidden>·</span> : null}
            {code ? (
              <span className="ew-ltr-isolate font-mono text-[11px]">{code}</span>
            ) : null}
          </div>
        </div>
        {status ? <div className="shrink-0">{status}</div> : null}
      </div>

      <div>
        <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
          {t("masterData.contactMethods")}
        </p>
        {visibleMethods.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">{t("masterData.noContactMethods")}</p>
        ) : (
          <ul className="ew-contact-methods divide-y divide-[var(--border-subtle)] rounded-lg border border-[var(--border-subtle)]">
            {visibleMethods.map((method) => {
              const Icon =
                method.kind === "email"
                  ? Mail
                  : method.kind === "phone"
                    ? Phone
                    : method.kind === "location"
                      ? MapPin
                      : User;
              const content = (
                <>
                  <Icon className="mt-0.5 h-3.5 w-3.5 shrink-0 text-[var(--muted)]" aria-hidden />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[10px] font-medium uppercase tracking-wide text-[var(--muted)]">
                      {method.label}
                    </span>
                    <span
                      className={cn(
                        "block truncate text-sm text-[var(--foreground)]",
                        method.kind === "email" || method.kind === "phone"
                          ? "ew-ltr-isolate"
                          : undefined
                      )}
                    >
                      {method.value}
                    </span>
                  </span>
                </>
              );
              return (
                <li key={method.id}>
                  {method.href ? (
                    <a
                      href={method.href}
                      className="flex cursor-pointer items-start gap-2.5 px-3 py-2.5 transition-colors hover:bg-[var(--muted-bg)]/50"
                    >
                      {content}
                    </a>
                  ) : (
                    <div className="flex items-start gap-2.5 px-3 py-2.5">{content}</div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {terms && terms.length > 0 ? (
        <div>
          <p className="mb-2 text-[10px] font-semibold uppercase tracking-wide text-[var(--muted)]">
            {t("masterData.commercialTerms")}
          </p>
          <dl className="ew-contact-terms grid gap-2 sm:grid-cols-2">
            {terms.map((item) => (
              <div
                key={item.id}
                className="flex min-w-0 items-baseline justify-between gap-3 rounded-md bg-[var(--muted-bg)]/35 px-3 py-2"
              >
                <dt className="shrink-0 text-xs text-[var(--muted)]">{item.label}</dt>
                <dd
                  className={cn(
                    "min-w-0 truncate text-sm font-medium text-[var(--foreground)]",
                    item.mono && "ew-ltr-isolate font-mono text-xs"
                  )}
                  title={typeof item.value === "string" ? item.value : undefined}
                >
                  {item.value ?? "—"}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      ) : null}
    </div>
  );
}
