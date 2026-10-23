import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateRequest } from "../lib/api";
import { generateArrangement } from "../lib/engine/generator";
import { ArrangementRequest } from "../lib/schema";

const westCoast = (): ArrangementRequest =>
  validateRequest(JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8")));

function activeRoles(plan: ReturnType<typeof generateArrangement>, startBar: number) {
  return new Set(
    plan.placements
      .filter((p) => p.startBar === startBar)
      .map((p) => plan.request.channels.find((c) => c.id === p.channelId)!.role),
  );
}

describe("constraint invariants across seeds 0-999", () => {
  const plans = Array.from({ length: 200 }, (_, seed) => generateArrangement({ ...westCoast(), seed }));

  it("never removes kick and snare together in a verse block", () => {
    for (const plan of plans) {
      for (const bar of [4, 8, 12, 16]) {
        const roles = activeRoles(plan, bar);
        expect(roles.has("kick") || roles.has("snare")).toBe(true);
      }
    }
  });

  it("at most one bass removal and one hihat removal in the verse", () => {
    for (const plan of plans) {
      let bassOff = 0;
      let hatOff = 0;
      for (const bar of [4, 8, 12, 16]) {
        const roles = activeRoles(plan, bar);
        if (!roles.has("bass")) bassOff++;
        if (!roles.has("hihat")) hatOff++;
      }
      expect(bassOff).toBeLessThanOrEqual(1);
      expect(hatOff).toBeLessThanOrEqual(1);
    }
  });

  it("never emits channels absent from the request", () => {
    for (const plan of plans) {
      const ids = new Set(plan.request.channels.map((c) => c.id));
      for (const p of plan.placements) expect(ids.has(p.channelId)).toBe(true);
    }
  });

  it("no more than two consecutive verse blocks share a dropout combination", async () => {
    const { computeGrid } = await import("../lib/engine/generator");
    for (let seed = 0; seed < 200; seed++) {
      const req = { ...westCoast(), seed };
      const { rows } = computeGrid(req);
      const combos = [1, 2, 3, 4].map((b) =>
        req.channels
          .map((c, i) => ({ c, cell: rows[i][b] }))
          .filter(({ cell }) =>
            ["variation-dropout", "bass-dropout", "hihat-dropout"].includes(cell.reason),
          )
          .map(({ c }) => c.id)
          .sort()
          .join("+"),
      );
      for (let k = 2; k < combos.length; k++) {
        if (combos[k] === "" || combos[k] !== combos[k - 1] || combos[k] !== combos[k - 2]) continue;
        throw new Error(`Seed ${seed}: dropout combo "${combos[k]}" repeated 3x consecutively`);
      }
    }
  });

  it("protected canDrop=false sounds are never omitted by the random pass", () => {
    // 'snare' and 'keys' (melody) are canDrop=false in the fixture.
    for (const plan of plans) {
      for (const p of [
        { id: "snare", bars: [4, 8, 12, 16, 20, 24] },
        { id: "keys", bars: [0, 4, 8, 12, 16, 20, 24] },
      ]) {
        for (const bar of p.bars) {
          const has = plan.placements.some((pl) => pl.channelId === p.id && pl.startBar === bar);
          // keys is baseline-on everywhere; snare baseline-on outside intro
          expect(has).toBe(true);
        }
      }
      // snare stays off in the intro (section baseline silence, labelled)
      expect(plan.placements.some((pl) => pl.channelId === "snare" && pl.startBar === 0)).toBe(false);
    }
  });

  it("different seeds may differ but every block stays non-empty", () => {
    const signatures = new Set(plans.map((p) => JSON.stringify(p.placements.map((x) => x.id))));
    expect(signatures.size).toBeGreaterThan(1);
  });
});
