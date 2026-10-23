import { ChannelPattern, channelPatternSchema } from "../schema";
import { suggestRole, suggestPriority } from "./role-suggestions";

let counter = 0;
export function slugifyId(name: string): string {
  const base = name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
  return base || `ch-${++counter}`;
}

export function makeChannel(
  patternName: string,
  partial: Partial<ChannelPattern> = {},
): ChannelPattern {
  const role = partial.role ?? suggestRole(patternName);
  return {
    id: partial.id ?? slugifyId(patternName),
    patternName,
    role,
    enabled: partial.enabled ?? true,
    priority: partial.priority ?? suggestPriority(role),
    canDrop: partial.canDrop ?? true,
    notes: partial.notes,
  };
}

/** Parse a JSON manifest: either a full request-like object or an array of channels. */
export function parseJsonManifest(text: string): ChannelPattern[] {
  const data: unknown = JSON.parse(text);
  const raw: unknown[] = Array.isArray(data)
    ? data
    : typeof data === "object" && data !== null && Array.isArray((data as { channels?: unknown }).channels)
      ? ((data as { channels: unknown[] }).channels)
      : (() => {
          throw new Error("JSON manifest must be an array of channels or an object with a `channels` array.");
        })();
  return raw.map((entry, i) => {
    if (typeof entry === "string") return makeChannel(entry);
    if (typeof entry === "object" && entry !== null) {
      const e = entry as Record<string, unknown>;
      if (typeof e.patternName !== "string" || e.patternName.length === 0) {
        throw new Error(`Channel ${i + 1}: missing patternName.`);
      }
      const ch = makeChannel(e.patternName, {
        id: typeof e.id === "string" && e.id ? e.id : undefined,
        role: e.role as ChannelPattern["role"] | undefined,
        enabled: typeof e.enabled === "boolean" ? e.enabled : undefined,
        priority: e.priority as ChannelPattern["priority"] | undefined,
        canDrop: typeof e.canDrop === "boolean" ? e.canDrop : undefined,
        notes: typeof e.notes === "string" ? e.notes : undefined,
      });
      return channelPatternSchema.parse(ch);
    }
    throw new Error(`Channel ${i + 1}: expected a string or object.`);
  });
}

/**
 * Parse a CSV manifest. Supported columns (header optional):
 * pattern_name | name, role, priority, can_drop, enabled, notes.
 * Minimal form: one pattern name per line.
 */
export function parseCsvManifest(text: string): ChannelPattern[] {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0);
  if (lines.length === 0) return [];
  const split = (l: string) => l.split(",").map((c) => c.trim().replace(/^"|"$/g, ""));
  let header: string[] | null = null;
  const first = split(lines[0]).map((c) => c.toLowerCase());
  if (first.includes("pattern_name") || first.includes("name")) {
    header = first;
    lines.shift();
  }
  return lines.map((line, i) => {
    const cols = split(line);
    const get = (keys: string[]) => {
      if (!header) return undefined;
      for (const k of keys) {
        const idx = header.indexOf(k);
        if (idx !== -1 && cols[idx] !== undefined && cols[idx] !== "") return cols[idx];
      }
      return undefined;
    };
    const name = header ? (get(["pattern_name", "name"]) ?? cols[0]) : cols[0];
    if (!name) throw new Error(`CSV row ${i + 1}: missing pattern name.`);
    const bool = (v: string | undefined, dflt: boolean) =>
      v === undefined ? dflt : !["false", "0", "no", "off"].includes(v.toLowerCase());
    return makeChannel(name, {
      role: get(["role"]) as ChannelPattern["role"] | undefined,
      priority: get(["priority"]) as ChannelPattern["priority"] | undefined,
      canDrop: bool(get(["can_drop", "candrop"]), true),
      enabled: bool(get(["enabled"]), true),
      notes: get(["notes", "note"]),
    });
  });
}
