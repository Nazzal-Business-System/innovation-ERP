import path from "node:path";
import fs from "node:fs/promises";
import { existsSync, mkdirSync } from "node:fs";

const ALLOWED_MIME: Record<string, string> = {
  "image/jpeg": ".jpg",
  "image/png": ".png",
  "image/webp": ".webp",
};

export const AVATAR_MAX_BYTES = 2 * 1024 * 1024; // 2 MB

export function getStorageRoot(): string {
  return path.resolve(process.cwd(), "storage");
}

export function ensureStorageRoot(): void {
  const root = getStorageRoot();
  if (!existsSync(root)) mkdirSync(root, { recursive: true });
  const avatars = path.join(root, "avatars");
  if (!existsSync(avatars)) mkdirSync(avatars, { recursive: true });
}

export function avatarRelativePath(organizationId: string, userId: string, ext: string): string {
  return path.posix.join("avatars", organizationId, `${userId}${ext}`);
}

/** Employee photos share the same storage root, namespaced under `employees/`. */
export function employeeAvatarRelativePath(
  organizationId: string,
  employeeId: string,
  ext: string
): string {
  return path.posix.join("avatars", organizationId, "employees", `${employeeId}${ext}`);
}

export function resolveStoragePath(relativePath: string): string {
  const root = getStorageRoot();
  const absolute = path.resolve(root, relativePath);
  if (!absolute.startsWith(root)) {
    throw new Error("Invalid storage path");
  }
  return absolute;
}

export function extensionForMime(mimeType: string): string | null {
  return ALLOWED_MIME[mimeType] ?? null;
}

export function mimeForExtension(ext: string): string {
  const entry = Object.entries(ALLOWED_MIME).find(([, e]) => e === ext.toLowerCase());
  return entry?.[0] ?? "application/octet-stream";
}

export function decodeBase64Image(data: string): Buffer {
  const cleaned = data.includes(",") ? data.split(",").pop()! : data;
  return Buffer.from(cleaned, "base64");
}

export async function writeUserAvatar(input: {
  organizationId: string;
  userId: string;
  mimeType: string;
  buffer: Buffer;
  previousPath?: string | null;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  if (!ext) throw new Error("Unsupported image type");
  return writeAvatarFile({
    relativePath: avatarRelativePath(input.organizationId, input.userId, ext),
    mimeType: input.mimeType,
    buffer: input.buffer,
    previousPath: input.previousPath,
  });
}

export async function writeEmployeeAvatar(input: {
  organizationId: string;
  employeeId: string;
  mimeType: string;
  buffer: Buffer;
  previousPath?: string | null;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  if (!ext) throw new Error("Unsupported image type");
  return writeAvatarFile({
    relativePath: employeeAvatarRelativePath(input.organizationId, input.employeeId, ext),
    mimeType: input.mimeType,
    buffer: input.buffer,
    previousPath: input.previousPath,
  });
}

async function writeAvatarFile(input: {
  relativePath: string;
  mimeType: string;
  buffer: Buffer;
  previousPath?: string | null;
}): Promise<string> {
  const ext = extensionForMime(input.mimeType);
  if (!ext) throw new Error("Unsupported image type");
  if (input.buffer.byteLength === 0 || input.buffer.byteLength > AVATAR_MAX_BYTES) {
    throw new Error("Image exceeds size limit");
  }

  ensureStorageRoot();
  const absolute = resolveStoragePath(input.relativePath);
  await fs.mkdir(path.dirname(absolute), { recursive: true });

  if (input.previousPath && input.previousPath !== input.relativePath) {
    try {
      await fs.unlink(resolveStoragePath(input.previousPath));
    } catch {
      /* ignore missing */
    }
  }

  await fs.writeFile(absolute, input.buffer);
  return input.relativePath;
}

export async function deleteUserAvatar(relativePath: string | null | undefined): Promise<void> {
  if (!relativePath) return;
  try {
    await fs.unlink(resolveStoragePath(relativePath));
  } catch {
    /* ignore missing */
  }
}

export const deleteEmployeeAvatar = deleteUserAvatar;
