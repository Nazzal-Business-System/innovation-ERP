"use client";

import type { NotificationModule, NotificationType } from "@ierp/shared";
import {
  AlertCircle,
  AlertTriangle,
  BarChart3,
  Bell,
  BookOpen,
  FolderKanban,
  FolderOpen,
  Headphones,
  Calculator,
  CheckCircle2,
  Info,
  Package,
  ShoppingCart,
  Truck,
  Users,
  Wrench,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

export const TYPE_ICONS: Record<NotificationType, LucideIcon> = {
  INFO: Info,
  SUCCESS: CheckCircle2,
  WARNING: AlertTriangle,
  ERROR: AlertCircle,
};

export const MODULE_ICONS: Record<NotificationModule, LucideIcon> = {
  SYSTEM: Wrench,
  INVENTORY: Package,
  PROCUREMENT: Truck,
  SALES: ShoppingCart,
  ACCOUNTING: Calculator,
  HR: Users,
  REPORTS: BarChart3,
  PROJECTS: FolderKanban,
  SUPPORT: Headphones,
  DOCUMENTS: FolderOpen,
  KNOWLEDGE: BookOpen,
};

export function notificationTypeBadgeVariant(type: NotificationType): "default" | "secondary" | "outline" | "destructive" {
  switch (type) {
    case "SUCCESS":
      return "default";
    case "WARNING":
      return "secondary";
    case "ERROR":
      return "destructive";
    default:
      return "outline";
  }
}

export function NotificationTypeBadge({ type, label }: { type: NotificationType; label: string }) {
  return (
    <Badge variant={notificationTypeBadgeVariant(type)} className="text-[10px]">
      {label}
    </Badge>
  );
}

export function NotificationModuleIcon({
  module,
  className,
}: {
  module: NotificationModule;
  className?: string;
}) {
  const Icon = MODULE_ICONS[module] ?? Bell;
  return <Icon className={cn("h-4 w-4", className)} aria-hidden />;
}
