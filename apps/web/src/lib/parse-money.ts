export function parseMoney(value: string): number {
  const cleaned = value.replace(/[^0-9.-]/g, "");
  return Number(cleaned) || 0;
}
