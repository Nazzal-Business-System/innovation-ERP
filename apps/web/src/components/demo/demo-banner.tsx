import { DEMO_NOTICE } from "@ierp/shared";
import { Info } from "lucide-react";

export function DemoBanner() {
  return (
    <div
      className="relative shrink-0 overflow-hidden border-b border-[var(--border-subtle)] bg-gradient-to-r from-[var(--accent-muted)]/40 via-[var(--background-elevated)] to-[var(--background-elevated)] px-4 py-2"
      role="status"
    >
      <div className="mx-auto flex max-w-[1600px] items-center justify-center gap-2 text-center">
        <Info className="h-3.5 w-3.5 shrink-0 text-[var(--highlight)]" aria-hidden />
        <span className="text-xs text-[var(--muted)]">{DEMO_NOTICE}</span>
      </div>
    </div>
  );
}
