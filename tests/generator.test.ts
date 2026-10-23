import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateRequest } from "../lib/api";
import { generateArrangement } from "../lib/engine/generator";
import { validatePlan } from "../lib/engine/validator";
import { ArrangementRequest } from "../lib/schema";

const fixture = (name: string): ArrangementRequest =>
  validateRequest(JSON.parse(readFileSync(join(__dirname, "..", "fixtures", name), "utf8")));

const westCoast = () => fixture("west-coast-loop.json");

describe("request validation", () => {
  it("accepts the sample manifest", () => {
    expect(westCoast().channels).toHaveLength(7);
  });

  it("rejects invalid BPM with an actionable error", () => {
    const bad = { ...JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8")), tempoBpm: 300 };
    expect(() => validateRequest(bad)).toThrow(/240/);
  });

  it("rejects non-4/4 beatsPerBar and non-4-bar source", () => {
    const base = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8"));
    expect(() => validateRequest({ ...base, beatsPerBar: 3 })).toThrow();
    expect(() => validateRequest({ ...base, sourceBars: 8 })).toThrow();
  });

  it("rejects duplicate channel ids", () => {
    const base = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8"));
    base.channels[1].id = "kick";
    expect(() => validateRequest(base)).toThrow(/[Dd]uplicate/);
  });

  it("rejects an invalid sections schema", () => {
    const base = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8"));
    base.sections = [{ id: "intro", bars: 4 }];
    expect(() => validateRequest(base)).toThrow();
  });

  it("rejects empty and oversized channel lists", () => {
    const base = JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8"));
    expect(() => validateRequest({ ...base, channels: [] })).toThrow();
    const many = Array.from({ length: 33 }, (_, i) => ({
      id: `c${i}`, patternName: `P${i}`, role: "other", enabled: true, priority: "support", canDrop: true,
    }));
    expect(() => validateRequest({ ...base, channels: many })).toThrow();
  });
});

describe("generateArrangement", () => {
  it("produces a 28-bar plan that passes invariant validation", () => {
    const plan = generateArrangement(westCoast());
    expect(plan.totalBars).toBe(28);
    expect(plan.boundaryBarExclusive).toBe(28);
    expect(() => validatePlan(plan)).not.toThrow();
  });

  it("places clips only at 4-bar-aligned starts with duration 4 on enabled channels", () => {
    const plan = generateArrangement(westCoast());
    const enabled = new Set(plan.request.channels.filter((c) => c.enabled).map((c) => c.id));
    for (const p of plan.placements) {
      expect(p.startBar % 4).toBe(0);
      expect(p.startBar).toBeGreaterThanOrEqual(0);
      expect(p.startBar).toBeLessThanOrEqual(24);
      expect(p.durationBars).toBe(4);
      expect(enabled.has(p.channelId)).toBe(true);
    }
  });

  it("marks section ids correctly (intro 0-4, verse 4-20, hook 20-28)", () => {
    const plan = generateArrangement(westCoast());
    for (const p of plan.placements) {
      const expected = p.startBar < 4 ? "intro" : p.startBar < 20 ? "verse" : "hook";
      expect(p.sectionId).toBe(expected);
    }
  });

  it("is byte-identical for the same request + seed", () => {
    const a = generateArrangement(westCoast());
    const b = generateArrangement(westCoast());
    expect(JSON.stringify(a.placements)).toBe(JSON.stringify(b.placements));
    expect(JSON.stringify(a.transitions)).toBe(JSON.stringify(b.transitions));
  });

  it("keeps all invariants across many seeds", () => {
    for (let seed = 0; seed < 200; seed++) {
      const plan = generateArrangement({ ...westCoast(), seed });
      expect(() => validatePlan(plan)).not.toThrow();
      // never an empty block
      for (let b = 0; b < 7; b++) {
        expect(plan.placements.some((p) => p.startBar === b * 4)).toBe(true);
      }
    }
  });

  it("intro is lower-density than the hook on a representative project", () => {
    const plan = generateArrangement(westCoast());
    const count = (bar: number) => plan.placements.filter((p) => p.startBar === bar).length;
    expect(count(0)).toBeLessThan(count(20));
    expect(count(0)).toBeLessThan(count(24));
  });

  it("hook blocks are at least as dense as the densest verse block", () => {
    for (const seed of [0, 1, 2, 3, 42, 99]) {
      const plan = generateArrangement({ ...westCoast(), seed });
      const count = (bar: number) => plan.placements.filter((p) => p.startBar === bar).length;
      const densest = Math.max(count(4), count(8), count(12), count(16));
      expect(count(20)).toBeGreaterThanOrEqual(densest);
      expect(count(24)).toBeGreaterThanOrEqual(densest);
    }
  });

  it("sorts placements by startBar then channel order with stable ids", () => {
    const plan = generateArrangement(westCoast());
    const order = new Map(plan.request.channels.map((c, i) => [c.id, i]));
    for (let i = 1; i < plan.placements.length; i++) {
      const a = plan.placements[i - 1];
      const b = plan.placements[i];
      const cmp = a.startBar - b.startBar || order.get(a.channelId)! - order.get(b.channelId)!;
      expect(cmp).toBeLessThan(0);
      expect(plan.placements[i].id).toBe(`pl-${b.channelId}-${b.startBar}`);
    }
  });

  it("labels transition suggestions as manual", () => {
    const plan = generateArrangement(westCoast());
    expect(plan.transitions.length).toBeGreaterThan(0);
    for (const t of plan.transitions) expect(t.requiresManualEdit).toBe(true);
    expect(plan.transitions.some((t) => t.action === "drum-fill" && t.atBar === 20)).toBe(true);
    expect(plan.transitions.some((t) => t.action === "crash" && t.atBar === 21)).toBe(true);
  });

  it("omits transition metadata when disabled without changing clips", () => {
    const on = generateArrangement(westCoast());
    const off = generateArrangement({ ...westCoast(), enableTransitionSuggestions: false });
    expect(off.transitions).toHaveLength(0);
    expect(JSON.stringify(off.placements)).toBe(JSON.stringify(on.placements));
  });
});

describe("edge-case manifests", () => {
  it("warns about missing bass and never invents bass placements", () => {
    const req = westCoast();
    req.channels = req.channels.filter((c) => c.role !== "bass");
    const plan = generateArrangement(req);
    expect(plan.warnings.some((w) => /[Bb]ass/.test(w))).toBe(true);
    const roles = new Set(plan.placements.map((p) => req.channels.find((c) => c.id === p.channelId)!.role));
    expect(roles.has("bass")).toBe(false);
  });

  it("handles a single percussion channel without crashing", () => {
    const plan = generateArrangement(fixture("percussion-only.json"));
    expect(() => validatePlan(plan)).not.toThrow();
    expect(plan.warnings.length).toBeGreaterThan(0);
    expect(plan.placements.length).toBeGreaterThan(0);
  });

  it("warns and anchors the intro when only drums exist", () => {
    const req = westCoast();
    req.channels = req.channels.filter((c) => ["kick", "snare", "hihat"].includes(c.role));
    const plan = generateArrangement(req);
    expect(plan.warnings.some((w) => /melodic|rhythmic intro anchor/i.test(w))).toBe(true);
    expect(plan.placements.some((p) => p.startBar === 0)).toBe(true);
  });

  it("warns on duplicate pattern names", () => {
    const req = westCoast();
    req.channels[2].patternName = "Kick";
    const plan = generateArrangement(req);
    expect(plan.warnings.some((w) => /ambiguous|used by 2 channels/.test(w))).toBe(true);
  });

  it("uses only enabled channels", () => {
    const req = westCoast();
    for (const c of req.channels) {
      if (c.priority !== "core") c.enabled = false;
    }
    const plan = generateArrangement(req);
    const ids = new Set(plan.placements.map((p) => p.channelId));
    for (const id of ids) {
      expect(req.channels.find((c) => c.id === id)!.enabled).toBe(true);
    }
  });
});
