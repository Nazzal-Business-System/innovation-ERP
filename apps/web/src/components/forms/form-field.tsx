import { cn } from "@/lib/utils";

export function FormField({
  label,
  htmlFor,
  error,
  hint,
  required,
  children,
  className,
}: {
  label: string;
  htmlFor?: string;
  error?: string;
  hint?: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("space-y-1.5", className)}>
      <label htmlFor={htmlFor} className="block text-sm font-medium text-[var(--foreground)]">
        {label}
        {required && <span className="ms-1 text-[var(--destructive)]">*</span>}
      </label>
      {children}
      {hint && !error && <p className="text-xs text-[var(--muted)]">{hint}</p>}
      {error && (
        <p className="text-xs text-[var(--destructive)]" role="alert">
          {error}
        </p>
      )}
    </div>
  );
}
