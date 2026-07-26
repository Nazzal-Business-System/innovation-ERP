"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { isErpOverlayPortalTarget } from "@/components/forms/date-picker-portal";
import { cn } from "@/lib/utils";

export const Sheet = DialogPrimitive.Root;
export const SheetTrigger = DialogPrimitive.Trigger;
export const SheetClose = DialogPrimitive.Close;
export const SheetPortal = DialogPrimitive.Portal;

export function SheetOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-erp-overlay="sheet"
      className={cn(
        "fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm",
        "data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

interface SheetContentProps extends React.ComponentProps<typeof DialogPrimitive.Content> {
  side?: "left" | "right";
}

export function SheetContent({
  className,
  children,
  side = "right",
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,
  onEscapeKeyDown,
  ...props
}: SheetContentProps) {
  return (
    <SheetPortal>
      <SheetOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed z-50 flex flex-col gap-4 border border-[var(--border-subtle)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)] transition ease-in-out",
          side === "right" && "inset-y-0 right-0 h-full w-full max-w-sm border-l",
          side === "left" && "inset-y-0 left-0 h-full w-full max-w-sm border-r",
          className
        )}
        onPointerDownOutside={(event) => {
          if (isErpOverlayPortalTarget(event.target)) {
            event.preventDefault();
          }
          onPointerDownOutside?.(event);
        }}
        onInteractOutside={(event) => {
          if (isErpOverlayPortalTarget(event.target)) {
            event.preventDefault();
          }
          onInteractOutside?.(event);
        }}
        onFocusOutside={(event) => {
          if (isErpOverlayPortalTarget(event.target)) {
            event.preventDefault();
          }
          onFocusOutside?.(event);
        }}
        onEscapeKeyDown={(event) => {
          if (
            document.querySelector(
              `[data-erp-datepicker-portal], [data-erp-source-combobox-portal]`
            )
          ) {
            event.preventDefault();
          }
          onEscapeKeyDown?.(event);
        }}
        {...props}
      >
        {children}
        <DialogPrimitive.Close className="ierp-focus-ring absolute right-4 top-4 cursor-pointer rounded-md p-1 text-[var(--muted)] opacity-70 transition-opacity hover:bg-[var(--muted-bg)] hover:opacity-100">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </SheetPortal>
  );
}

export function SheetHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("flex flex-col gap-1.5", className)} {...props} />;
}

export function SheetTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return <DialogPrimitive.Title className={cn("text-lg font-semibold", className)} {...props} />;
}

export function SheetDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-sm text-[var(--muted)]", className)} {...props} />
  );
}
