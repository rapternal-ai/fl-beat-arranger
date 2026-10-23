import type { ChannelPattern, InstrumentRole } from "../schema";

export const BLOCK_COUNT = 7;
export const BLOCK_LABELS = [
  "Intro",
  "Verse A",
  "Verse B",
  "Verse C",
  "Verse D",
  "Hook A",
  "Hook B",
] as const;
export const VERSE_BLOCK_INDICES = [1, 2, 3, 4] as const;
export const HOOK_BLOCK_INDICES = [5, 6] as const;

export type BaselineState = "on" | "off" | "optional";

/**
 * Baseline role policy from the spec (medium intensity).
 * Row = role, columns = blocks [Intro, V-A, V-B, V-C, V-D, H-A, H-B].
 */
const BASELINE: Record<InstrumentRole, BaselineState[]> = {
  melody: ["on", "on", "on", "on", "on", "on", "on"],
  chords: ["on", "on", "on", "optional", "on", "on", "on"],
  pad: ["on", "on", "on", "optional", "on", "on", "on"],
  kick: ["off", "on", "on", "on", "on", "on", "on"],
  snare: ["off", "on", "on", "on", "on", "on", "on"],
  hihat: ["off", "on", "on", "optional", "on", "on", "on"],
  bass: ["off", "on", "on", "on", "optional", "on", "on"],
  percussion: ["optional", "off", "on", "off", "on", "on", "on"],
  fx: ["optional", "off", "on", "off", "on", "on", "on"],
  other: ["optional", "on", "on", "optional", "on", "on", "on"],
};

export function baselineFor(role: InstrumentRole, blockIndex: number): BaselineState {
  return BASELINE[role][blockIndex] ?? "optional";
}

export function isMelodicRole(role: InstrumentRole): boolean {
  return role === "melody" || role === "chords" || role === "pad";
}

export function isDrumRole(role: InstrumentRole): boolean {
  return role === "kick" || role === "snare" || role === "hihat" || role === "percussion";
}

export function isCoreRhythmRole(role: InstrumentRole): boolean {
  return role === "kick" || role === "snare";
}

export function isSupportOrAccent(channel: ChannelPattern): boolean {
  return channel.priority === "support" || channel.priority === "accent";
}

/**
 * Why a cell ended up in its state — surfaced in the UI detail view.
 */
export type CellReason =
  | "baseline-on"
  | "baseline-off"
  | "intro-anchor"
  | "optional-seeded-on"
  | "optional-seeded-off"
  | "variation-dropout"
  | "bass-dropout"
  | "hihat-dropout"
  | "hook-density"
  | "nonempty-block"
  | "user-override";
