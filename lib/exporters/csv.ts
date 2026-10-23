import { ArrangementPlan } from "../schema";

const HEADER = "pattern_name,role,playlist_track_index,section,start_bar_1based,duration_bars";

function csvEscape(value: string): string {
  return /[",\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
}

export function exportCsv(plan: ArrangementPlan): string {
  const trackIndex = new Map(plan.request.channels.map((c, i) => [c.id, i + 1]));
  const lines = plan.placements.map((p) => {
    const role = plan.request.channels.find((c) => c.id === p.channelId)?.role ?? "other";
    return [
      csvEscape(p.patternName),
      role,
      trackIndex.get(p.channelId) ?? "",
      p.sectionId,
      p.startBar + 1,
      p.durationBars,
    ].join(",");
  });
  return [HEADER, ...lines].join("\n") + "\n";
}
