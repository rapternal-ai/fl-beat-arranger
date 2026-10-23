import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateRequest } from "../lib/api";
import { applyOverrides, generateArrangement } from "../lib/engine/generator";
import { toggleOverride } from "../lib/engine/overrides";
import { validatePlan } from "../lib/engine/validator";
import { ArrangementRequest } from "../lib/schema";

const westCoast = (): ArrangementRequest =>
  validateRequest(JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8")));

describe("applyOverrides", () => {
  it("turning a cell off removes the placement and records the override", () => {
    const plan = generateArrangement(westCoast());
    const before = plan.placements.some((p) => p.channelId === "keys" && p.startBar === 8);
    expect(before).toBe(true);
    const next = applyOverrides(plan, [{ channelId: "keys", startBar: 8, active: false }]);
    expect(next.placements.some((p) => p.channelId === "keys" && p.startBar === 8)).toBe(false);
    expect(next.overrides).toEqual([{ channelId: "keys", startBar: 8, active: false }]);
    expect(() => validatePlan(next)).not.toThrow();
  });

  it("turning a cell on adds a user-override placement", () => {
    const plan = generateArrangement(westCoast());
    const next = applyOverrides(plan, [{ channelId: "kick", startBar: 0, active: true }]);
    const p = next.placements.find((pl) => pl.channelId === "kick" && pl.startBar === 0);
    expect(p).toBeDefined();
    expect(p!.source).toBe("user-override");
  });

  it("overriding a hook kick off warns about reduced energy", () => {
    const plan = generateArrangement(westCoast());
    const next = applyOverrides(plan, [{ channelId: "kick", startBar: 20, active: false }]);
    expect(next.warnings.some((w) => /no kick|energy reduced/i.test(w))).toBe(true);
  });

  it("overrides survive export round-trip (json includes overrides)", () => {
    const plan = generateArrangement(westCoast());
    const next = applyOverrides(plan, [{ channelId: "perc", startBar: 20, active: false }]);
    const parsed = JSON.parse(JSON.stringify(next));
    expect(parsed.overrides).toEqual(next.overrides);
  });
});

describe("toggleOverride", () => {
  it("adds, then removes, a cell override", () => {
    let o = toggleOverride([], "kick", 4, true);
    expect(o).toEqual([{ channelId: "kick", startBar: 4, active: false }]);
    o = toggleOverride(o, "kick", 4, false);
    expect(o).toEqual([]);
  });
});
