/**
 * Normalize transactional mutation failures for workspace UI.
 * Prefer the API's user-safe message; never surface stacks/paths.
 */
export function mapTransactionUiError(err: unknown, fallback: string): string {
  const message =
    typeof err === "object" &&
    err !== null &&
    "message" in err &&
    typeof (err as { message: unknown }).message === "string"
      ? (err as { message: string }).message.trim()
      : "";

  if (!message) return fallback;
  const looksInternal =
    /(?:[A-Z]:\\|\/(?:Users|home|var|app)\/|\.tsx?(?::\d+)?|Prisma|Sequelize|SQLSTATE|SELECT\s|INSERT\s|UPDATE\s|DELETE\s|constraint|stack trace|\n\s*at\s)/i.test(
      message
    );
  if (looksInternal) {
    return fallback;
  }
  return message;
}
