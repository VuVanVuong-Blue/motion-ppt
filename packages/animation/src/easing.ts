import { UnknownEasingError } from './errors.js';
import type { EasingType, SpringConfig } from './types.js';
import { resolveSpringConfig, springDisplacement, springSettleTime } from './spring.js';

export type EasingFunction = (t: number) => number;

export const EASING_TYPES: readonly EasingType[] = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'easeOutBack',
  'easeInOutBack',
  'ease-m3-emphasized',
  'ease-m3-decelerate',
  'ease-apple-fluid',
  'ease-cinematic',
  'spring',
];

function clamp01(t: number): number {
  return Math.min(1, Math.max(0, t));
}

function bezierY(t: number, y1: number, y2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * y1 + 3 * u * t * t * y2 + t * t * t;
}

function bezierX(t: number, x1: number, x2: number): number {
  const u = 1 - t;
  return 3 * u * u * t * x1 + 3 * u * t * t * x2 + t * t * t;
}

function bezierXDerivative(t: number, x1: number, x2: number): number {
  const u = 1 - t;
  return 3 * u * u * x1 + 6 * u * t * (x2 - x1) + 3 * t * t * (1 - x2);
}

/** Solves x(t) = x for the given cubic-bezier x control points. */
function solveBezierX(x: number, x1: number, x2: number): number {
  let t = x;
  for (let i = 0; i < 8; i++) {
    const err = bezierX(t, x1, x2) - x;
    if (Math.abs(err) < 1e-6) return t;
    const d = bezierXDerivative(t, x1, x2);
    if (Math.abs(d) < 1e-6) break;
    t -= err / d;
  }
  let lo = 0;
  let hi = 1;
  for (let i = 0; i < 60; i++) {
    const mid = (lo + hi) / 2;
    if (bezierX(mid, x1, x2) < x) lo = mid;
    else hi = mid;
  }
  return (lo + hi) / 2;
}

/** Builds a cubic-bezier easing from control points (x1, y1, x2, y2). */
export function cubicBezier(x1: number, y1: number, x2: number, y2: number): EasingFunction {
  return (x: number): number => {
    const t = solveBezierX(clamp01(x), x1, x2);
    return bezierY(t, y1, y2);
  };
}

/** Standard easing functions keyed by name (spring is resolved separately). */
export const EASING_FUNCTIONS: Record<Exclude<EasingType, 'spring'>, EasingFunction> = {
  linear: (t) => t,
  easeIn: (t) => t * t,
  easeOut: (t) => 1 - (1 - t) * (1 - t),
  easeInOut: (t) => (t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2),
  easeInCubic: (t) => t * t * t,
  easeOutCubic: (t) => 1 - Math.pow(1 - t, 3),
  easeInOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
  easeOutBack: (t) => {
    const c1 = 1.70158;
    const c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeInOutBack: (t) => {
    const c1 = 1.70158;
    const c2 = c1 * 1.525;
    return t < 0.5
      ? (Math.pow(2 * t, 2) * ((c2 + 1) * 2 * t - c2)) / 2
      : (Math.pow(2 * t - 2, 2) * ((c2 + 1) * (2 * t - 2) + c2) + 2) / 2;
  },
  'ease-m3-emphasized': cubicBezier(0.2, 0, 0, 1),
  'ease-m3-decelerate': cubicBezier(0, 0, 0.2, 1),
  'ease-apple-fluid': cubicBezier(0.28, 0.8, 0.32, 1),
  'ease-cinematic': cubicBezier(0.42, 0, 0.58, 1),
};

export function isEasingType(value: unknown): value is EasingType {
  return typeof value === 'string' && (EASING_TYPES as readonly string[]).includes(value);
}

/**
 * Resolves an easing identifier into a function mapping normalized time
 * [0, 1] to animation progress. Spring easings return `1 - displacement`,
 * i.e. progress from fully displaced (0) toward rest (1) with overshoot.
 */
export function resolveEasing(easing: EasingType, spring?: SpringConfig): EasingFunction {
  if (easing === 'spring') {
    const cfg = resolveSpringConfig(spring);
    const settle = springSettleTime(cfg);
    const displacement = springDisplacement(cfg);
    return (t: number): number => {
      const tt = clamp01(t);
      return 1 - displacement(tt * settle);
    };
  }
  const fn = EASING_FUNCTIONS[easing];
  if (!fn) throw new UnknownEasingError(easing);
  return (t: number) => fn(clamp01(t));
}