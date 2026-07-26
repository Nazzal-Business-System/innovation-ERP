/**
 * Shared conventions for ActionBar → Dialog entity Edit flows (Phase 4.1):
 * - Prefer Dialog over always-visible edit sections (Sheet unused for entity edit).
 * - Seed form values from the current entity when opening.
 * - Block dialog close while the mutation is submitting.
 * - Close on success; keep draft values + show mapped error on failure.
 * - Pass pre-formatted display strings into EntityAudit / field grids.
 *
 * Pages should call `shouldAllowEditDialogClose` from Dialog `onOpenChange`.
 */

/** Returns false when the user tries to dismiss while a save is in flight. */
export function shouldAllowEditDialogClose(submitting: boolean, nextOpen: boolean): boolean {
  if (submitting && !nextOpen) return false;
  return true;
}
