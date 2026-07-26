"use client";

import { PanelLeftClose, PanelLeftOpen, PanelLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useI18n } from "@/lib/i18n";
import { useSidebarStore, type SidebarMode } from "@/lib/sidebar-store";
import { cn } from "@/lib/utils";

const MODES: SidebarMode[] = ["expanded", "collapsed", "auto"];

export function SidebarModeToggle({ className }: { className?: string }) {
  const { t } = useI18n();
  const mode = useSidebarStore((s) => s.mode);
  const setMode = useSidebarStore((s) => s.setMode);

  const Icon = mode === "collapsed" ? PanelLeftClose : mode === "auto" ? PanelLeft : PanelLeftOpen;

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button
          variant="ghost"
          size="icon"
          className={cn("hidden h-9 w-9 shrink-0 cursor-pointer lg:inline-flex", className)}
          aria-label={t("sidebar.mode")}
        >
          <Icon className="h-4 w-4" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="start" className="w-44">
        {MODES.map((m) => (
          <DropdownMenuItem
            key={m}
            className={cn("cursor-pointer text-sm", mode === m && "bg-[var(--accent-muted)]")}
            onClick={() => setMode(m)}
          >
            {t(`sidebar.mode.${m}`)}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
