import {
  ArrangementPlan,
  ArrangementRequest,
  OverrideEntry,
  PatternPlacement,
  TransitionSuggestion,
  sectionIdForStartBar,
} from "../schema";
import { createRng } from "./rng";
import {
  BLOCK_COUNT,
  BLOCK_LABELS,
  HOOK_BLOCK_INDICES,
  VERSE_BLOCK_INDICES,
  baselineFor,
  isCoreRhythmRole,
  isMelodicRole,
  isSupportOrAccent,
  CellReason,
} from "./rules";

export type Cell = { active: boolean; reason: CellReason };

export type CellGrid = {
  /** rows[i] = cells for channels[i], one per block. */
  rows: Cell[][];
  warnings: string[];
  transitions: TransitionSuggestion[];
};

export const RULES_VERSION = "1.0.0" as const;

function channelIndex(request: ArrangementRequest, channelId: string): number {
  return request.channels.findIndex((c) => c.id === channelId);
}

function countActive(grid: Cell[][], block: number): number {
  return grid.reduce((n, row) => n + (row[block].active ? 1 : 0), 0);
}

/** True when every kick-role channel AND every snare-role channel is off. */
function killsDrumFoundation(
  request: ArrangementRequest,
  grid: Cell[][],
  block: number,
): boolean {
  const kicks = request.channels
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.enabled && c.role === "kick");
  const snares = request.channels
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.enabled && c.role === "snare");
  const allOff = (list: { i: number }[]) =>
    list.length > 0 && list.every(({ i }) => !grid[i][block].active);
  return allOff(kicks) && allOff(snares);
}

function ensureNonEmptyBlocks(request: ArrangementRequest, grid: Cell[][], warnings: string[]) {
  const enabledIdx = request.channels
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => c.enabled)
    .map(({ i }) => i);
  for (let b = 0; b < BLOCK_COUNT; b++) {
    if (countActive(grid, b) === 0 && enabledIdx.length > 0) {
      grid[enabledIdx[0]][b] = { active: true, reason: "nonempty-block" };
      warnings.push(
        `${BLOCK_LABELS[b]} had no active patterns; enabled "${request.channels[enabledIdx[0]].patternName}" to keep the block non-empty.`,
      );
    }
  }
}

function computeWarnings(request: ArrangementRequest): string[] {
  const warnings: string[] = [];
  const enabled = request.channels.filter((c) => c.enabled);
  const hasRole = (r: string) => enabled.some((c) => c.role === r);
  if (!hasRole("kick") && !hasRole("snare")) {
    warnings.push("No kick or snare channel — the arrangement has no drum foundation.");
  }
  if (!hasRole("bass")) {
    warnings.push("No bass/808 channel — low end will be absent unless another instrument covers it.");
  }
  if (!enabled.some((c) => isMelodicRole(c.role))) {
    warnings.push("No melodic/harmonic element (melody, chords or pad).");
  }
  const names = new Map<string, number>();
  for (const c of request.channels) {
    names.set(c.patternName, (names.get(c.patternName) ?? 0) + 1);
  }
  for (const [name, n] of names) {
    if (n > 1) {
      warnings.push(
        `Pattern name "${name}" is used by ${n} channels — ambiguous when placing clips manually in FL Studio. JSON export keeps channel IDs to disambiguate.`,
      );
    }
  }
  if (enabled.length === 1) {
    warnings.push("Only one enabled channel — the arrangement will be intentionally sparse.");
  }
  return warnings;
}

function buildTransitions(request: ArrangementRequest): TransitionSuggestion[] {
  if (!request.enableTransitionSuggestions) return [];
  const enabled = request.channels.filter((c) => c.enabled);
  const t: TransitionSuggestion[] = [];
  const drums = enabled.filter((c) => c.role === "snare" || c.role === "percussion" || c.role === "hihat");
  t.push({
    id: "tr-drum-fill-20",
    atBar: 20,
    action: "drum-fill",
    instruction:
      drums.length > 0
        ? `Add a 1-bar drum fill in bar 20 (last bar of the verse) using "${drums[0].patternName}".`
        : "Optionally add a 1-bar drum fill in bar 20 (last bar of the verse) if you add a drum channel.",
    requiresManualEdit: true,
  });
  const crash = enabled.find((c) => c.role === "fx" || c.role === "percussion");
  t.push({
    id: "tr-crash-21",
    atBar: 21,
    action: "crash",
    instruction:
      crash !== undefined
        ? `Add a crash/impact on bar 21 (downbeat of the hook) using "${crash.patternName}".`
        : "Optionally add a crash/impact on bar 21 (downbeat of the hook) if you have an FX or percussion channel.",
    requiresManualEdit: true,
  });
  const melodic = enabled.find((c) => isMelodicRole(c.role));
  if (melodic) {
    t.push({
      id: "tr-filter-intro",
      atBar: 1,
      action: "filter-rise",
      instruction: `Optionally low-pass filter "${melodic.patternName}" during the intro (bars 1–4) and open it into the verse.`,
      requiresManualEdit: true,
    });
  }
  const bass = enabled.find((c) => c.role === "bass");
  if (bass) {
    t.push({
      id: "tr-bass-drop-20",
      atBar: 20,
      action: "bass-drop",
      instruction: `Optionally mute "${bass.patternName}" for the last bar before the hook (bar 20) to set up the downbeat at bar 21.`,
      requiresManualEdit: true,
    });
  }
  return t;
}

