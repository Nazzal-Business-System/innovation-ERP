import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const statusBadgeVariants = cva(
  "inline-flex items-center gap-1.5 rounded-md border px-2 py-0.5 text-xs font-medium",
  {
    variants: {
      status: {
        active: "border-[var(--success)]/25 bg-[var(--success-bg)] text-[var(--success)]",
        pending: "border-[var(--warning)]/25 bg-[var(--warning-bg)] text-[var(--warning)]",
        inactive: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
        error: "border-[var(--destructive)]/25 bg-[var(--destructive-bg)] text-[var(--destructive)]",
        info: "border-[var(--info)]/25 bg-[var(--info-bg)] text-[var(--info)]",
        draft: "border-[var(--border)] bg-transparent text-[var(--muted)]",
      },
    },
    defaultVariants: {
      status: "active",
    },
  }
);

export interface StatusBadgeProps
  extends React.HTMLAttributes<HTMLSpanElement>,
    VariantProps<typeof statusBadgeVariants> {
  dot?: boolean;
  label?: string;
}

export function StatusBadge({
  className,
  status,
  dot = true,
  label,
  children,
  ...props
}: StatusBadgeProps) {
  return (
    <span className={cn(statusBadgeVariants({ status }), className)} {...props}>
      {dot && (
        <span
          className={cn(
            "h-1.5 w-1.5 rounded-full",
            status === "active" && "bg-[var(--success)]",
            status === "pending" && "bg-[var(--warning)]",
            status === "inactive" && "bg-[var(--muted)]",
            status === "error" && "bg-[var(--destructive)]",
            status === "info" && "bg-[var(--info)]",
            status === "draft" && "bg-[var(--muted)]"
          )}
          aria-hidden
        />
      )}
      {label ?? children}
    </span>
  );
}

export { statusBadgeVariants };
