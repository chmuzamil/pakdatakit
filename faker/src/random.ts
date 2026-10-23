/**
 * Small, portable pseudo-random number generation.
 *
 * Uses the cyrb128 string hash to turn any seed into 128 bits of state and
 * the sfc32 generator to produce numbers. Both use only 32-bit integer
 * arithmetic (`Math.imul`, `>>>`), so the same seed gives the same sequence in
 * every JavaScript engine.
 */

/** A source of uniformly distributed numbers in `[0, 1)`. */
export type RandomSource = () => number;

/** Hashes a string into four 32-bit integers (cyrb128). */
export function cyrb128(input: string): [number, number, number, number] {
  let h1 = 1779033703;
  let h2 = 3144134277;
  let h3 = 1013904242;
  let h4 = 2773480762;
  for (let i = 0; i < input.length; i += 1) {
    const k = input.charCodeAt(i);
    h1 = h2 ^ Math.imul(h1 ^ k, 597399067);
    h2 = h3 ^ Math.imul(h2 ^ k, 2869860233);
    h3 = h4 ^ Math.imul(h3 ^ k, 951274213);
    h4 = h1 ^ Math.imul(h4 ^ k, 2716044179);
  }
  h1 = Math.imul(h3 ^ (h1 >>> 18), 597399067);
  h2 = Math.imul(h4 ^ (h2 >>> 22), 2869860233);
  h3 = Math.imul(h1 ^ (h3 >>> 17), 951274213);
  h4 = Math.imul(h2 ^ (h4 >>> 19), 2716044179);
  h1 ^= h2 ^ h3 ^ h4;
  h2 ^= h1;
  h3 ^= h1;
  h4 ^= h1;
  return [h1 >>> 0, h2 >>> 0, h3 >>> 0, h4 >>> 0];
}

/** Creates an sfc32 generator from four 32-bit integers. */
export function sfc32(
  a: number,
  b: number,
  c: number,
  d: number,
): RandomSource {
  return () => {
    a >>>= 0;
    b >>>= 0;
    c >>>= 0;
    d >>>= 0;
    let t = (a + b) | 0;
    a = b ^ (b >>> 9);
    b = (c + (c << 3)) | 0;
    c = (c << 21) | (c >>> 11);
    d = (d + 1) | 0;
    t = (t + d) | 0;
    c = (c + t) | 0;
    return (t >>> 0) / 4294967296;
  };
}

/**
 * Creates a deterministic generator for a seed. Numbers and strings are both
 * hashed as strings, so `42` and `'42'` give the same sequence.
 */
export function seededRandom(seed: number | string): RandomSource {
  const [a, b, c, d] = cyrb128(String(seed));
  const next = sfc32(a, b, c, d);
  // Discard the first outputs, which are less mixed.
  for (let i = 0; i < 12; i += 1) next();
  return next;
}
