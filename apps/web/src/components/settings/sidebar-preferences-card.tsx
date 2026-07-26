"use client";

import { ArrowDown, ArrowUp, Pin, PinOff, Trash2 } from "lucide-react";
import { getNavItemById } from "@ierp/shared";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { useAuthStore } from "@/lib/auth-store";
import { useI18n, useNavLabel } from "@/lib/i18n";
import {
  selectVisiblePins,
  useSidebarPinsStore,
} from "@/lib/sidebar-pins-store";
import { cn } from "@/lib/utils";

function PinRowLabel({ itemId }: { itemId: string }) {
  const label = useNavLabel(itemId);
  return <>{label}</>;
}

/** Appearance settings — manage personal sidebar pins. */
export function SidebarPreferencesCard() {
  const { t } = useI18n();
  const permissions = useAuthStore((s) => s.permissions);
  const showPinnedSection = useSidebarPinsStore((s) => s.showPinnedSection);
  const sidebarPins = useSidebarPinsStore((s) => s.sidebarPins);
  const setShowPinnedSection = useSidebarPinsStore((s) => s.setShowPinnedSection);
  const movePin = useSidebarPinsStore((s) => s.movePin);
  const unpinItem = useSidebarPinsStore((s) => s.unpinItem);
  const clearPins = useSidebarPinsStore((s) => s.clearPins);
  const syncing = useSidebarPinsStore((s) => s.syncing);

  const visible = selectVisiblePins(sidebarPins, permissions);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t("appearance.sidebarPrefs", "Sidebar preferences")}</CardTitle>
        <CardDescription>
          {t(
            "appearance.sidebarPrefsDesc",
            "Pin frequent destinations for quick access. Pins sync to your account."
          )}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <label className="flex cursor-pointer items-center justify-between gap-3 rounded-lg border border-[var(--border-subtle)] px-3 py-2.5">
          <span className="text-sm font-medium">
            {t("appearance.showPinnedSection", "Show Pinned section")}
          </span>
          <input
            type="checkbox"
            className="h-4 w-4 cursor-pointer accent-[var(--accent)]"
            checked={showPinnedSection}
            onChange={(e) => setShowPinnedSection(e.target.checked)}
          />
        </label>

        {visible.length === 0 ? (
          <p className="text-sm text-[var(--muted)]">
            {t(
              "appearance.noPins",
              "No pinned items yet. Hover a sidebar link and click the pin icon."
            )}
          </p>
        ) : (
          <ul className="space-y-1">
            {visible.map((pin, index) => {
              const item = getNavItemById(pin.id);
              if (!item) return null;
              return (
                <li
                  key={pin.id}
                  className={cn(
                    "flex items-center gap-2 rounded-lg border border-[var(--border-subtle)] bg-[var(--muted-bg)]/30 px-2 py-1.5"
                  )}
                >
                  <Pin className="h-3.5 w-3.5 shrink-0 text-[var(--accent)]" aria-hidden />
                  <span className="min-w-0 flex-1 truncate text-sm font-medium">
                    <PinRowLabel itemId={pin.id} />
                  </span>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === 0 || syncing}
                    aria-label={t("nav.moveUp", "Move up")}
                    onClick={() => movePin(pin.id, "up")}
                  >
                    <ArrowUp className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={index === visible.length - 1 || syncing}
                    aria-label={t("nav.moveDown", "Move down")}
                    onClick={() => movePin(pin.id, "down")}
                  >
                    <ArrowDown className="h-3.5 w-3.5" />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-7 w-7"
                    disabled={syncing}
                    aria-label={t("nav.unpin", "Unpin")}
                    onClick={() => unpinItem(pin.id)}
                  >
                    <PinOff className="h-3.5 w-3.5" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}

        {visible.length > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="cursor-pointer gap-2"
            disabled={syncing}
            onClick={() => clearPins()}
          >
            <Trash2 className="h-3.5 w-3.5" />
            {t("nav.clearPins", "Clear all pins")}
          </Button>
        ) : null}
      </CardContent>
    </Card>
  );
}
