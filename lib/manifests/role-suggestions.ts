import { InstrumentRole } from "../schema";

/**
 * Heuristic name → role suggestion. Always user-confirmable; never blocks.
 */
export function suggestRole(patternName: string): InstrumentRole {
  const n = patternName.toLowerCase();
  const match = (words: string[]) => words.some((w) => n.includes(w));
  if (match(["kick", "bd", "boom"])) return "kick";
  if (match(["snare", "clap", "rim", "snap"])) return "snare";
  if (match(["hat", "hh", "shaker", "tamb"])) return "hihat";
  if (match(["perc", "conga", "bongo", "tom", "cowbell", "wood"])) return "percussion";
  if (match(["808", "bass", "sub", "reese"])) return "bass";
  if (match(["lead", "melody", "melo", "piano", "keys", "bell", "pluck", "flute", "guitar", "synth", "sample"])) return "melody";
  if (match(["chord", "rhodes", "ep", "organ", "stab"])) return "chords";
  if (match(["pad", "string", "atmo", "drone", "choir"])) return "pad";
  if (match(["fx", "riser", "crash", "impact", "sweep", "vox", "vocal", "siren", "drop"])) return "fx";
  return "other";
}

export function suggestPriority(role: InstrumentRole): "core" | "support" | "accent" {
  if (role === "kick" || role === "snare" || role === "bass" || role === "melody") return "core";
  if (role === "hihat" || role === "chords" || role === "pad") return "support";
  return "accent";
}
