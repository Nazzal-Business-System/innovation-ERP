import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function FormActions({
  onCancel,
  cancelLabel,
  submitLabel,
  loading,
  loadingLabel,
  disabled,
  className,
}: {
  onCancel?: () => void;
  cancelLabel: string;
  submitLabel: string;
  loading?: boolean;
  loadingLabel?: string;
  disabled?: boolean;
  className?: string;
}) {
  return (
    <div className={cn("flex flex-col-reverse gap-3 border-t border-[var(--border-subtle)] pt-4 sm:flex-row sm:items-center sm:justify-end sm:gap-3", className)}>
      {onCancel && (
        <Button type="button" variant="secondary" className="cursor-pointer" onClick={onCancel} disabled={loading}>
          {cancelLabel}
        </Button>
      )}
      <Button type="submit" className="cursor-pointer" loading={loading} loadingText={loadingLabel ?? "Saving…"} disabled={disabled || loading}>
        {submitLabel}
      </Button>
    </div>
  );
}
