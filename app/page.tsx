"use client";

import { useCallback, useMemo, useState } from "react";
import { ArrangementPlan, ArrangementRequest } from "@/lib/schema";
import { validateRequest } from "@/lib/api";
import { applyOverrides, computeGrid, generateArrangement, Cell } from "@/lib/engine/generator";
import { toggleOverride } from "@/lib/engine/overrides";
import { buildRequest, UiState, useUiState } from "@/lib/ui-store";
import ChannelManifestEditor from "@/components/ChannelManifestEditor";
import ArrangementControls from "@/components/ArrangementControls";
import ArrangementGrid, { reasonText, BLOCK_BAR_LABELS } from "@/components/ArrangementGrid";
import TransitionChecklist from "@/components/TransitionChecklist";
import ExportPanel from "@/components/ExportPanel";

function parseRequest(s: UiState): ArrangementRequest {
  return validateRequest(buildRequest(s));
}

export default function Page() {
  const [ui, setUi] = useUiState();
  const [plan, setPlan] = useState<ArrangementPlan | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<{ channelIdx: number; block: number } | null>(null);

  const set = useCallback(<K extends keyof UiState>(k: K, v: UiState[K]) => {
    setUi((u) => ({ ...u, [k]: v }));
  }, [setUi]);

  const generate = useCallback(
    (state: UiState, keepOverrides: ArrangementPlan["overrides"] | null) => {
      try {
        const request = parseRequest(state);
        let next = generateArrangement(request);
        if (keepOverrides) {
          const valid = keepOverrides.filter((o) =>
            request.channels.some((c) => c.id === o.channelId),
          );
          next = applyOverrides(next, valid);
        }
        setPlan(next);
        setError(null);
        return next;
      } catch (e) {
        setError(e instanceof Error ? e.message : String(e));
        return null;
      }
    },
    [],
  );

  const onShuffleSeed = () => {
    const newSeed = Math.floor(Math.random() * 4294967296);
    const keep = plan?.overrides.length
      ? window.confirm(
          "You have manual cell overrides. Keep them on the new seed?\nOK = Keep Overrides, Cancel = Reset Overrides",
        )
      : false;
    const nextUi = { ...ui, seed: newSeed };
    setUi(nextUi);
    generate(nextUi, keep ? plan!.overrides : null);
  };

  const onToggleCell = (channelIdx: number, block: number) => {
    if (!plan) return;
    const ch = plan.request.channels[channelIdx];
    const startBar = block * 4;
    const currentlyActive = plan.placements.some(
      (p) => p.channelId === ch.id && p.startBar === startBar,
    );
    const overrides = toggleOverride(plan.overrides, ch.id, startBar, currentlyActive);
    setPlan(applyOverrides(plan, overrides));
  };

  const grid: Cell[][] | null = useMemo(() => {
    if (!plan) return null;
    const { rows } = computeGrid(plan.request);
    for (const o of plan.overrides) {
      const i = plan.request.channels.findIndex((c) => c.id === o.channelId);
      if (i !== -1) rows[i][o.startBar / 4] = { active: o.active, reason: "user-override" };
    }
    return rows;
  }, [plan]);

  const isOverridden = useCallback(
    (channelId: string, block: number) =>
      !!plan?.overrides.some((o) => o.channelId === channelId && o.startBar === block * 4),
    [plan],
  );

  const selectedCell = selected && plan && grid ? grid[selected.channelIdx][selected.block] : null;
  const selectedChannel = selected && plan ? plan.request.channels[selected.channelIdx] : null;

  return (
    <main className="mx-auto max-w-6xl space-y-4 p-6">
      <header>
        <h1 className="text-2xl font-bold">FL Studio Beat Arranger</h1>
        <p className="text-sm text-neutral-400">
          Turns a 4-bar Channel Rack loop into a 28-bar arrangement plan (Intro 1–4 · Verse 5–20 ·
          Hook 21–28) with a manual FL Studio placement guide. It never edits your .flp.
        </p>
      </header>

      <ArrangementControls
        title={ui.title}
        tempoBpm={ui.tempoBpm}
        seed={ui.seed}
        enableTransitionSuggestions={ui.enableTransitionSuggestions}
        hasPlan={plan !== null}
        hasOverrides={!!plan?.overrides.length}
        onTitle={(v) => set("title", v)}
        onTempo={(v) => set("tempoBpm", v)}
        onSeed={(v) => set("seed", v)}
        onToggleTransitions={(v) => set("enableTransitionSuggestions", v)}
        onGenerate={() => generate(ui, null)}
        onShuffleSeed={onShuffleSeed}
        onResetOverrides={() => plan && setPlan(applyOverrides(plan, []))}
      />

      <ChannelManifestEditor
        channels={ui.channels}
        onChange={(channels) => set("channels", channels)}
        onError={setError}
      />

      {error && (
        <div role="alert" className="rounded border border-red-600 bg-red-950/60 p-3 text-sm text-red-200">
          {error}
        </div>
      )}

      {plan && grid && (
        <>
          {plan.warnings.length > 0 && (
            <ul className="space-y-1 rounded border border-amber-700 bg-amber-950/50 p-3 text-sm text-amber-200">
              {plan.warnings.map((w, i) => (
                <li key={i}>⚠ {w}</li>
              ))}
            </ul>
          )}

          <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
            <section aria-labelledby="grid-heading" className="rounded-lg border border-neutral-700 p-4">
              <h2 id="grid-heading" className="mb-2 text-lg font-semibold">Timeline — seven 4-bar blocks</h2>
              <ArrangementGrid
                channels={plan.request.channels}
                grid={grid}
                isOverridden={isOverridden}
                selected={selected}
                onToggle={onToggleCell}
                onSelect={(channelIdx, block) => setSelected({ channelIdx, block })}
              />
            </section>

            <aside aria-label="Cell details" className="rounded-lg border border-neutral-700 p-4 text-sm">
              <h2 className="mb-2 font-semibold">Why this cell?</h2>
              {selectedCell && selectedChannel && selected ? (
                <div className="space-y-2">
                  <p>
                    <strong>{selectedChannel.patternName}</strong> — {BLOCK_BAR_LABELS[selected.block]}
                  </p>
                  <p>State: <strong>{selectedCell.active ? "ON" : "off"}</strong></p>
                  <p className="text-neutral-300">{reasonText(selectedCell, selectedChannel)}</p>
                </div>
              ) : (
                <p className="text-neutral-400">Select a cell in the grid to see why it is on or off.</p>
              )}
              <div className="mt-4">
                <TransitionChecklist transitions={plan.transitions} />
              </div>
            </aside>
          </div>

          <section className="rounded-lg border border-neutral-700 p-4">
            <ExportPanel plan={plan} />
          </section>
        </>
      )}
    </main>
  );
}
