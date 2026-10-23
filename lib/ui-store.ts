"use client";

import { useSyncExternalStore } from "react";
import { ChannelPattern, SECTION_DEFS } from "./schema";
import { makeChannel } from "./manifests/parse";

export type UiState = {
  title: string;
  tempoBpm: number;
  seed: number;
  enableTransitionSuggestions: boolean;
  channels: ChannelPattern[];
};

const STORAGE_KEY = "fl-beat-arranger:v1";

export const DEFAULT_STATE: UiState = {
  title: "Untitled Beat",
  tempoBpm: 94,
  seed: 42,
  enableTransitionSuggestions: true,
  channels: [
    makeChannel("Piano"),
    makeChannel("Kick"),
    makeChannel("Snare"),
    makeChannel("Sample"),
    makeChannel("Clap"),
    makeChannel("Percussion"),
  ],
};

let cached: UiState | null = null;
const listeners = new Set<() => void>();

function read(): UiState {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) return { ...DEFAULT_STATE, ...JSON.parse(saved) };
  } catch {
    /* corrupt storage — start fresh */
  }
  return DEFAULT_STATE;
}

function getSnapshot(): UiState {
  cached ??= read();
  return cached;
}

const getServerSnapshot = () => DEFAULT_STATE;

function subscribe(cb: () => void): () => void {
  listeners.add(cb);
  window.addEventListener("storage", cb);
  return () => {
    listeners.delete(cb);
    window.removeEventListener("storage", cb);
  };
}

export function setUiState(next: UiState | ((prev: UiState) => UiState)) {
  cached = typeof next === "function" ? next(getSnapshot()) : next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(cached));
  } catch {
    /* storage full/blocked — keep in-memory state */
  }
  for (const l of listeners) l();
}

/** Hydration-safe: server snapshot is the default; saved state swaps in after mount. */
export function useUiState(): [UiState, typeof setUiState] {
  return [useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot), setUiState];
}

export function buildRequest(s: UiState) {
  return {
    schemaVersion: "1.0" as const,
    title: s.title,
    tempoBpm: s.tempoBpm,
    beatsPerBar: 4 as const,
    sourceBars: 4 as const,
    sections: SECTION_DEFS,
    variation: "medium" as const,
    enableDrumBassDropouts: true as const,
    enableTransitionSuggestions: s.enableTransitionSuggestions,
    seed: s.seed,
    channels: s.channels,
  };
}
