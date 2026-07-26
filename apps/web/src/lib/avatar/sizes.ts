/**
 * Shared avatar size tokens.
 * Presence dots and camera buttons scale from these.
 */
export type AvatarSize = "xs" | "sm" | "md" | "lg" | "xl";

export const AVATAR_SIZE_CLASS: Record<AvatarSize, string> = {
  xs: "h-6 w-6 text-[10px]",
  sm: "h-8 w-8 text-xs",
  md: "h-10 w-10 text-sm",
  lg: "h-12 w-12 text-base",
  xl: "h-20 w-20 text-xl sm:h-24 sm:w-24 sm:text-2xl",
};

export const AVATAR_PRESENCE_SIZE: Record<AvatarSize, "sm" | "md"> = {
  xs: "sm",
  sm: "sm",
  md: "sm",
  lg: "md",
  xl: "md",
};

export const AVATAR_CAMERA_CLASS: Record<AvatarSize, string> = {
  xs: "h-5 w-5",
  sm: "h-6 w-6",
  md: "h-7 w-7",
  lg: "h-8 w-8",
  xl: "h-10 w-10",
};

export function initialsFromDisplayName(name?: string | null): string {
  if (!name?.trim()) return "?";
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return `${parts[0]![0] ?? ""}${parts[parts.length - 1]![0] ?? ""}`.toUpperCase();
}
