"use client";

import { TransitionSuggestion } from "@/lib/schema";

export default function TransitionChecklist({ transitions }: { transitions: TransitionSuggestion[] }) {
  if (transitions.length === 0) {
    return <p className="text-sm text-neutral-400">Transition suggestions are disabled.</p>;
  }
  return (
    <section aria-labelledby="transitions-heading">
      <h2 id="transitions-heading" className="mb-2 text-lg font-semibold">Manual transition checklist</h2>
      <p className="mb-2 text-xs text-neutral-400">
        Suggestions only — no MIDI has been generated and nothing is applied in FL Studio.
      </p>
      <ul className="space-y-1">
        {transitions.map((t) => (
          <li key={t.id} className="flex items-start gap-2 text-sm">
            <input type="checkbox" aria-label={`Done: bar ${t.atBar} ${t.action}`} className="mt-1" />
            <span>
              <span className="mr-2 rounded bg-neutral-700 px-1.5 py-0.5 text-xs">{t.action}</span>
              Bar {t.atBar}: {t.instruction} <em className="text-neutral-400">(requires manual edit)</em>
            </span>
          </li>
        ))}
      </ul>
    </section>
  );
}
