"use client";

import { useEffect, useMemo, useState } from "react";
import { Loader2, Search, UserRound } from "lucide-react";
import type { DemoEmployeeLoginOption } from "@ierp/shared";
import { DEMO_PASSWORD } from "@ierp/shared";
import { Button } from "@/components/ui/button";
import { PersonAvatar } from "@/components/avatar/person-avatar";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { getApiBaseUrl } from "@/lib/api-client";
import { useI18n } from "@/lib/i18n";
import { cn } from "@/lib/utils";

export function EmployeeDemoLoginDialog({
  open,
  onOpenChange,
  onSelect,
  disabled,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSelect: (email: string, password: string) => void;
  disabled?: boolean;
}) {
  const { t } = useI18n();
  const [search, setSearch] = useState("");
  const [debounced, setDebounced] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rows, setRows] = useState<DemoEmployeeLoginOption[]>([]);

  useEffect(() => {
    const timer = setTimeout(() => setDebounced(search.trim()), 250);
    return () => clearTimeout(timer);
  }, [search]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    async function load() {
      setLoading(true);
      setError(null);
      try {
        const qs = debounced ? `?search=${encodeURIComponent(debounced)}` : "";
        const res = await fetch(`${getApiBaseUrl()}/api/auth/demo-employees${qs}`);
        if (!res.ok) {
          throw new Error(
            res.status === 404
              ? t("login.employeeDemoUnavailable", "Employee demo login is unavailable.")
              : t("login.employeeDemoFailed", "Unable to load employees.")
          );
        }
        const json = (await res.json()) as { data: DemoEmployeeLoginOption[] };
        if (!cancelled) setRows(json.data ?? []);
      } catch (err) {
        if (!cancelled) {
          setRows([]);
          setError(err instanceof Error ? err.message : t("login.employeeDemoFailed"));
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, [open, debounced, t]);

  const empty = !loading && !error && rows.length === 0;

  const title = useMemo(() => t("login.loginAsEmployee", "Login as employee"), [t]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-hidden p-0">
        <DialogHeader className="border-b border-[var(--border-subtle)] px-5 py-4">
          <DialogTitle>{title}</DialogTitle>
          <DialogDescription>
            {t(
              "login.loginAsEmployeeDesc",
              "Choose a regular employee demo account. Credentials are filled securely — passwords are never shown."
            )}
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 px-5 py-4">
          <div className="relative">
            <Search
              className="pointer-events-none absolute start-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--muted)]"
              aria-hidden
            />
            <input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={t(
                "login.employeeSearch",
                "Search name, number, department, or position"
              )}
              className="h-10 w-full rounded-lg border border-[var(--border-subtle)] bg-[var(--background)] pe-3 ps-9 text-sm outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)]"
              aria-label={t("login.employeeSearch", "Search employees")}
              disabled={disabled}
            />
          </div>

          <div className="max-h-[50vh] overflow-y-auto rounded-xl border border-[var(--border-subtle)]">
            {loading ? (
              <div className="flex items-center justify-center gap-2 px-4 py-10 text-sm text-[var(--muted)]">
                <Loader2 className="h-4 w-4 animate-spin" aria-hidden />
                {t("common.loading")}
              </div>
            ) : null}

            {error ? (
              <p className="px-4 py-8 text-center text-sm text-[var(--destructive)]">{error}</p>
            ) : null}

            {empty ? (
              <div className="flex flex-col items-center gap-2 px-4 py-10 text-center text-sm text-[var(--muted)]">
                <UserRound className="h-5 w-5" aria-hidden />
                {t("login.employeeEmpty", "No matching employees")}
              </div>
            ) : null}

            {!loading && !error
              ? rows.map((row) => (
                  <button
                    key={row.userId}
                    type="button"
                    disabled={disabled}
                    onClick={() => {
                      onSelect(row.email, DEMO_PASSWORD);
                      onOpenChange(false);
                    }}
                    className={cn(
                      "flex w-full items-center gap-3 border-b border-[var(--border-subtle)] px-3 py-3 text-start last:border-b-0",
                      "hover:bg-[var(--muted-bg)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[var(--ring)]",
                      disabled && "cursor-not-allowed opacity-60"
                    )}
                  >
                    <PersonAvatar
                      name={row.fullName}
                      source={{ kind: "none" }}
                      size="sm"
                      presence={false}
                      lazy={false}
                    />
                    <span className="min-w-0 flex-1">
                      <span className="flex items-center gap-2">
                        <span className="truncate text-sm font-medium text-[var(--foreground)]">
                          {row.fullName}
                        </span>
                      </span>
                      <span className="mt-0.5 block truncate text-xs text-[var(--muted)]">
                        <span className="ew-ltr-isolate font-mono">{row.employeeNumber}</span>
                        {" · "}
                        {row.department}
                        {" · "}
                        {row.position}
                      </span>
                      <span className="block truncate text-xs text-[var(--muted)]">
                        {row.workLocation}
                      </span>
                    </span>
                  </button>
                ))
              : null}
          </div>

          <div className="flex justify-end">
            <Button type="button" variant="secondary" onClick={() => onOpenChange(false)}>
              {t("form.cancel")}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
