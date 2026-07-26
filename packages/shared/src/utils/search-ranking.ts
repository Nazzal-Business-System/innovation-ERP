/**
 * Weighted relevance scoring for global ERP search.
 * Higher = better. Exact code/number beats title; body matches rank lowest.
 */

export type SearchFieldKind = "code" | "title" | "related" | "body" | "status";

export interface SearchScoreField {
  /** Stable field name for matchedField (e.g. "sku", "name"). */
  field: string;
  value: string | null | undefined;
  kind: SearchFieldKind;
}

export interface SearchScoreResult {
  score: number;
  matchedField?: string;
  matchedSnippet?: string;
}

const KIND_BASE: Record<SearchFieldKind, number> = {
  code: 20,
  title: 12,
  related: 4,
  status: 2,
  body: 0,
};

function snippetAround(text: string, query: string, max = 80): string {
  const lower = text.toLowerCase();
  const q = query.toLowerCase();
  const idx = lower.indexOf(q);
  if (idx < 0) {
    return text.length > max ? `${text.slice(0, max - 1)}…` : text;
  }
  const start = Math.max(0, idx - 16);
  const end = Math.min(text.length, idx + q.length + 40);
  let out = text.slice(start, end);
  if (start > 0) out = `…${out}`;
  if (end < text.length) out = `${out}…`;
  return out.length > max ? `${out.slice(0, max - 1)}…` : out;
}

function fieldScore(query: string, tokens: string[], value: string, kind: SearchFieldKind): number {
  const f = value.toLowerCase();
  const q = query.toLowerCase();
  let base = 0;

  if (f === q) base = 100;
  else if (f.startsWith(q)) base = 88;
  else if (tokens.length > 1 && tokens.every((t) => f.includes(t))) base = 72;
  else if (f.includes(q)) base = 58;
  else {
    let tokenHit = 0;
    for (const t of tokens) {
      if (f.startsWith(t)) tokenHit = Math.max(tokenHit, 48);
      else if (f.includes(t)) tokenHit = Math.max(tokenHit, 36);
    }
    base = tokenHit;
  }

  if (base <= 0) return 0;
  return Math.min(120, base + KIND_BASE[kind]);
}

/**
 * Score a candidate against the query using weighted fields.
 * Returns 0 when nothing matches.
 */
export function scoreSearchFields(query: string, fields: SearchScoreField[]): SearchScoreResult {
  const q = query.trim();
  if (!q) return { score: 0 };

  const tokens = q
    .toLowerCase()
    .split(/[\s,/|]+/)
    .map((t) => t.trim())
    .filter((t) => t.length > 0);

  let best = 0;
  let matchedField: string | undefined;
  let matchedSnippet: string | undefined;

  for (const field of fields) {
    if (!field.value?.trim()) continue;
    const score = fieldScore(q, tokens, field.value, field.kind);
    if (score > best) {
      best = score;
      matchedField = field.field;
      matchedSnippet = snippetAround(field.value, q);
    }
  }

  return { score: best, matchedField, matchedSnippet };
}

/** Detect likely document/record codes (SO-2026, PO-, INV-, EMP-, JE-, FMCG…). */
export function looksLikeRecordCode(query: string): boolean {
  const q = query.trim();
  if (q.length < 2) return false;
  if (/^[A-Za-z]{1,6}-\d/.test(q)) return true;
  if (/^[A-Za-z]{2,}-\d{2,}/.test(q)) return true;
  if (/\d{3,}/.test(q) && /[A-Za-z]/.test(q)) return true;
  return false;
}

export function groupSearchResults<T extends { module: string; score: number }>(
  results: T[],
  labels: Record<string, string>,
  order: string[]
): Array<{ module: T["module"]; label: string; results: T[]; totalInGroup: number }> {
  const map = new Map<string, T[]>();
  for (const r of results) {
    const list = map.get(r.module) ?? [];
    list.push(r);
    map.set(r.module, list);
  }

  const modules = [...map.keys()].sort((a, b) => {
    const ai = order.indexOf(a);
    const bi = order.indexOf(b);
    return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
  });

  return modules.map((module) => {
    const items = (map.get(module) ?? []).sort((a, b) => b.score - a.score);
    return {
      module: module as T["module"],
      label: labels[module] ?? module,
      results: items,
      totalInGroup: items.length,
    };
  });
}
