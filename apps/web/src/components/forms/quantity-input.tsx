import { inputClassName } from "@/lib/form-utils";
import { cn } from "@/lib/utils";
import { FormField } from "./form-field";

export function QuantityInput({
  label,
  id,
  value,
  onChange,
  error,
  required,
  disabled,
  min = 1,
  className,
}: {
  label: string;
  id: string;
  value: string;
  onChange: (value: string) => void;
  error?: string;
  required?: boolean;
  disabled?: boolean;
  min?: number;
  className?: string;
}) {
  return (
    <FormField label={label} htmlFor={id} error={error} required={required} className={className}>
      <input
        id={id}
        type="number"
        min={min}
        step={1}
        value={value}
        disabled={disabled}
        onChange={(e) => onChange(e.target.value)}
        className={cn(inputClassName, "tabular-nums", disabled && "cursor-not-allowed opacity-60")}
      />
    </FormField>
  );
}