/**
 * Compute the full 7-block cell grid for a request. Deterministic for a
 * given request (seed is part of the request). This is the single source of
 * truth used by both plan generation and the UI detail view.
 */
export function computeGrid(request: ArrangementRequest): CellGrid {
  const rng = createRng(request.seed);
  const warnings = computeWarnings(request);
  const enabled = request.channels.map((c) => c.enabled);
  const grid: Cell[][] = request.channels.map((channel) =>
    Array.from({ length: BLOCK_COUNT }, (_, b) => {
      if (!channel.enabled) return { active: false, reason: "baseline-off" as CellReason };
      const base = baselineFor(channel.role, b);
      if (base === "on") return { active: true, reason: "baseline-on" as CellReason };
      if (base === "off") return { active: false, reason: "baseline-off" as CellReason };
      // canDrop=false protects against random removals — resolve optional to on
      const on = channel.canDrop ? rng.chance(0.5) : true;
      return {
        active: on,
        reason: on ? ("optional-seeded-on" as CellReason) : ("optional-seeded-off" as CellReason),
      };
    }),
  );

  // Step 2 — intro anchor. If no melodic element, promote one core rhythm.
  const melodicIdx = request.channels.findIndex((c) => c.enabled && isMelodicRole(c.role));
  if (melodicIdx === -1) {
    const rhythmIdx = request.channels.findIndex((c) => c.enabled && isCoreRhythmRole(c.role));
    const anchor = rhythmIdx !== -1 ? rhythmIdx : enabled.findIndex(Boolean);
    if (anchor !== -1) {
      grid[anchor][0] = { active: true, reason: "intro-anchor" };
      warnings.push(
        `Intro has no melodic element; using "${request.channels[anchor].patternName}" as a rhythmic intro anchor.`,
      );
    }
  }

  // Step 4 — seeded variation: at most one support/accent dropout per verse block.
  const variationDrops: (string | null)[] = VERSE_BLOCK_INDICES.map((b) => {
    const candidates = request.channels
      .map((c, i) => ({ c, i }))
      .filter(
        ({ c, i }) =>
          c.enabled &&
          isSupportOrAccent(c) &&
          c.canDrop &&
          // bass/hihat dropouts are managed exclusively by step 5 so each is
          // capped at one 4-bar removal across the verse
          c.role !== "bass" &&
          c.role !== "hihat" &&
          grid[i][b].active &&
          // never leave kick-and-snare fully off together
          !(c.role === "kick" || c.role === "snare" ? killsDrumFoundationAfterDrop(request, grid, b, i) : false),
      );
    if (candidates.length === 0 || !rng.chance(0.55)) return null;
    const chosen = rng.pick(candidates);
    if (!chosen) return null;
    grid[chosen.i][b] = { active: false, reason: "variation-dropout" };
    return chosen.c.id;
  });

  // Step 5 — drum/bass dropouts: at most one bass removal (prefer block D)
  // and at most one hi-hat removal (prefer block C).
  if (request.enableDrumBassDropouts) {
    const bassIdx = request.channels.findIndex((c) => c.enabled && c.role === "bass" && c.canDrop);
    if (bassIdx !== -1 && grid[bassIdx][4].active && rng.chance(0.6)) {
      grid[bassIdx][4] = { active: false, reason: "bass-dropout" };
      variationDrops[3] = variationDrops[3] ?? request.channels[bassIdx].id;
    }
    const hatIdx = request.channels.findIndex((c) => c.enabled && c.role === "hihat" && c.canDrop);
    if (hatIdx !== -1 && grid[hatIdx][3].active && rng.chance(0.6)) {
      grid[hatIdx][3] = { active: false, reason: "hihat-dropout" };
      variationDrops[2] = variationDrops[2] ?? request.channels[hatIdx].id;
    }
  }

  // No more than two consecutive verse blocks with the same non-empty
  // generated dropout combination — repair by restoring the last drop.
  for (let k = 2; k < variationDrops.length; k++) {
    const combo = variationDrops[k];
    if (combo !== null && combo === variationDrops[k - 1] && combo === variationDrops[k - 2]) {
      const i = channelIndex(request, combo);
      const b = VERSE_BLOCK_INDICES[k];
      if (i !== -1 && !grid[i][b].active) {
        grid[i][b] = { active: true, reason: "baseline-on" };
        variationDrops[k] = null;
      }
    }
  }

  // Hook blocks must be at least as dense as the densest verse block.
  const densestVerse = Math.max(...VERSE_BLOCK_INDICES.map((b) => countActive(grid, b)));
  for (const b of HOOK_BLOCK_INDICES) {
    for (let i = 0; i < grid.length && countActive(grid, b) < densestVerse; i++) {
      if (request.channels[i].enabled && !grid[i][b].active) {
        grid[i][b] = { active: true, reason: "hook-density" };
      }
    }
  }

  ensureNonEmptyBlocks(request, grid, warnings);
  return { rows: grid, warnings, transitions: buildTransitions(request) };
}

