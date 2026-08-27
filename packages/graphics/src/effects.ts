/**
 * Per-effect visual-state interpolation.
 *
 * Pure functions mapping (effect, eased progress, element bounds) to an
 * {@link ElementVisualState}. This is the Canvas-side counterpart of the PPTX
 * timing engine (`packages/pptx/src/timing/timing-xml.ts`): both consume the
 * same DSL, but here the result is a per-frame draw delta instead of OOXML.
 *
 * Semantics mirror the registry descriptions in @motion-ppt/animation:
 * entrances go 0 -> 1 along `p`, exits go 1 -> 0.
 */
import { InvalidArgumentError } from '@motion-ppt/shared';
import type { AnimationOptions } from '@motion-ppt/animation';
import { clamp01 } from './canvas.js';
import { IDENTITY_VISUAL_STATE, type ElementVisualState } from './types.js';

export interface EffectInput {
  /** Effect id, e.g. `fadeIn`, `slideIn`, `morph`. */
  effect: string;
  /** Eased progress in [0, 1]. */
  p: number;
  /** Bounding box of the target element in px (drives default travel distances). */
  bounds: { width: number; height: number };
  options?: AnimationOptions;
}

export type EffectEvaluator = (input: EffectInput) => ElementVisualState;

/** Default slide direction, matching the PPTX timing engine. */
export const DEFAULT_SLIDE_DIRECTION = 'bottom' as const;

/** riseIn travel distance as a fraction of the element height. */
export const RISE_FRACTION = 0.3;
/** pulse scale amplitude (15% like the native PPTX `by=15000`). */
export const PULSE_AMPLITUDE = 0.15;
/** Number of scale pulses across the effect duration. */
export const PULSE_CYCLES = 2;
/** wiggle peak rotation in degrees. */
export const WIGGLE_AMPLITUDE_DEG = 8;
/** Number of wiggle oscillations. */
export const WIGGLE_CYCLES = 3;

/** A point on a motion path, in px. */
export interface PathPoint {
  x: number;
  y: number;
}

// ---------------------------------------------------------------------------
// Effect evaluators
// ---------------------------------------------------------------------------

function slideState(
  p: number,
  out: boolean,
  bounds: { width: number; height: number },
  options: AnimationOptions | undefined,
): ElementVisualState {
  const direction = options?.direction ?? DEFAULT_SLIDE_DIRECTION;
  const isHorizontal = direction === 'left' || direction === 'right';
  const distance = options?.distance ?? (isHorizontal ? bounds.width : bounds.height);
  // slideIn: offset -> 0; slideOut: 0 -> offset.
  const travel = (out ? p : 1 - p) * distance;
  switch (direction) {
    case 'left':
      return { ...IDENTITY_VISUAL_STATE, translateX: -travel };
    case 'right':
      return { ...IDENTITY_VISUAL_STATE, translateX: travel };
    case 'top':
      return { ...IDENTITY_VISUAL_STATE, translateY: -travel };
    default:
      return { ...IDENTITY_VISUAL_STATE, translateY: travel };
  }
}

function movePathState(
  p: number,
  options: AnimationOptions | undefined,
): ElementVisualState {
  const path = options?.customProperties?.path;
  const points = parseMotionPath(path);
  if (points.length < 2) return { ...IDENTITY_VISUAL_STATE };
  const at = pointAtFraction(points, clamp01(p));
  return { ...IDENTITY_VISUAL_STATE, translateX: at.x, translateY: at.y };
}

const EVALUATORS: Record<string, EffectEvaluator> = {
  fadeIn: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, opacity: p }),
  fadeOut: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, opacity: 1 - p }),
  // staggerIn is orchestrated as sequential fade entrances (same as the PPTX mapper).
  staggerIn: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, opacity: p }),
  slideIn: ({ p, bounds, options }) => slideState(p, false, bounds, options),
  slideOut: ({ p, bounds, options }) => slideState(p, true, bounds, options),
  riseIn: ({ p, bounds }) => ({
    ...IDENTITY_VISUAL_STATE,
    opacity: p,
    translateY: (1 - p) * bounds.height * RISE_FRACTION,
  }),
  zoomIn: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, scaleX: p, scaleY: p }),
  zoomOut: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, scaleX: 1 - p, scaleY: 1 - p }),
  pulse: ({ p }) => {
    const scale = 1 + PULSE_AMPLITUDE * Math.sin(p * 2 * Math.PI * PULSE_CYCLES);
    return { ...IDENTITY_VISUAL_STATE, scaleX: scale, scaleY: scale };
  },
  wiggle: ({ p }) => ({
    ...IDENTITY_VISUAL_STATE,
    rotation: WIGGLE_AMPLITUDE_DEG * Math.sin(p * 2 * Math.PI * WIGGLE_CYCLES),
  }),
  // Two off-blinks; starts and ends fully visible. Square wave is binary-exact
  // (0.25/0.5 are exact doubles), unlike sin() which drifts at multiples of pi.
  flash: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, opacity: p % 0.5 < 0.25 ? 1 : 0 }),
  spin: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, rotation: 360 * p }),
  bounce: ({ p, bounds }) => ({
    ...IDENTITY_VISUAL_STATE,
    translateY: -(1 - easeOutBounce(clamp01(p))) * bounds.height,
  }),
  movePath: ({ p, options }) => movePathState(p, options),
  // Cross-slide morphs are interpolated by the playback layer with a source
  // snapshot; without one the effect is a plain fade-in.
  morph: ({ p }) => ({ ...IDENTITY_VISUAL_STATE, opacity: p }),
};

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Computes the visual state for an effect at eased progress `p`.
 * Throws {@link InvalidArgumentError} for unknown effect ids.
 */
