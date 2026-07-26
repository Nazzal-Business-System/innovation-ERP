import {
  BarChart3,
  FileText,
  Inbox,
  Package,
  type LucideIcon,
} from "lucide-react";
import { EmptyState } from "@/components/data-display/empty-state";

interface PresetProps {
  onAction?: () => void;
  className?: string;
}

function ModuleEmptyState({
  icon,
  title,
  description,
  actionLabel,
  onAction,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description: string;
  actionLabel: string;
  onAction?: () => void;
  className?: string;
}) {
  return (
    <EmptyState
      icon={icon}
      title={title}
      description={description}
      actionLabel={actionLabel}
      onAction={onAction}
      className={className}
    />
  );
}

export function NoProductsEmptyState({ onAction, className }: PresetProps) {
  return (
    <ModuleEmptyState
      icon={Package}
      title="No products yet"
      description="Add your first SKU to start tracking inventory, pricing, and stock across branches."
      actionLabel="Add product"
      onAction={onAction}
      className={className}
    />
  );
}

export function NoReportsEmptyState({ onAction, className }: PresetProps) {
  return (
    <ModuleEmptyState
      icon={BarChart3}
      title="No reports available"
      description="Reports will appear here once your modules have data. Try running a demo workflow first."
      actionLabel="Browse reports"
      onAction={onAction}
      className={className}
    />
  );
}

export function NoInvoicesEmptyState({ onAction, className }: PresetProps) {
  return (
    <ModuleEmptyState
      icon={FileText}
      title="No invoices found"
      description="Create your first invoice or import existing billing records to get started."
      actionLabel="Create invoice"
      onAction={onAction}
      className={className}
    />
  );
}

export function NoDataEmptyState({ onAction, className }: PresetProps) {
  return (
    <ModuleEmptyState
      icon={Inbox}
      title="No data to display"
      description="This view is empty. Adjust filters or add records to populate the table."
      actionLabel="Add record"
      onAction={onAction}
      className={className}
    />
  );
}
