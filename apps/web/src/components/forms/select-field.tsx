import { Loader2 } from "lucide-react";
import { selectClassName } from "@/lib/form-utils";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export function SelectField({
  label,
  id,
  value,
  onChange,
  options,
  placeholder,
  error,
  required,
  disabled,
  loading,
  loadingLabel,
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  options: Array<{ value: string; label: string }>;
  placeholder?: string;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  /** Disables the control and shows an inline spinner while a mutation is pending. */
  loading?: boolean;
  /** Accessible pending announcement (defaults to "Updating…"). */
  loadingLabel?: string;
  className?: string;
}) {
  const busy = Boolean(disabled || loading);
  const pendingText = loadingLabel?.trim() || "Updating…";

  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <div className="relative">
        <select
          id={id}
          value={value}
          disabled={busy}
          aria-busy={loading || undefined}
          aria-disabled={busy || undefined}
          onChange={(e) => onChange(e.target.value)}
          className={cn(
            selectClassName,
            busy && "cursor-not-allowed opacity-60",
            loading && "pe-10"
          )}
        >
          {placeholder && (
            <option value="" disabled>
              {placeholder}
            </option>
          )}
          {options.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
        {loading ? (
          <>
            <Loader2
              className="pointer-events-none absolute end-2.5 top-1/2 h-4 w-4 -translate-y-1/2 animate-spin text-[var(--muted)]"
              aria-hidden
            />
            <span className="sr-only" role="status">
              {pendingText}
            </span>
          </>
        ) : null}
      </div>
    </FormField>
  );
}
