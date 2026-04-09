// Deterministic seeded PRNG (mulberry32)
// Same seed → same sequence of random numbers → stable mock data

export function createRng(seed: number) {
  let state = seed;
  return function next(): number {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Seed from a date string so same date = same data
export function seedFromDate(dateStr: string): number {
  let hash = 0;
  for (let i = 0; i < dateStr.length; i++) {
    const char = dateStr.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash |= 0;
  }
  return Math.abs(hash);
}

// Utility: random float in range
export function randomInRange(
  rng: () => number,
  min: number,
  max: number
): number {
  return min + rng() * (max - min);
}

// Utility: random int in range (inclusive)
export function randomInt(
  rng: () => number,
  min: number,
  max: number
): number {
  return Math.floor(randomInRange(rng, min, max + 1));
}