export function effectVisualState(input: EffectInput): ElementVisualState {
  const evaluator = EVALUATORS[input.effect];
  if (!evaluator) {
    throw new InvalidArgumentError(`Unknown effect for playback: "${input.effect}"`);
  }
  const raw = evaluator(input);
  return {
    opacity: clamp01(raw.opacity),
    translateX: raw.translateX,
    translateY: raw.translateY,
    scaleX: raw.scaleX,
    scaleY: raw.scaleY,
    rotation: raw.rotation,
  };
}

/**
 * Parses a motion path into points. Accepts either an array of `{x, y}` points
 * (absolute px) or an SVG path string supporting `M`/`L` commands in absolute
 * or relative form. Returns an empty array when the path is unusable.
 */
export function parseMotionPath(path: unknown): PathPoint[] {
  if (Array.isArray(path)) {
    const points = path.filter(
      (pt): pt is PathPoint =>
        typeof pt === 'object' &&
        pt !== null &&
        typeof (pt as PathPoint).x === 'number' &&
        typeof (pt as PathPoint).y === 'number' &&
        Number.isFinite((pt as PathPoint).x) &&
        Number.isFinite((pt as PathPoint).y),
    );
    return points.length >= 2 ? points : [];
  }
  if (typeof path === 'string') return parseSvgPath(path);
  return [];
}

function parseSvgPath(path: string): PathPoint[] {
  const points: PathPoint[] = [];
  let cursor = { x: 0, y: 0 };
  const tokens = path.match(/[MLml]\s*[-+0-9.eE]+[,\s]+[-+0-9.eE]+/g) ?? [];
  for (const token of tokens) {
    const command = token[0]!;
    const rest = token.slice(1).trim();
    const parts = rest.split(/[,\s]+/);
    const dx = Number.parseFloat(parts[0]!);
    const dy = Number.parseFloat(parts[1]!);
    if (!Number.isFinite(dx) || !Number.isFinite(dy)) continue;
    const point =
      command === command.toUpperCase()
        ? { x: dx, y: dy }
        : { x: cursor.x + dx, y: cursor.y + dy };
    points.push(point);
    cursor = point;
  }
  return points;
}

/** Samples a polyline at arc-length fraction `t` in [0, 1]. */
export function pointAtFraction(points: readonly PathPoint[], t: number): PathPoint {
  const first = points[0]!;
  if (points.length === 1 || t <= 0) return { ...first };
  if (t >= 1) return { ...points[points.length - 1]! };
  const segments: number[] = [];
  let total = 0;
  for (let i = 1; i < points.length; i++) {
    const seg = Math.hypot(points[i]!.x - points[i - 1]!.x, points[i]!.y - points[i - 1]!.y);
    segments.push(seg);
    total += seg;
  }
  if (total === 0) return { ...first };
  let target = t * total;
  let acc = 0;
  for (let i = 0; i < segments.length; i++) {
    const seg = segments[i]!;
    if (acc + seg >= target || i === segments.length - 1) {
      const f = seg === 0 ? 0 : (target - acc) / seg;
      return {
        x: points[i]!.x + (points[i + 1]!.x - points[i]!.x) * f,
        y: points[i]!.y + (points[i + 1]!.y - points[i]!.y) * f,
      };
    }
    acc += seg;
  }
  return { ...points[points.length - 1]! };
}

/** Standard ease-out-bounce (used by the `bounce` effect). */
export function easeOutBounce(x: number): number {
  const n1 = 7.5625;
  const d1 = 2.75;
  if (x < 1 / d1) return n1 * x * x;
  if (x < 2 / d1) return n1 * (x - 1.5 / d1) * (x - 1.5 / d1) + 0.75;
  if (x < 2.5 / d1) return n1 * (x - 2.25 / d1) * (x - 2.25 / d1) + 0.9375;
  return n1 * (x - 2.625 / d1) * (x - 2.625 / d1) + 0.984375;
}
