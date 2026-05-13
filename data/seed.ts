/**
 * Deterministic PRNG + tiny helpers used by the mock data files.
 *
 * The `activity` and `webhooks` datasets are generated at module load
 * from a fixed seed so that every render — and every refresh — sees the
 * same rows. Swap the seed if you want a different snapshot.
 */

export const mulberry32 = (seed: number): (() => number) => {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

export const pick = <T>(rand: () => number, items: readonly T[]): T =>
  items[Math.floor(rand() * items.length)];

/** Pick an item by weight. Weights do not need to sum to 1. */
export const weightedPick = <T>(
  rand: () => number,
  items: ReadonlyArray<readonly [T, number]>,
): T => {
  const total = items.reduce((acc, [, w]) => acc + w, 0);
  let r = rand() * total;
  for (const [value, weight] of items) {
    r -= weight;
    if (r <= 0) return value;
  }
  return items[items.length - 1][0];
};

export const randInt = (
  rand: () => number,
  min: number,
  max: number,
): number => Math.floor(rand() * (max - min + 1)) + min;

/** Pad with leading zeros to length `len`. */
export const pad = (value: number, len: number): string =>
  String(value).padStart(len, "0");

/**
 * Anchor every "now" reference in the mock data to a single fixed instant
 * so screenshots, snapshot tests, and visual diffs stay stable.
 */
export const NOW = new Date("2026-05-13T17:30:00.000Z");

/** Subtract `ms` from {@link NOW} and return an ISO string. */
export const isoAgo = (ms: number): string =>
  new Date(NOW.getTime() - ms).toISOString();

export const MINUTE = 60_000;
export const HOUR = 60 * MINUTE;
export const DAY = 24 * HOUR;

/** Hex-ish id of `len` chars from the seeded RNG. */
export const id = (rand: () => number, prefix: string, len = 12): string => {
  const alphabet = "0123456789abcdef";
  let out = "";
  for (let i = 0; i < len; i++) {
    out += alphabet[Math.floor(rand() * alphabet.length)];
  }
  return `${prefix}_${out}`;
};
