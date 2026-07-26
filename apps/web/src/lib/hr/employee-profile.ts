export const EMPLOYEE_AVATAR_MAX_BYTES = 2 * 1024 * 1024;
export const EMPLOYEE_AVATAR_TYPES = ["image/jpeg", "image/png", "image/webp"] as const;

export type EmployeeAvatarMime = (typeof EMPLOYEE_AVATAR_TYPES)[number];

export function isEmployeeAvatarMime(value: string): value is EmployeeAvatarMime {
  return (EMPLOYEE_AVATAR_TYPES as readonly string[]).includes(value);
}

/** Formats hire-date tenure like "2y 3m" or "8 months". */
export function formatEmployeeTenure(hireDate: string, now = new Date()): string {
  const start = new Date(`${hireDate.slice(0, 10)}T12:00:00Z`);
  if (Number.isNaN(start.getTime())) return "—";

  let months =
    (now.getUTCFullYear() - start.getUTCFullYear()) * 12 +
    (now.getUTCMonth() - start.getUTCMonth());
  if (now.getUTCDate() < start.getUTCDate()) months -= 1;
  if (months < 0) months = 0;

  const years = Math.floor(months / 12);
  const remMonths = months % 12;
  if (years === 0 && remMonths === 0) return "< 1 month";
  if (years === 0) return `${remMonths} mo`;
  if (remMonths === 0) return `${years}y`;
  return `${years}y ${remMonths}mo`;
}

export function initialsFromEmployeeName(name?: string | null): string {
  if (!name?.trim()) return "?";
  return name
    .trim()
    .split(/\s+/)
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

export function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result ?? ""));
    reader.onerror = () => reject(new Error("Unable to read file"));
    reader.readAsDataURL(file);
  });
}
