import type { EntityAction, ResolvedEntityActions } from "./types";

function hasCapability(
  capability: string | undefined,
  capabilities: ReadonlySet<string> | readonly string[] | undefined
): boolean {
  if (!capability) return true;
  if (!capabilities) return true;
  if (capabilities instanceof Set) return capabilities.has(capability);
  return (capabilities as readonly string[]).includes(capability);
}

export function filterEntityActions(
  actions: readonly EntityAction[],
  capabilities?: ReadonlySet<string> | readonly string[]
): EntityAction[] {
  return actions.filter((action) => {
    if (action.hidden) return false;
    return hasCapability(action.capability, capabilities);
  });
}

/**
 * Partition visible actions into primary / secondary / overflow / destructive.
 * When `forceOverflow` is true (narrow viewports), secondary actions move to overflow.
 */
export function resolveEntityActions(
  actions: readonly EntityAction[],
  options?: {
    capabilities?: ReadonlySet<string> | readonly string[];
    maxVisibleSecondary?: number;
    forceOverflow?: boolean;
  }
): ResolvedEntityActions {
  const visible = filterEntityActions(actions, options?.capabilities);
  const maxSecondary = options?.maxVisibleSecondary ?? 3;
  const forceOverflow = options?.forceOverflow ?? false;

  let primary: EntityAction | null = null;
  const secondaryAll: EntityAction[] = [];
  const overflow: EntityAction[] = [];
  const destructive: EntityAction[] = [];

  for (const action of visible) {
    if (action.kind === "primary") {
      if (!primary) primary = action;
      else overflow.push({ ...action, kind: "overflow" });
      continue;
    }
    if (action.kind === "destructive") {
      destructive.push(action);
      continue;
    }
    if (action.kind === "overflow") {
      overflow.push(action);
      continue;
    }
    secondaryAll.push(action);
  }

  if (forceOverflow) {
    return {
      primary,
      secondary: [],
      overflow: [...secondaryAll, ...overflow],
      destructive,
    };
  }

  const secondary = secondaryAll.slice(0, maxSecondary);
  const overflowSecondary = secondaryAll.slice(maxSecondary);

  return {
    primary,
    secondary,
    overflow: [...overflowSecondary, ...overflow],
    destructive,
  };
}
