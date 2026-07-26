import {
  EMPLOYEE_SETTINGS_HREF,
  PROFILE_HREF,
  SETTINGS_HREF,
} from "@/lib/nav-active";
import { isEmployeeSelfServiceUser } from "@/lib/auth-home-route";
import { canAccessSettings } from "@/lib/nav-permissions";

/** Role-aware destinations for the top-right account menu. */
export function resolveAccountSettingsHref(permissions: string[]): string {
  if (isEmployeeSelfServiceUser(permissions)) return EMPLOYEE_SETTINGS_HREF;
  if (canAccessSettings(permissions)) return SETTINGS_HREF;
  return EMPLOYEE_SETTINGS_HREF;
}

export function resolveAccountProfileHref(permissions: string[]): string {
  if (isEmployeeSelfServiceUser(permissions)) return "/dashboard/my-workspace/profile";
  return PROFILE_HREF;
}

export function resolveAppearanceHref(permissions: string[]): string {
  if (isEmployeeSelfServiceUser(permissions)) return `${EMPLOYEE_SETTINGS_HREF}#appearance`;
  if (canAccessSettings(permissions)) return "/dashboard/settings/appearance";
  return `${EMPLOYEE_SETTINGS_HREF}#appearance`;
}

export function resolveLanguageHref(permissions: string[]): string {
  if (isEmployeeSelfServiceUser(permissions)) return `${EMPLOYEE_SETTINGS_HREF}#language`;
  if (canAccessSettings(permissions)) return "/dashboard/settings/language";
  return `${EMPLOYEE_SETTINGS_HREF}#language`;
}

export function resolveNotificationPrefsHref(permissions: string[]): string {
  if (isEmployeeSelfServiceUser(permissions)) return `${EMPLOYEE_SETTINGS_HREF}#notifications`;
  if (canAccessSettings(permissions)) return "/dashboard/settings/notifications";
  return `${EMPLOYEE_SETTINGS_HREF}#notifications`;
}
