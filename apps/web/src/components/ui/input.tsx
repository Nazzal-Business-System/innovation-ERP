import { forwardRef, type InputHTMLAttributes } from "react";
import { controlSizeClass, type ControlSize } from "@/lib/form-utils";
import { cn } from "@/lib/utils";

export interface InputProps extends InputHTMLAttributes<HTMLInputElement> {
  controlSize?: ControlSize;
}

export const Input = forwardRef<HTMLInputElement, InputProps>(
  ({ className, type = "text", controlSize = "default", ...props }, ref) => (
    <input
      ref={ref}
      type={type}
      className={cn(
        "box-border w-full rounded-lg border border-[var(--input)] bg-[var(--card)] text-[var(--foreground)] shadow-sm transition-[border-color,box-shadow]",
        "py-0 leading-none placeholder:text-[var(--muted-foreground)] placeholder:leading-none",
        "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[var(--ring)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--background)]",
        "disabled:cursor-not-allowed disabled:opacity-50",
        controlSizeClass[controlSize],
        className
      )}
      {...props}
    />
  )
);
Input.displayName = "Input";
