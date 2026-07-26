import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";
import { Loader2 } from "lucide-react";
import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-all duration-200 ease-out focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)] disabled:pointer-events-none disabled:cursor-not-allowed disabled:opacity-50 active:scale-[0.98]",
  {
    variants: {
      variant: {
        default:
          "bg-[var(--accent)] text-[var(--accent-foreground)] shadow-sm hover:bg-[var(--accent-hover)]",
        secondary:
          "border border-[var(--border)] bg-[var(--card)] text-[var(--foreground)] hover:bg-[var(--muted-bg)] hover:border-[var(--border)] hover:shadow-sm",
        ghost:
          "text-[var(--muted)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--foreground)]",
        outline:
          "border border-[var(--accent)]/40 bg-transparent text-[var(--accent)] hover:bg-[var(--accent-muted)]",
        destructive:
          "bg-[var(--destructive)] text-[var(--destructive-foreground)] hover:opacity-90",
        link: "text-[var(--accent)] underline-offset-4 hover:underline",
      },
      size: {
        default: "h-10 px-4 py-2",
        sm: "h-8 rounded-md px-3 text-xs",
        lg: "h-11 rounded-lg px-6 text-base",
        icon: "h-10 w-10",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
);

export interface ButtonProps
  extends ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  loading?: boolean;
  loadingText?: string;
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      className,
      variant,
      size,
      asChild = false,
      loading = false,
      loadingText,
      disabled,
      children,
      ...props
    },
    ref
  ) => {
    if (asChild) {
      return (
        <Slot
          ref={ref}
          className={cn(buttonVariants({ variant, size }), className)}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    const isDisabled = Boolean(disabled || loading);
    const pendingLabel = loadingText?.trim() || null;

    return (
      <button
        ref={ref}
        className={cn(buttonVariants({ variant, size }), className)}
        disabled={isDisabled}
        aria-busy={loading || undefined}
        aria-disabled={isDisabled || undefined}
        {...props}
      >
        {/* Grid stacks idle + pending labels so width stays stable (no layout shift). */}
        <span className="grid items-center justify-items-center">
          <span
            className={cn(
              "col-start-1 row-start-1 inline-flex items-center justify-center gap-2",
              loading && "invisible"
            )}
            aria-hidden={loading || undefined}
          >
            {children}
          </span>
          {loading ? (
            <span className="col-start-1 row-start-1 inline-flex items-center justify-center gap-2">
              <Loader2 className="h-4 w-4 shrink-0 animate-spin" aria-hidden />
              <span>{pendingLabel ?? children}</span>
            </span>
          ) : null}
        </span>
        {loading ? (
          <span className="sr-only">
            {pendingLabel ?? "Loading"}
          </span>
        ) : null}
      </button>
    );
  }
);
Button.displayName = "Button";

export { buttonVariants };
