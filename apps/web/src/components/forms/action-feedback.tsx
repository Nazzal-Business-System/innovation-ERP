import { CheckCircle2, XCircle } from "lucide-react";
import { cn } from "@/lib/utils";

export function ActionFeedback({
  success,
  error,
  className,
}: {
  success?: string | null;
  error?: string | null;
  className?: string;
}) {
  if (!success && !error) return null;

  if (success) {
    return (
      <div
        className={cn(
          "flex items-start gap-2 rounded-lg border border-[var(--success)]/30 bg-[var(--success-bg)] px-4 py-3 text-sm text-[var(--success)]",
          className
        )}
        role="status"
      >
        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
        <span>{success}</span>
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex items-start gap-2 rounded-lg border border-[var(--destructive)]/30 bg-[var(--destructive-bg)] px-4 py-3 text-sm text-[var(--destructive)]",
        className
      )}
      role="alert"
    >
      <XCircle className="mt-0.5 h-4 w-4 shrink-0" aria-hidden />
      <span>{error}</span>
    </div>
  );
}
