import { InvalidArgumentError } from '@motion-ppt/shared';
import type { SpringConfig, SpringPreset } from './types.js';

/**
 * Damped harmonic oscillator for spring physics (Figma/Framer style:
 * mass-spring-damper). Closed-form solutions are used for displacement over
 * time; no numerical integration is required.
 */

export interface ResolvedSpringConfig {
  mass: number;
  stiffness: number;
  damping: number;
  restDelta: number;
}

export const SPRING_PRESETS: Record<SpringPreset, { mass: number; stiffness: number; damping: number }> = {
  snappy: { mass: 1, stiffness: 400, damping: 30 },
  default: { mass: 1, stiffness: 260, damping: 20 },
  gentle: { mass: 1, stiffness: 120, damping: 14 },
  bouncy: { mass: 1, stiffness: 200, damping: 10 },
  cinematicHeavy: { mass: 2, stiffness: 80, damping: 18 },
};

const DEFAULT_SPRING: ResolvedSpringConfig = { mass: 1, stiffness: 260, damping: 20, restDelta: 0.001 };

/** Merges a {@link SpringConfig} with its preset and the package defaults. */
export function resolveSpringConfig(spring?: SpringConfig): ResolvedSpringConfig {
  const preset = spring?.preset ? SPRING_PRESETS[spring.preset] : undefined;
  const mass = spring?.mass ?? preset?.mass ?? DEFAULT_SPRING.mass;
  const stiffness = spring?.stiffness ?? preset?.stiffness ?? DEFAULT_SPRING.stiffness;
  const damping = spring?.damping ?? preset?.damping ?? DEFAULT_SPRING.damping;
  const restDelta = spring?.restDelta ?? DEFAULT_SPRING.restDelta;
  if (!(mass > 0)) throw new InvalidArgumentError(`spring mass must be > 0, got ${mass}`);
  if (!(stiffness > 0)) throw new InvalidArgumentError(`spring stiffness must be > 0, got ${stiffness}`);
  if (!(damping > 0)) throw new InvalidArgumentError(`spring damping must be > 0, got ${damping}`);
  if (!(restDelta > 0 && restDelta < 1)) {
    throw new InvalidArgumentError(`spring restDelta must be in (0, 1), got ${restDelta}`);
  }
  return { mass, stiffness, damping, restDelta };
}

export interface SpringDynamics {
  /** Natural angular frequency sqrt(k/m). */
  omega0: number;
  /** Damping ratio c / (2 sqrt(k m)). */
  zeta: number;
  /** Damped angular frequency (underdamped only, else 0). */
  dampedFrequency: number;
}

export function springDynamics(cfg: ResolvedSpringConfig): SpringDynamics {
  const omega0 = Math.sqrt(cfg.stiffness / cfg.mass);
  const zeta = cfg.damping / (2 * Math.sqrt(cfg.stiffness * cfg.mass));
  const dampedFrequency = zeta < 1 ? omega0 * Math.sqrt(1 - zeta * zeta) : 0;
  return { omega0, zeta, dampedFrequency };
}

/**
 * Returns x(t): displacement from rest, in seconds, for a unit initial
 * displacement (x(0) = 1, v(0) = 0). Positive values are offset from rest.
 */
export function springDisplacement(cfg: ResolvedSpringConfig): (t: number) => number {
  const { omega0, zeta, dampedFrequency } = springDynamics(cfg);
  if (zeta < 1) {
    const decay = (t: number): number => {
      if (t < 0) return 1;
      const e = Math.exp(-zeta * omega0 * t);
      return e * (Math.cos(dampedFrequency * t) + ((zeta * omega0) / dampedFrequency) * Math.sin(dampedFrequency * t));
    };
    return decay;
  }
  if (zeta === 1) {
    return (t) => (t < 0 ? 1 : Math.exp(-omega0 * t) * (1 + omega0 * t));
  }
  const r1 = -zeta * omega0 + omega0 * Math.sqrt(zeta * zeta - 1);
  const r2 = -zeta * omega0 - omega0 * Math.sqrt(zeta * zeta - 1);
  const c2 = 1 / (1 - r2 / r1);
  const c1 = 1 - c2;
  return (t) => (t < 0 ? 1 : c1 * Math.exp(r1 * t) + c2 * Math.exp(r2 * t));
}

/**
 * Time in seconds until the displacement stays within `restDelta`.
 * Returns Infinity for an undamped (damping <= 0) spring.
 */
export function springSettleTime(cfg: ResolvedSpringConfig): number {
  const { omega0, zeta, dampedFrequency } = springDynamics(cfg);
  if (zeta <= 0) return Number.POSITIVE_INFINITY;
  if (zeta < 1) {
    // |x(t)| <= (1 + zeta*omega0/omegaD) * e^(-zeta*omega0*t)
    const amplitude = 1 + (zeta * omega0) / dampedFrequency;
    return Math.log(amplitude / cfg.restDelta) / (zeta * omega0);
  }
  if (zeta === 1) {
    // x(t) = e^(-omega0 t) (1 + omega0 t) is strictly decreasing for t >= 0
    const x = springDisplacement(cfg);
    let lo = 0;
    let hi = 1;
    while (Math.abs(x(hi)) > cfg.restDelta) hi *= 2;
    for (let i = 0; i < 80; i++) {
      const mid = (lo + hi) / 2;
      if (Math.abs(x(mid)) > cfg.restDelta) lo = mid;
      else hi = mid;
    }
    return hi;
  }
  // overdamped: |x(t)| <= (|c1| + |c2|) * e^(r1 t) with r1 < 0 the slower root
  const r1 = -zeta * omega0 + omega0 * Math.sqrt(zeta * zeta - 1);
  const r2 = -zeta * omega0 - omega0 * Math.sqrt(zeta * zeta - 1);
  const c2 = 1 / (1 - r2 / r1);
  const c1 = 1 - c2;
  const amplitude = Math.abs(c1) + Math.abs(c2);
  return Math.log(amplitude / cfg.restDelta) / -r1;
}

/** Peak absolute displacement over the whole settle interval (overshoot check). */
export function springMaxDisplacement(cfg: ResolvedSpringConfig): number {
  const x = springDisplacement(cfg);
  const settle = springSettleTime(cfg);
  let max = 1;
  const steps = 400;
  for (let i = 0; i <= steps; i++) {
    max = Math.max(max, Math.abs(x((i / steps) * settle)));
  }
  return max;
}