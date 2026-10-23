/**
 * Deterministic seeded PRNG (mulberry32). Same seed always produces the
 * same sequence across environments.
 */
export type Rng = {
  /** Next float in [0, 1). */
  next(): number;
  /** Next integer in [0, maxExclusive). */
  int(maxExclusive: number): number;
  /** True with probability p. */
  chance(p: number): boolean;
  /** Pick a deterministic element, or undefined for empty arrays. */
  pick<T>(items: readonly T[]): T | undefined;
};

export function createRng(seed: number): Rng {
  let state = seed >>> 0;
  const next = () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  return {
    next,
    int: (maxExclusive) => Math.floor(next() * maxExclusive),
    chance: (p) => next() < p,
    pick: (items) =>
      items.length === 0 ? undefined : items[Math.floor(next() * items.length)],
  };
}
