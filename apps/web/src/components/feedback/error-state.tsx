import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";

interface ErrorStateProps {
  title?: string;
  description?: string;
  onRetry?: () => void;
  className?: string;
}

export function ErrorState({
  title = "Something went wrong",
  description = "An unexpected error occurred. Please try again.",
  onRetry,
  className,
}: ErrorStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-4 rounded-[var(--radius-lg)] border border-[var(--destructive)]/20 bg-[var(--destructive-bg)] px-6 py-12 text-center",
        className
      )}
      role="alert"
    >
      <div className="flex h-11 w-11 items-center justify-center rounded-xl border border-[var(--destructive)]/20 bg-[var(--card)]">
        <AlertCircle className="h-5 w-5 text-[var(--destructive)]" aria-hidden />
      </div>
      <div>
        <p className="text-sm font-semibold text-[var(--foreground)]">{title}</p>
        <p className="mt-1 max-w-sm text-sm text-[var(--muted)]">{description}</p>
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" className="cursor-pointer" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}
