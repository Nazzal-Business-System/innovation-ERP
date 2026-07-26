/**
 * Optimistic create only prepends when the active list sort is newest-first.
 * Other sorts rely on reconcile/refetch for correct placement.
 */
export function isNewestFirstSort(sort: unknown): boolean {
  return sort === "NEWEST";
}

export function readQueryKeyString(queryKey: readonly unknown[], index: number): string | undefined {
  const value = queryKey[index];
  return typeof value === "string" && value.length > 0 ? value : undefined;
}

export function readQueryKeyPage(queryKey: readonly unknown[], index: number): number {
  const value = queryKey[index];
  return typeof value === "number" && Number.isFinite(value) ? value : 1;
}

export function matchesOptionalSearch(haystack: string, search: string | undefined): boolean {
  if (!search) return true;
  return haystack.toLowerCase().includes(search.toLowerCase());
}
