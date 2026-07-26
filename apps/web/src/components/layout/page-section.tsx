import { cn } from "@/lib/utils";

interface PageSectionProps {
  title?: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
  contentClassName?: string;
}

export function PageSection({
  title,
  description,
  actions,
  children,
  className,
  contentClassName,
}: PageSectionProps) {
  const hasHeader = title || description || actions;

  return (
    <section className={cn("ierp-page-section", className)}>
      {hasHeader && (
        <div className="mb-4 flex flex-col gap-3 sm:mb-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0 space-y-1">
            {title && (
              <h2 className="text-base font-semibold tracking-tight text-[var(--foreground)]">
                {title}
              </h2>
            )}
            {description && (
              <p className="max-w-2xl text-sm text-[var(--muted)]">{description}</p>
            )}
          </div>
          {actions && (
            <div className="flex shrink-0 flex-wrap items-center gap-2">{actions}</div>
          )}
        </div>
      )}
      <div className={cn(contentClassName)}>{children}</div>
    </section>
  );
}
