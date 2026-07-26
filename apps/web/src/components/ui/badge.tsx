import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-md border px-2 py-0.5 text-xs font-medium transition-colors",
  {
    variants: {
      variant: {
        default: "border-transparent bg-[var(--accent-muted)] text-[var(--accent)]",
        secondary: "border-[var(--border)] bg-[var(--muted-bg)] text-[var(--muted)]",
        outline: "border-[var(--border)] text-[var(--foreground)]",
        success: "border-transparent bg-[var(--success-bg)] text-[var(--success)]",
        warning: "border-transparent bg-[var(--warning-bg)] text-[var(--warning)]",
        destructive: "border-transparent bg-[var(--destructive-bg)] text-[var(--destructive)]",
        info: "border-transparent bg-[var(--info-bg)] text-[var(--info)]",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

export function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { badgeVariants };
