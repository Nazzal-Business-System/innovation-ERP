import { inputClassName } from "@/lib/form-utils";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export function MoneyInput({
  label,
  id,
  value,
  onChange,
  error,
  required,
  disabled,
  max,
  hint,
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  max?: number;
  hint?: string;
  className?: string;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} hint={hint} className={className}>
      <div className="relative">
        <span className="pointer-events-none absolute inset-y-0 start-0 flex items-center ps-3 text-xs text-[var(--muted)]">
          JOD
        </span>
        <input
          id={id}
          type="number"
          min={0}
          max={max}
          step="0.01"
          value={value}
          disabled={disabled}
          onChange={(e) => onChange(e.target.value)}
          className={cn(inputClassName, "ps-11 tabular-nums", disabled && "cursor-not-allowed opacity-60")}
        />
      </div>
    </FormField>
  );
}
