import { z } from "zod";

export const INSTRUMENT_ROLES = [
  "kick",
  "snare",
  "hihat",
  "percussion",
  "bass",
  "melody",
  "chords",
  "pad",
  "fx",
  "other",
] as const;

export const instrumentRoleSchema = z.enum(INSTRUMENT_ROLES);
export type InstrumentRole = z.infer<typeof instrumentRoleSchema>;

export const channelPatternSchema = z.object({
  id: z.string().min(1),
  patternName: z.string().min(1, "Pattern name is required"),
  role: instrumentRoleSchema,
  enabled: z.boolean(),
  priority: z.enum(["core", "support", "accent"]),
  canDrop: z.boolean(),
  notes: z.string().optional(),
});
export type ChannelPattern = z.infer<typeof channelPatternSchema>;

export const arrangementRequestSchema = z
  .object({
    schemaVersion: z.literal("1.0"),
    title: z.string().min(1, "Title is required"),
    tempoBpm: z
      .number()
      .finite("Tempo must be a number")
      .min(40, "Tempo must be at least 40 BPM")
      .max(240, "Tempo must be at most 240 BPM"),
    beatsPerBar: z.literal(4, {
      error: "Only 4/4 (beatsPerBar: 4) is supported",
    }),
    sourceBars: z.literal(4, {
      error: "Only an exact 4-bar source loop is supported",
    }),
    sections: z.tuple([
      z.object({ id: z.literal("intro"), bars: z.literal(4) }),
      z.object({ id: z.literal("verse"), bars: z.literal(16) }),
      z.object({ id: z.literal("hook"), bars: z.literal(8) }),
    ]),
    variation: z.literal("medium"),
    enableDrumBassDropouts: z.literal(true),
    enableTransitionSuggestions: z.boolean(),
    seed: z
      .number()
      .int("Seed must be an integer")
      .min(0, "Seed must be >= 0")
      .max(4294967295, "Seed must be <= 2^32 - 1"),
    channels: z
      .array(channelPatternSchema)
      .min(1, "At least one channel is required")
      .max(32, "At most 32 channels are supported"),
  })
  .superRefine((req, ctx) => {
    const seenIds = new Set<string>();
    for (const ch of req.channels) {
      if (seenIds.has(ch.id)) {
        ctx.addIssue({
          code: "custom",
          message: `Duplicate channel id "${ch.id}"`,
          path: ["channels"],
        });
      }
      seenIds.add(ch.id);
    }
    const enabled = req.channels.filter((c) => c.enabled);
    if (enabled.length === 0) {
      ctx.addIssue({
        code: "custom",
        message: "At least one channel must be enabled",
        path: ["channels"],
      });
    }
  });

export type ArrangementRequest = z.infer<typeof arrangementRequestSchema>;
export type SectionId = "intro" | "verse" | "hook";

export const patternPlacementSchema = z.object({
  id: z.string().min(1),
  channelId: z.string().min(1),
  patternName: z.string().min(1),
  sectionId: z.enum(["intro", "verse", "hook"]),
  startBar: z.number().int().min(0).max(24).multipleOf(4),
  durationBars: z.literal(4),
  sourceOffsetBar: z.literal(0),
  source: z.enum(["generated", "user-override"]),
});
export type PatternPlacement = z.infer<typeof patternPlacementSchema>;

export const transitionSuggestionSchema = z.object({
  id: z.string().min(1),
  atBar: z.number().int().min(1).max(28),
  action: z.enum([
    "drum-fill",
    "kick-drop",
    "bass-drop",
    "crash",
    "filter-rise",
  ]),
  instruction: z.string().min(1),
  requiresManualEdit: z.literal(true),
});
export type TransitionSuggestion = z.infer<typeof transitionSuggestionSchema>;

export const overrideEntrySchema = z.object({
  channelId: z.string().min(1),
  startBar: z.number().int().min(0).max(24).multipleOf(4),
  active: z.boolean(),
});
export type OverrideEntry = z.infer<typeof overrideEntrySchema>;

export const arrangementPlanSchema = z.object({
  schemaVersion: z.literal("1.0"),
  rulesVersion: z.literal("1.0.0"),
  request: arrangementRequestSchema,
  totalBars: z.literal(28),
  boundaryBarExclusive: z.literal(28),
  placements: z.array(patternPlacementSchema),
  transitions: z.array(transitionSuggestionSchema),
  warnings: z.array(z.string()),
  overrides: z.array(overrideEntrySchema),
});
export type ArrangementPlan = z.infer<typeof arrangementPlanSchema>;

export const SECTION_DEFS = [
  { id: "intro" as const, bars: 4 },
  { id: "verse" as const, bars: 16 },
  { id: "hook" as const, bars: 8 },
];

export const BLOCK_START_BARS = [0, 4, 8, 12, 16, 20, 24] as const;

export function sectionIdForStartBar(startBar: number): SectionId {
  if (startBar < 4) return "intro";
  if (startBar < 20) return "verse";
  return "hook";
}

export function isBlockStart(bar: number): boolean {
  return Number.isInteger(bar) && bar >= 0 && bar <= 24 && bar % 4 === 0;
}
