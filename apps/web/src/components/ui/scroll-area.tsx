"use client";

import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area";
import { cn } from "@/lib/utils";

interface ScrollAreaProps extends React.ComponentProps<typeof ScrollAreaPrimitive.Root> {
  dir?: "ltr" | "rtl";
}

export function ScrollArea({ className, children, dir, ...props }: ScrollAreaProps) {
  return (
    <ScrollAreaPrimitive.Root className={cn("relative overflow-hidden", className)} dir={dir} {...props}>
      <ScrollAreaPrimitive.Viewport
        dir={dir}
        className="h-full w-full rounded-[inherit] [direction:inherit]"
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar dir={dir} />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  );
}

export function ScrollBar({
  className,
  orientation = "vertical",
  dir,
  ...props
}: React.ComponentProps<typeof ScrollAreaPrimitive.ScrollAreaScrollbar> & {
  dir?: "ltr" | "rtl";
}) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation={orientation}
      dir={dir}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" && "h-full w-2 border-s border-s-transparent p-px",
        orientation === "horizontal" && "h-2 flex-col border-t border-t-transparent p-px",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-[var(--border)]" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  );
}
