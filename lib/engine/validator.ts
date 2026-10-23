import { ArrangementPlan, arrangementPlanSchema, isBlockStart, sectionIdForStartBar } from "../schema";
import { BLOCK_COUNT, VERSE_BLOCK_INDICES } from "./rules";

/**
 * Validate a generated plan's structural invariants. Throws Error with an
 * actionable message on the first violation.
 */
export function validatePlan(plan: ArrangementPlan): void {
  arrangementPlanSchema.parse(plan);
  const channelIds = new Set(plan.request.channels.map((c) => c.id));
  const seen = new Set<string>();
  for (const p of plan.placements) {
    if (!channelIds.has(p.channelId)) {
      throw new Error(`Placement ${p.id} references unknown channel "${p.channelId}".`);
    }
    if (!isBlockStart(p.startBar) || p.startBar + p.durationBars > 28) {
      throw new Error(`Placement ${p.id} has an out-of-bounds or misaligned startBar ${p.startBar}.`);
    }
    const expectedSection = sectionIdForStartBar(p.startBar);
    if (p.sectionId !== expectedSection) {
      throw new Error(`Placement ${p.id} sectionId "${p.sectionId}" should be "${expectedSection}".`);
    }
    const key = `${p.channelId}@${p.startBar}`;
    if (seen.has(key)) {
      throw new Error(`Duplicate placement for ${key}.`);
    }
    seen.add(key);
  }
  for (const o of plan.overrides) {
    if (!channelIds.has(o.channelId)) {
      throw new Error(`Override references unknown channel "${o.channelId}".`);
    }
    if (!isBlockStart(o.startBar)) {
      throw new Error(`Override for "${o.channelId}" has invalid startBar ${o.startBar}.`);
    }
  }
  // Invariant: kick and snare never both absent in the same verse block.
  for (const b of VERSE_BLOCK_INDICES) {
    const startBar = b * 4;
    const activeRoles = new Set(
      plan.placements.filter((p) => p.startBar === startBar).map((p) => {
        const ch = plan.request.channels.find((c) => c.id === p.channelId);
        return ch?.role;
      }),
    );
    const hasKick = plan.request.channels.some((c) => c.role === "kick" && c.enabled);
    const hasSnare = plan.request.channels.some((c) => c.role === "snare" && c.enabled);
    if (hasKick && hasSnare && !activeRoles.has("kick") && !activeRoles.has("snare")) {
      throw new Error(`Verse block at bar ${startBar + 1} removes both kick and snare.`);
    }
  }
  void BLOCK_COUNT;
}
