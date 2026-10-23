"use client";

type Props = {
  title: string;
  tempoBpm: number;
  seed: number;
  enableTransitionSuggestions: boolean;
  hasPlan: boolean;
  hasOverrides: boolean;
  onTitle: (v: string) => void;
  onTempo: (v: number) => void;
  onSeed: (v: number) => void;
  onToggleTransitions: (v: boolean) => void;
  onGenerate: () => void;
  onShuffleSeed: () => void;
  onResetOverrides: () => void;
};

export default function ArrangementControls(p: Props) {
  return (
    <section aria-label="Arrangement settings" className="flex flex-wrap items-end gap-3 rounded-lg border border-neutral-700 p-4">
      <label className="flex flex-col text-sm">
        Title
        <input className="rounded bg-neutral-800 px-2 py-1" value={p.title} onChange={(e) => p.onTitle(e.target.value)} />
      </label>
      <label className="flex flex-col text-sm">
        Tempo (BPM, 40–240)
        <input
          className="w-24 rounded bg-neutral-800 px-2 py-1"
          type="number" min={40} max={240} value={p.tempoBpm}
          onChange={(e) => p.onTempo(Number(e.target.value))}
        />
      </label>
      <label className="flex flex-col text-sm">
        Seed
        <input
          className="w-28 rounded bg-neutral-800 px-2 py-1"
          type="number" min={0} max={4294967295} value={p.seed}
          onChange={(e) => p.onSeed(Math.floor(Number(e.target.value)))}
        />
      </label>
      <label className="flex items-center gap-2 pb-1 text-sm">
        <input type="checkbox" checked={p.enableTransitionSuggestions} onChange={(e) => p.onToggleTransitions(e.target.checked)} />
        Transition suggestions
      </label>
      <div className="flex gap-2">
        <button className="rounded bg-emerald-700 px-4 py-2 font-medium hover:bg-emerald-600" onClick={p.onGenerate}>
          Generate Arrangement
        </button>
        <button className="rounded bg-neutral-700 px-3 py-2 hover:bg-neutral-600" onClick={p.onShuffleSeed} disabled={!p.hasPlan}>
          Shuffle Seed
        </button>
        <button className="rounded bg-neutral-700 px-3 py-2 hover:bg-neutral-600" onClick={p.onResetOverrides} disabled={!p.hasOverrides}>
          Reset Overrides
        </button>
      </div>
    </section>
  );
}
