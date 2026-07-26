import type { ReactNode } from "react";

/**
 * Case-insensitive highlight of the first query match. No HTML injection —
 * returns React nodes only.
 */
export function highlightMatch(text: string, query: string): ReactNode {
  if (!query.trim() || !text) return text;
  const lower = text.toLowerCase();
  const q = query.trim().toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-[var(--accent)]/25 px-0.5 font-semibold text-[var(--foreground)]">
        {text.slice(idx, idx + q.length)}
      </mark>
      {text.slice(idx + q.length)}
    </>
  );
}
