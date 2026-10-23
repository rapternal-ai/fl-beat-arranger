import { ArrangementPlan, OverrideEntry } from "../schema";

/**
 * Toggle a single cell in the override list. Returns a new override array:
 * if the override already exists it is flipped/removed; otherwise added.
 */
export function toggleOverride(
  overrides: OverrideEntry[],
  channelId: string,
  startBar: number,
  currentlyActive: boolean,
): OverrideEntry[] {
  const key = `${channelId}@${startBar}`;
  const existing = overrides.find((o) => `${o.channelId}@${o.startBar}` === key);
  if (!existing) {
    return [...overrides, { channelId, startBar, active: !currentlyActive }];
  }
  // Cell is already overridden; toggling reverts to the generated state.
  return overrides.filter((o) => o !== existing);
}

export function findOverride(
  plan: ArrangementPlan,
  channelId: string,
  startBar: number,
): OverrideEntry | undefined {
  return plan.overrides.find((o) => o.channelId === channelId && o.startBar === startBar);
}
