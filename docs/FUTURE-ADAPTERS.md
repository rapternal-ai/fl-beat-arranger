# Future adapters (research only — not shipping dependencies)

The `ArrangementPlan` document is the stable boundary between the deterministic engine and any future FL Studio integration. Adapters must never silently mutate a plan or a project.

## Adapter stub contract

```ts
type PlacementAdapter = {
  name: string;
  /** Check environment prerequisites (FL version, OS, permissions). */
  probe(): Promise<{ ok: boolean; notes: string[] }>;
  /** Show the user exactly what would happen. Never writes. */
  dryRun(plan: ArrangementPlan): Promise<string>;
  /** Execute only after explicit user acknowledgment + backup confirmation. */
  apply(plan: ArrangementPlan, opts: { acknowledged: boolean }): Promise<void>;
};
```

## Candidate paths

1. **Desktop UI automation** (keyboard/mouse). Requires: FL Studio version + OS detection, screen scaling and Playlist zoom calibration, project backup, dry-run preview, and a cancel affordance. Brittle — must fail safe and never silently change a project. Always operate on a saved copy.
2. **FL Studio Python MIDI scripting.** Verify documented capabilities first; do not assume undocumented Playlist clip insertion. Ship behind a feature flag.
3. **WAV stem assembly.** User exports per-instrument stems; an external tool renders the arrangement to audio. Works today but produces audio, not editable native Pattern Clips, and must handle effect tails and timing offsets.

## Rules for any adapter

- Write only to a saved copy of the project; require explicit acknowledgment.
- Never claim Playlist changes were made unless verified.
- Keep `engine/` free of React, DOM, filesystem, and FL Studio dependencies.
