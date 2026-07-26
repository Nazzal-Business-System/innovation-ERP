import { cn } from "@/lib/utils";

interface PageHeaderProps {
  title: string;
  description?: string;
  eyebrow?: string;
  actions?: React.ReactNode;
  badge?: React.ReactNode;
  className?: string;
}

export function PageHeader({
  title,
  description,
  eyebrow,
  actions,
  badge,
  className,
}: PageHeaderProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-4 border-b border-[var(--border-subtle)] pb-5 sm:flex-row sm:items-start sm:justify-between sm:pb-6",
        className
      )}
    >
      <div className="min-w-0 space-y-1.5">
        {eyebrow && (
          <p className="text-[11px] font-medium uppercase tracking-[0.12em] text-[var(--muted-foreground)]">
            {eyebrow}
          </p>
        )}
        <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
          <h1 className="text-2xl font-semibold tracking-tight text-[var(--foreground)] sm:text-[1.75rem]">
            {title}
          </h1>
          {badge}
        </div>
        {description && (
          <p className="max-w-2xl text-sm leading-relaxed text-[var(--muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>}
    </header>
  );
}
