"use client";

import { ChannelPattern } from "@/lib/schema";
import { Cell } from "@/lib/engine/generator";
import { BLOCK_LABELS } from "@/lib/engine/rules";

export const BLOCK_BAR_LABELS = [
  "Intro · bars 1–4",
  "Verse A · bars 5–8",
  "Verse B · bars 9–12",
  "Verse C · bars 13–16",
  "Verse D · bars 17–20",
  "Hook A · bars 21–24",
  "Hook B · bars 25–28",
];

const SECTION_COLORS = [
  "bg-sky-900/40", // intro
  "bg-emerald-900/30", // verse x4
  "bg-emerald-900/30",
  "bg-emerald-900/30",
  "bg-emerald-900/30",
  "bg-amber-900/30", // hooks
  "bg-amber-900/30",
];

export function reasonText(cell: Cell, channel: ChannelPattern): string {
  switch (cell.reason) {
    case "baseline-on":
      return "On by the baseline template for this section.";
    case "baseline-off":
      return `Off by the baseline template (section silence — not a random removal${channel.canDrop ? "" : "; protected sounds still respect section silence"}).`;
    case "intro-anchor":
      return "Kept on as the minimal intro anchor.";
    case "optional-seeded-on":
      return "Optional cell — seeded decision kept it on.";
    case "optional-seeded-off":
      return "Optional cell — seeded variation dropped it.";
    case "variation-dropout":
      return "Medium variation: dropped in this verse block (bounded to one per block).";
    case "bass-dropout":
      return "Planned bass dropout (preferred: last verse block).";
    case "hihat-dropout":
      return "Planned hi-hat break (preferred: third verse block).";
    case "hook-density":
      return "Re-enabled so the hook is at least as dense as the densest verse block.";
    case "nonempty-block":
      return "Re-enabled to keep the block non-empty.";
    case "user-override":
      return "Set by your manual override.";
  }
}

type Props = {
  channels: ChannelPattern[];
  grid: Cell[][];
  isOverridden: (channelId: string, block: number) => boolean;
  selected: { channelIdx: number; block: number } | null;
  onToggle: (channelIdx: number, block: number) => void;
  onSelect: (channelIdx: number, block: number) => void;
};

export default function ArrangementGrid({ channels, grid, isOverridden, selected, onToggle, onSelect }: Props) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full border-collapse text-sm" aria-label="Arrangement timeline: channels as rows, seven 4-bar blocks as columns">
        <thead>
          <tr>
            <th className="p-1 text-left text-neutral-400">Pattern</th>
            {BLOCK_BAR_LABELS.map((label, b) => (
              <th key={b} className={`p-1 text-center text-xs font-medium ${SECTION_COLORS[b]}`}>{label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {channels.map((c, i) => (
            <tr key={c.id} className={c.enabled ? "" : "opacity-40"}>
              <th scope="row" className="p-1 text-left font-normal">
                <span className="font-medium">{c.patternName}</span>
                <span className="ml-2 text-xs text-neutral-400">{c.role} · {c.priority}{c.canDrop ? "" : " · protected"}</span>
              </th>
              {grid[i].map((cell, b) => {
                const overridden = isOverridden(c.id, b);
                const isSel = selected?.channelIdx === i && selected.block === b;
                return (
                  <td key={b} className={`p-1 text-center ${SECTION_COLORS[b]}`}>
                    <button
                      aria-label={`${c.patternName}, ${BLOCK_LABELS[b]}, bars ${b * 4 + 1}–${b * 4 + 4}: ${cell.active ? "on" : "off"}${overridden ? " (overridden)" : ""}`}
                      aria-pressed={cell.active}
                      disabled={!c.enabled}
                      className={`h-9 w-full rounded border text-xs font-semibold focus:outline-2 focus:outline-white ${
                        cell.active
                          ? "border-emerald-500 bg-emerald-700 text-white"
                          : "border-neutral-600 bg-neutral-800 text-neutral-400"
                      } ${overridden ? "ring-2 ring-fuchsia-400" : ""} ${isSel ? "outline-2 outline-white" : ""}`}
                      onClick={() => { onSelect(i, b); onToggle(i, b); }}
                      onFocus={() => onSelect(i, b)}
                    >
                      {cell.active ? "ON" : "off"}
                      {overridden ? "*" : ""}
                    </button>
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
      <p className="mt-2 text-xs text-neutral-400">
        Click or tab to a cell and press Enter/Space to toggle. Cells marked * are manual overrides.
        ON/off labels distinguish state without relying on color alone.
      </p>
    </div>
  );
}
