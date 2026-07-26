/** Markers for portaled overlays that dialogs/sheets must treat as in-layer. */
export const DATE_PICKER_PORTAL_ATTR = "data-erp-datepicker-portal";
export const SOURCE_COMBOBOX_PORTAL_ATTR = "data-erp-source-combobox-portal";

export function isDatePickerPortalTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest(`[${DATE_PICKER_PORTAL_ATTR}]`));
}

export function isErpOverlayPortalTarget(target: EventTarget | null | undefined): boolean {
  if (!(target instanceof Element)) return false;
  return Boolean(
    target.closest(`[${DATE_PICKER_PORTAL_ATTR}], [${SOURCE_COMBOBOX_PORTAL_ATTR}]`)
  );
}
