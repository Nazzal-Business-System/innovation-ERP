"use client";

import * as DialogPrimitive from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import { isErpOverlayPortalTarget } from "@/components/forms/date-picker-portal";
import { cn } from "@/lib/utils";

export const Dialog = DialogPrimitive.Root;
export const DialogTrigger = DialogPrimitive.Trigger;
export const DialogPortal = DialogPrimitive.Portal;
export const DialogClose = DialogPrimitive.Close;

export function DialogOverlay({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Overlay>) {
  return (
    <DialogPrimitive.Overlay
      data-erp-overlay="dialog"
      className={cn(
        "fixed inset-0 z-50 bg-[var(--overlay)] backdrop-blur-sm data-[state=open]:animate-in data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=open]:fade-in-0",
        className
      )}
      {...props}
    />
  );
}

export function DialogContent({
  className,
  children,
  onPointerDownOutside,
  onInteractOutside,
  onFocusOutside,
  onEscapeKeyDown,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Content>) {
  return (
    <DialogPortal>
      <DialogOverlay />
      <DialogPrimitive.Content
        className={cn(
          "fixed left-1/2 top-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 border border-[var(--border-subtle)] bg-[var(--card)] p-6 shadow-[var(--shadow-lg)] duration-200 sm:rounded-xl",
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
        <DialogPrimitive.Close className="absolute end-4 top-4 cursor-pointer rounded-md p-1 text-[var(--muted)] opacity-70 transition-opacity hover:opacity-100 focus:outline-none focus:ring-2 focus:ring-[var(--ring)]">
          <X className="h-4 w-4" />
          <span className="sr-only">Close</span>
        </DialogPrimitive.Close>
      </DialogPrimitive.Content>
    </DialogPortal>
  );
}

export function DialogHeader({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-1.5 text-center sm:text-start", className)} {...props} />
  );
}

export function DialogFooter({ className, ...props }: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "flex flex-col-reverse gap-3 sm:flex-row sm:items-center sm:justify-end sm:gap-3",
        className
      )}
      {...props}
    />
  );
}

export function DialogTitle({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Title>) {
  return (
    <DialogPrimitive.Title
      className={cn("text-lg font-semibold leading-none tracking-tight", className)}
      {...props}
    />
  );
}

export function DialogDescription({
  className,
  ...props
}: React.ComponentProps<typeof DialogPrimitive.Description>) {
  return (
    <DialogPrimitive.Description className={cn("text-sm text-[var(--muted)]", className)} {...props} />
  );
}
