"use client";

import { useRef } from "react";
import { ChannelPattern, INSTRUMENT_ROLES, InstrumentRole } from "@/lib/schema";
import { makeChannel, parseCsvManifest, parseJsonManifest } from "@/lib/manifests/parse";
import { suggestRole } from "@/lib/manifests/role-suggestions";
import { DEFAULT_STATE } from "@/lib/ui-store";

type Props = {
  channels: ChannelPattern[];
  onChange: (channels: ChannelPattern[]) => void;
  onError: (message: string | null) => void;
};

export default function ChannelManifestEditor({ channels, onChange, onError }: Props) {
  const fileRef = useRef<HTMLInputElement>(null);

  const update = (i: number, patch: Partial<ChannelPattern>) => {
    onChange(channels.map((c, j) => (j === i ? { ...c, ...patch } : c)));
  };

  const importText = (text: string, name: string) => {
    try {
      const parsed = name.toLowerCase().endsWith(".csv") ? parseCsvManifest(text) : parseJsonManifest(text);
      if (parsed.length === 0) throw new Error("Manifest contained no channels.");
      if (parsed.length > 32) throw new Error("Manifest has more than 32 channels.");
      onChange(parsed);
      onError(null);
    } catch (e) {
      onError(`Import failed: ${e instanceof Error ? e.message : String(e)}`);
    }
  };

  const loadFixture = async (file: string) => {
    const res = await fetch(`/fixtures/${file}`);
    importText(await res.text(), file);
  };

  return (
    <section aria-labelledby="manifest-heading" className="rounded-lg border border-neutral-700 p-4">
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <h2 id="manifest-heading" className="text-lg font-semibold">Channels</h2>
        <button
          className="rounded bg-neutral-700 px-2 py-1 text-sm hover:bg-neutral-600"
          onClick={() => onChange([...channels, makeChannel(`Channel ${channels.length + 1}`)])}
          disabled={channels.length >= 32}
        >
          Add Channel
        </button>
        <button className="rounded bg-neutral-700 px-2 py-1 text-sm hover:bg-neutral-600" onClick={() => fileRef.current?.click()}>
          Import Manifest
        </button>
        <input
          ref={fileRef}
          type="file"
          accept=".json,.csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) f.text().then((t) => importText(t, f.name));
            e.target.value = "";
          }}
        />
        <button className="rounded bg-neutral-800 px-2 py-1 text-sm hover:bg-neutral-700" onClick={() => loadFixture("west-coast-loop.json")}>
          Load sample
        </button>
        <button
          className="rounded bg-neutral-800 px-2 py-1 text-sm hover:bg-neutral-700"
          onClick={() => onChange(DEFAULT_STATE.channels)}
        >
          Reset defaults
        </button>
      </div>
      <p className="mb-3 text-xs text-neutral-400">
        Enter the exact pattern names shown in FL Studio after <em>Split by channel</em>. Roles are
        suggested from names — confirm them yourself.
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="text-left text-neutral-400">
              <th className="p-1">Pattern name</th>
              <th className="p-1">Role</th>
              <th className="p-1">Priority</th>
              <th className="p-1">Enabled</th>
              <th className="p-1">Can drop</th>
              <th className="p-1" />
            </tr>
          </thead>
          <tbody>
            {channels.map((c, i) => (
              <tr key={c.id + i} className="border-t border-neutral-800">
                <td className="p-1">
                  <input
                    aria-label={`Pattern name for channel ${i + 1}`}
                    className="w-36 rounded bg-neutral-800 px-2 py-1"
                    value={c.patternName}
                    onChange={(e) => update(i, { patternName: e.target.value })}
                    onBlur={(e) => update(i, { role: suggestRole(e.target.value) })}
                  />
                </td>
                <td className="p-1">
                  <select
                    aria-label={`Role for ${c.patternName}`}
                    className="rounded bg-neutral-800 px-1 py-1"
                    value={c.role}
                    onChange={(e) => update(i, { role: e.target.value as InstrumentRole })}
                  >
                    {INSTRUMENT_ROLES.map((r) => (
                      <option key={r} value={r}>{r}</option>
                    ))}
                  </select>
                </td>
                <td className="p-1">
                  <select
                    aria-label={`Priority for ${c.patternName}`}
                    className="rounded bg-neutral-800 px-1 py-1"
                    value={c.priority}
                    onChange={(e) => update(i, { priority: e.target.value as ChannelPattern["priority"] })}
                  >
                    <option value="core">core</option>
                    <option value="support">support</option>
                    <option value="accent">accent</option>
                  </select>
                </td>
                <td className="p-1 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Enabled: ${c.patternName}`}
                    checked={c.enabled}
                    onChange={(e) => update(i, { enabled: e.target.checked })}
                  />
                </td>
                <td className="p-1 text-center">
                  <input
                    type="checkbox"
                    aria-label={`Can drop: ${c.patternName}`}
                    checked={c.canDrop}
                    onChange={(e) => update(i, { canDrop: e.target.checked })}
                  />
                </td>
                <td className="p-1">
                  <button
                    className="rounded px-2 py-1 text-neutral-400 hover:text-red-400"
                    aria-label={`Remove ${c.patternName}`}
                    onClick={() => onChange(channels.filter((_, j) => j !== i))}
                  >
                    ✕
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
