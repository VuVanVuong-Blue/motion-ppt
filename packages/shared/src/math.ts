import { InvalidArgumentError } from './errors.js';

/** Clamps `value` into the inclusive range [`min`, `max`]. */
export function clamp(value: number, min: number, max: number): number {
  if (min > max) {
    throw new InvalidArgumentError(`clamp: min (${min}) must be <= max (${max})`);
  }
  return Math.min(max, Math.max(min, value));
}

/** Linear interpolation between `a` and `b` by the normalized factor `t`. */
export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Maps `value` from the source range [`inMin`, `inMax`] into the target
 * range [`outMin`, `outMax`]. Values outside the source range are
 * extrapolated unless `clamped` is true.
 */
export function remap(
  value: number,
  inMin: number,
  inMax: number,
  outMin: number,
  outMax: number,
  clamped = false,
): number {
  if (inMin === inMax) {
    throw new InvalidArgumentError(`remap: source range must not be zero-width (inMin === inMax === ${inMin})`);
  }
  const t = (value - inMin) / (inMax - inMin);
  const result = outMin + t * (outMax - outMin);
  if (!clamped) return result;
  const lo = Math.min(outMin, outMax);
  const hi = Math.max(outMin, outMax);
  return clamp(result, lo, hi);
}

/** Rounds `value` to `digits` decimal places. */
export function round(value: number, digits = 0): number {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

/** Normalizes an angle in degrees into the range [0, 360). */
export function normalizeDegrees(degrees: number): number {
  const d = degrees % 360;
  return d < 0 ? d + 360 : d;
}
