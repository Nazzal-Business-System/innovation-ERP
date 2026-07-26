import { z } from "zod";
import { AVATAR_MAX_BYTES } from "./avatar-storage.js";

export const updateProfileSchema = z.object({
  name: z.string().trim().min(1).max(120),
  phone: z
    .union([z.string().trim().max(40), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
  jobTitle: z
    .union([z.string().trim().max(120), z.literal(""), z.null()])
    .optional()
    .transform((v) => (v === "" || v === undefined ? null : v)),
});

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1),
    newPassword: z
      .string()
      .min(8, "Password must be at least 8 characters")
      .max(128)
      .regex(/[A-Za-z]/, "Password must include a letter")
      .regex(/[0-9]/, "Password must include a number"),
    confirmPassword: z.string().min(1),
  })
  .refine((v) => v.newPassword === v.confirmPassword, {
    message: "Passwords do not match",
    path: ["confirmPassword"],
  })
  .refine((v) => v.currentPassword !== v.newPassword, {
    message: "New password must be different from the current password",
    path: ["newPassword"],
  });

export const uploadAvatarSchema = z.object({
  mimeType: z.enum(["image/jpeg", "image/png", "image/webp"]),
  /** Raw base64 or data-URL; written to disk — never stored in the database. */
  data: z.string().min(1).max(Math.ceil(AVATAR_MAX_BYTES * 1.4) + 100),
});
