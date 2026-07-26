/** Compact relative time for activity feeds (server-side, en). */
export function formatRelativeTime(date: Date | string | null | undefined): string {
  if (!date) return "—";
  const d = typeof date === "string" ? new Date(date) : date;
  if (Number.isNaN(d.getTime())) return "—";
  const diffSec = Math.round((Date.now() - d.getTime()) / 1000);
  const abs = Math.abs(diffSec);
  if (abs < 60) return "Just now";
  const mins = Math.round(diffSec / 60);
  if (Math.abs(mins) < 60) return `${Math.abs(mins)}m ago`;
  const hours = Math.round(mins / 60);
  if (Math.abs(hours) < 24) return `${Math.abs(hours)}h ago`;
  const days = Math.round(hours / 24);
  if (Math.abs(days) === 1) return "Yesterday";
  if (Math.abs(days) < 30) return `${Math.abs(days)}d ago`;
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}
