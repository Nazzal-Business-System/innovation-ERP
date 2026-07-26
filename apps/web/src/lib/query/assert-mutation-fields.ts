/**
 * Defensive checks so success UI is not shown when the API silently ignores
 * critical workflow/status fields.
 */

export class MutationFieldMismatchError extends Error {
  readonly field: string;
  readonly expected: unknown;
  readonly actual: unknown;

  constructor(context: string, field: string, expected: unknown, actual: unknown) {
    super(
      `${context}: expected ${field}=${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`
    );
    this.name = "MutationFieldMismatchError";
    this.field = field;
    this.expected = expected;
    this.actual = actual;
  }
}

export type CriticalFieldExpectations = Record<string, unknown>;

/**
 * Assert that the mutation response entity matches critical expected fields
 * (id, status, stage, isArchived, isActive, assignee ids, etc.).
 * Throws MutationFieldMismatchError on mismatch.
 */
export function assertMutationFields(
  actual: Record<string, unknown> | null | undefined,
  expected: CriticalFieldExpectations,
  context: string
): void {
  if (!actual || typeof actual !== "object") {
    const err = new MutationFieldMismatchError(context, "(entity)", "object", actual);
    if (process.env.NODE_ENV === "development") {
      console.error("[mutation]", err.message);
    }
    throw err;
  }

  for (const [field, expectedValue] of Object.entries(expected)) {
    if (expectedValue === undefined) continue;
    const actualValue = actual[field];
    if (!Object.is(actualValue, expectedValue)) {
      const err = new MutationFieldMismatchError(context, field, expectedValue, actualValue);
      if (process.env.NODE_ENV === "development") {
        console.error("[mutation]", err.message, { actual });
      }
      throw err;
    }
  }
}

/** Narrow helper when the response is a typed entity with an id. */
export function assertMutationEntity<T extends { id: string }>(
  actual: T,
  expected: Partial<T> & { id: string },
  context: string
): void {
  assertMutationFields(
    actual as unknown as Record<string, unknown>,
    expected as CriticalFieldExpectations,
    context
  );
}
