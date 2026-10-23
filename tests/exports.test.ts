import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { validateRequest, exportJson, exportCsv, exportPlaylistGuide } from "../lib/api";
import { applyOverrides, generateArrangement } from "../lib/engine/generator";
import { arrangementPlanSchema } from "../lib/schema";
import { parseCsvManifest, parseJsonManifest } from "../lib/manifests/parse";

const westCoast = () =>
  validateRequest(JSON.parse(readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8")));

describe("exporters", () => {
  const plan = applyOverrides(generateArrangement(westCoast()), [
    { channelId: "perc", startBar: 20, active: false },
  ]);

  it("JSON round-trips through the plan schema and keeps overrides", () => {
    const text = exportJson(plan);
    const reparsed = arrangementPlanSchema.parse(JSON.parse(text));
    expect(reparsed.overrides).toEqual(plan.overrides);
    expect(reparsed.placements).toEqual(plan.placements);
  });

  it("CSV has the exact header and one-based bars", () => {
    const csv = exportCsv(plan);
    const lines = csv.trimEnd().split("\n");
    expect(lines[0]).toBe("pattern_name,role,playlist_track_index,section,start_bar_1based,duration_bars");
    expect(lines.length).toBe(plan.placements.length + 1);
    const row = lines[1].split(",");
    expect(Number(row[4])).toBe(plan.placements[0].startBar + 1);
    expect(Number(row[5])).toBe(4);
  });

  it("CSV escapes names containing commas", () => {
    const req = westCoast();
    req.channels[0].patternName = 'Kick, "Main"';
    const csv = exportCsv(generateArrangement(req));
    expect(csv).toContain('"Kick, ""Main"""');
  });

  it("guide mentions tempo, track order, per-track bars and manual tasks", () => {
    const guide = exportPlaylistGuide(plan);
    expect(guide).toContain("94 BPM");
    expect(guide).toContain("Split by channel");
    expect(guide).toMatch(/Piano.*→ bars 1, 5, 9, 13, 17, 21, 25 \(4 bars each\)/);
    expect(guide).toContain("- [ ] Bar 20:");
    expect(guide).toMatch(/does \*\*not\*\* modify your `\.flp`/);
    expect(guide).toContain("new `.flp` version");
  });

  it("guide shows one-based bar markers", () => {
    const guide = exportPlaylistGuide(generateArrangement(westCoast()));
    expect(guide).toContain("bars 1");
    expect(guide).not.toMatch(/→ bars 0,/);
  });
});

describe("manifest parsing", () => {
  it("parses a JSON array of names and objects", () => {
    const ch = parseJsonManifest(JSON.stringify(["Kick", { patternName: "808", role: "bass" }]));
    expect(ch).toHaveLength(2);
    expect(ch[1].role).toBe("bass");
    expect(ch[0].id).toBe("kick");
  });

  it("parses the example fixture's channels array", () => {
    const text = readFileSync(join(__dirname, "..", "fixtures", "west-coast-loop.json"), "utf8");
    const ch = parseJsonManifest(text);
    expect(ch).toHaveLength(7);
    expect(ch[3].patternName).toBe("808");
  });

  it("parses a CSV with header and a bare name list", () => {
    const withHeader = parseCsvManifest("pattern_name,role,can_drop\nKick,kick,false\nHats,hihat,true\n");
    expect(withHeader[0]).toMatchObject({ patternName: "Kick", role: "kick", canDrop: false });
    const bare = parseCsvManifest("Piano\nPad\n");
    expect(bare.map((c) => c.patternName)).toEqual(["Piano", "Pad"]);
    expect(bare[0].role).toBe("melody");
  });

  it("rejects malformed JSON manifests with an error", () => {
    expect(() => parseJsonManifest("42")).toThrow();
    expect(() => parseJsonManifest("{}")).toThrow();
  });
});
