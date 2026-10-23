import { ArrangementPlan } from "../schema";
import { BLOCK_LABELS } from "../engine/rules";

export function exportPlaylistGuide(plan: ArrangementPlan): string {
  const { request } = plan;
  const minutes = Math.round(((28 * 4 * 60) / request.tempoBpm) * 10) / 10;
  const out: string[] = [];
  out.push(`# Playlist Guide — ${request.title}`);
  out.push("");
  out.push(`- Tempo: ${request.tempoBpm} BPM, 4/4`);
  out.push(`- Source loop: 4 bars, repeats as ${plan.placements.length} native Pattern Clips`);
  out.push(`- Arrangement: 28 bars (≈ ${minutes} min) — Intro 1–4, Verse 5–20, Hook 21–28`);
  out.push(`- Generated with seed ${request.seed} (rules ${plan.rulesVersion}) — reproducible from the same manifest + seed.`);
  out.push("");
  out.push("## Prepare in FL Studio");
  out.push("");
  out.push("1. Save a copy of the project (e.g. `Original Beat - Arranged.flp`). Keep the original untouched.");
  out.push("2. Confirm the source Pattern is exactly 4 bars and the project is 4/4.");
  out.push("3. Select the pattern and use **Channel Rack → Split by channel** so each channel becomes its own pattern.");
  out.push("4. Rename the split patterns to match the names below exactly (these are your manifest `patternName` values).");
  out.push("5. Switch to **Song mode** and open the Playlist.");
  out.push("");
  out.push("## Suggested Playlist track order");
  out.push("");
  out.push("Track numbers are recommendations only — they are not detected FL Studio track IDs.");
  out.push("");
  request.channels.forEach((c, i) => {
    const status = c.enabled ? `${c.role} (${c.priority})` : `${c.role} — disabled, no clips`;
    out.push(`${i + 1}. ${c.patternName} — ${status}`);
  });
  out.push("");
  out.push("## Clip placement (each clip is exactly 4 bars)");
  out.push("");
  const byChannel = new Map<string, number[]>();
  for (const p of plan.placements) {
    const list = byChannel.get(p.channelId) ?? [];
    list.push(p.startBar + 1);
    byChannel.set(p.channelId, list);
  }
  request.channels.forEach((c, i) => {
    const bars = byChannel.get(c.id);
    if (!bars || bars.length === 0) {
      if (c.enabled) out.push(`- ${c.patternName} (Track ${i + 1}): no clips in this arrangement.`);
      return;
    }
    const sections = plan.placements
      .filter((p) => p.channelId === c.id)
      .map((p) => BLOCK_LABELS[p.startBar / 4])
      .join(", ");
    out.push(
      `- **${c.patternName}** (Track ${i + 1}) → bars ${bars.join(", ")} (4 bars each) — ${sections}`,
    );
  });
  out.push("");
  out.push("Place each listed clip as a **native Pattern Clip** starting on the given bar. You can edit MIDI inside each clip afterwards — they still reference the original channels.");
  out.push("");
  if (plan.transitions.length > 0) {
    out.push("## Manual transition checklist");
    out.push("");
    out.push("These are **suggestions only** — nothing has been edited for you.");
    out.push("");
    for (const t of plan.transitions) {
      out.push(`- [ ] Bar ${t.atBar}: ${t.instruction}`);
    }
    out.push("");
  }
  if (plan.warnings.length > 0) {
    out.push("## Warnings");
    out.push("");
    for (const w of plan.warnings) out.push(`- ${w}`);
    out.push("");
  }
  out.push("## Safety notes");
  out.push("");
  out.push("- This guide does **not** modify your `.flp`, plugins, Mixer routing, or Playlist — placement is manual.");
  out.push("- Save the arranged project as a **new `.flp` version**; never overwrite the original.");
  out.push("- Preview the assembled beat: long notes, release tails, sidechains and automation can cross clip boundaries.");
  out.push("- Patterns containing automation may need manual review after splitting.");
  out.push("");
  return out.join("\n");
}
