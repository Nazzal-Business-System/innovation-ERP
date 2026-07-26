/**
 * Shared utilities placeholder.
 * Domain helpers (money, dates, document numbers) will be added with ERP modules.
 */
export function isNonEmptyString(value: unknown): value is string {
  return typeof value === "string" && value.trim().length > 0;
}

export { hasPermission } from "./permissions";
export { inclusiveCalendarDays } from "./leave-days";
export {
  scoreSearchFields,
  looksLikeRecordCode,
  groupSearchResults,
  type SearchFieldKind,
  type SearchScoreField,
  type SearchScoreResult,
} from "./search-ranking";
export { searchNavigationCatalog } from "./navigation-search";
export {
  formatJodAmount,
  parseMoneyAmount,
  roundMoney,
  sumMoneyAmounts,
  toCanonicalMoneyString,
  type MoneyParseResult,
  type MoneySumResult,
} from "./money";
export {
  PRESENCE_AWAY_MS,
  PRESENCE_HEARTBEAT_INTERVAL_MS,
  PRESENCE_HEARTBEAT_THROTTLE_MS,
  PRESENCE_ONLINE_MS,
  buildUserPresence,
  derivePresenceStatus,
  presenceLabel,
  type PresenceStatus,
  type UserPresence,
} from "./presence";
