"use client";

import { ArrangementPlan } from "@/lib/schema";
import { exportJson } from "@/lib/exporters/json";
import { exportCsv } from "@/lib/exporters/csv";
import { exportPlaylistGuide } from "@/lib/exporters/playlist-guide";

function download(filename: string, text: string, mime: string) {
  const url = URL.createObjectURL(new Blob([text], { type: mime }));
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

export default function ExportPanel({ plan }: { plan: ArrangementPlan }) {
  const json = exportJson(plan);
  const csv = exportCsv(plan);
  const guide = exportPlaylistGuide(plan);
  const files = [
    { label: "Export JSON", name: "arrangement.json", mime: "application/json", text: json },
    { label: "Export CSV", name: "arrangement.csv", mime: "text/csv", text: csv },
    { label: "Export Guide", name: "playlist-guide.md", mime: "text/markdown", text: guide },
  ];
  return (
    <section aria-labelledby="export-heading">
      <h2 id="export-heading" className="mb-2 text-lg font-semibold">Export</h2>
      <div className="mb-3 flex flex-wrap gap-2">
        {files.map((f) => (
          <button
            key={f.name}
            className="rounded bg-neutral-700 px-3 py-2 text-sm hover:bg-neutral-600"
            onClick={() => download(f.name, f.text, f.mime)}
          >
            {f.label}
          </button>
        ))}
      </div>
      <p className="mb-2 text-xs text-neutral-400">
        The guide contains exact bar placements for manual native Pattern Clip insertion — it does not modify any .flp.
      </p>
      {files.map((f) => (
        <details key={f.name} className="mb-2">
          <summary className="cursor-pointer text-sm text-neutral-300">Preview {f.name}</summary>
          <pre className="mt-1 max-h-64 overflow-auto rounded bg-neutral-900 p-3 text-xs">{f.text}</pre>
        </details>
      ))}
    </section>
  );
}
