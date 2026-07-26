import { CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

interface SuccessStateProps {
  title?: string;
  description?: string;
  className?: string;
}

export function SuccessState({
  title = "Success",
  description,
  className,
}: SuccessStateProps) {
  return (
    <div
      className={cn(
        "flex flex-col items-center justify-center gap-3 rounded-xl border border-[var(--success)]/20 bg-[var(--success-bg)] px-6 py-10 text-center",
        className
      )}
      role="status"
    >
      <CheckCircle2 className="h-10 w-10 text-[var(--success)]" aria-hidden />
      <div>
        <p className="font-semibold text-[var(--foreground)]">{title}</p>
        {description && <p className="mt-1 text-sm text-[var(--muted)]">{description}</p>}
      </div>
    </div>
  );
}