function killsDrumFoundationAfterDrop(
  request: ArrangementRequest,
  grid: Cell[][],
  block: number,
  dropIdx: number,
): boolean {
  const saved = grid[dropIdx][block];
  grid[dropIdx][block] = { active: false, reason: "variation-dropout" };
  const result = killsDrumFoundation(request, grid, block);
  grid[dropIdx][block] = saved;
  return result;
}

function gridToPlacements(
  request: ArrangementRequest,
  grid: Cell[][],
  overrides: OverrideEntry[],
): PatternPlacement[] {
  const overrideKey = new Set(overrides.map((o) => `${o.channelId}@${o.startBar}`));
  const order = new Map(request.channels.map((c, i) => [c.id, i]));
  const placements: PatternPlacement[] = [];
  for (let b = 0; b < BLOCK_COUNT; b++) {
    const startBar = b * 4;
    request.channels.forEach((c, i) => {
      if (!grid[i][b].active) return;
      placements.push({
        id: `pl-${c.id}-${startBar}`,
        channelId: c.id,
        patternName: c.patternName,
        sectionId: sectionIdForStartBar(startBar),
        startBar,
        durationBars: 4,
        sourceOffsetBar: 0,
        source: overrideKey.has(`${c.id}@${startBar}`) ? "user-override" : "generated",
      });
    });
  }
  placements.sort(
    (a, b) => a.startBar - b.startBar || (order.get(a.channelId)! - order.get(b.channelId)!),
  );
  return placements;
}

export function generateArrangement(request: ArrangementRequest): ArrangementPlan {
  const { rows, warnings, transitions } = computeGrid(request);
  return {
    schemaVersion: "1.0",
    rulesVersion: RULES_VERSION,
    request,
    totalBars: 28,
    boundaryBarExclusive: 28,
    placements: gridToPlacements(request, rows, []),
    transitions,
    warnings,
    overrides: [],
  };
}

/**
 * Rebuild a plan's placements from its request plus an override list.
 * Overrides are applied on top of the deterministic generated grid.
 */
export function applyOverrides(
  plan: ArrangementPlan,
  overrides: ArrangementPlan["overrides"],
): ArrangementPlan {
  const { rows } = computeGrid(plan.request);
  const warnings = [...plan.warnings.filter((w) => !w.startsWith("Override:"))];
  for (const o of overrides) {
    const i = channelIndex(plan.request, o.channelId);
    const b = o.startBar / 4;
    if (i === -1 || b < 0 || b >= BLOCK_COUNT) continue;
    rows[i][b] = { active: o.active, reason: "user-override" };
  }
  // Reduced-energy warning if a hook block loses all kicks.
  for (const b of HOOK_BLOCK_INDICES) {
    const kicks = plan.request.channels
      .map((c, i) => ({ c, i }))
      .filter(({ c }) => c.role === "kick");
    if (kicks.length > 0 && kicks.every(({ i }) => !rows[i][b].active)) {
      warnings.push(
        `Override: ${BLOCK_LABELS[b]} (bars ${b * 4 + 1}–${b * 4 + 4}) has no kick — hook energy reduced.`,
      );
    }
  }
  for (let b = 0; b < BLOCK_COUNT; b++) {
    if (countActive(rows, b) === 0) {
      warnings.push(
        `Override: ${BLOCK_LABELS[b]} (bars ${b * 4 + 1}–${b * 4 + 4}) has no active patterns.`,
      );
    }
  }
  return {
    ...plan,
    warnings,
    overrides,
    placements: gridToPlacements(plan.request, rows, overrides),
  };
}
