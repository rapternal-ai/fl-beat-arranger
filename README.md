# FL Studio Beat Arranger (MVP)

Turns a producer's existing **4-bar FL Studio Channel Rack pattern** into a reproducible, editable **28-bar arrangement plan** — 4-bar intro + 16-bar verse + 8-bar hook — plus a step-by-step manual Playlist placement guide.

**Product principle:** arrange the producer's existing music; never generate or replace musical material. The app never reads or writes `.flp` files, plugins, Mixer inserts, or the Playlist.

## Requirements

- Node.js ≥ 20.9 (developed on Node 24)
- FL Studio (any edition with Playlist) for the manual steps — no plugin or API access needed

## Run locally

```bash
npm install
npm run dev          # http://localhost:3000
npm test             # Vitest unit/constraint tests
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test:e2e     # Playwright E2E (needs `npx playwright install` once)
```

## Workflow

1. In FL Studio, save a copy of the project, verify the source pattern is exactly 4 bars in 4/4, then use **Channel Rack → Split by channel**.
2. Enter the resulting pattern names in the app (or import a JSON/CSV manifest) and confirm each channel's role, priority, and `can drop` flag.
3. **Generate Arrangement** → a 7-block grid (Intro 1–4, Verse 5–20, Hook 21–28). Same manifest + seed ⇒ identical plan.
4. Toggle cells to override; the sidebar explains each decision and lists manual transition suggestions.
5. Export `arrangement.json`, `arrangement.csv`, and `playlist-guide.md`, then place the listed **native Pattern Clips** in the FL Studio Playlist by hand.

Details: [docs/FL-STUDIO-WORKFLOW.md](docs/FL-STUDIO-WORKFLOW.md) ·
limitations: [docs/INTEGRATION-LIMITATIONS.md](docs/INTEGRATION-LIMITATIONS.md) ·
future automation: [docs/FUTURE-ADAPTERS.md](docs/FUTURE-ADAPTERS.md)

## Architecture

```
lib/schema.ts        Zod contracts: ArrangementRequest → ArrangementPlan
lib/engine/          Pure deterministic engine (no React/DOM/FS/FL deps)
  rng.ts             mulberry32 seeded PRNG
  rules.ts           baseline role policy table, block constants
  generator.ts       computeGrid / generateArrangement / applyOverrides
  overrides.ts       cell override helpers
  validator.ts       post-generation invariant checks
lib/exporters/       arrangement.json / arrangement.csv / playlist-guide.md
lib/manifests/       JSON+CSV manifest parsing, name→role suggestions
components/          Manifest editor, controls, timeline grid, exports
app/page.tsx         Client-only UI; state persisted to localStorage
tests/               Vitest suites + Playwright workflow spec
fixtures/            west-coast-loop.json, percussion-only.json
```

Key invariants enforced by the engine and tested across seeds: clips are 4 bars at 4-bar-aligned positions referencing only enabled channels; kick and snare are never removed together in a verse block; ≤1 bass and ≤1 hi-hat removal in the verse; hooks are at least as dense as the densest verse block; `canDrop=false` channels are never randomly removed; transition entries are suggestions (`requiresManualEdit: true`), never applied edits.
