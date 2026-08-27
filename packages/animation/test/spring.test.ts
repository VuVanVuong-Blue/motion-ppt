import { describe, expect, it } from 'vitest';
import {
  SPRING_PRESETS,
  resolveSpringConfig,
  springDisplacement,
  springSettleTime,
} from '@motion-ppt/animation';
import { InvalidArgumentError } from '@motion-ppt/shared';

describe('resolveSpringConfig', () => {
  it('uses package defaults when no config is given', () => {
    expect(resolveSpringConfig()).toEqual({ mass: 1, stiffness: 260, damping: 20, restDelta: 0.001 });
  });

  it('expands presets', () => {
    expect(resolveSpringConfig({ preset: 'bouncy' })).toEqual({ mass: 1, stiffness: 200, damping: 10, restDelta: 0.001 });
    expect(resolveSpringConfig({ preset: 'cinematicHeavy' })).toEqual({ mass: 2, stiffness: 80, damping: 18, restDelta: 0.001 });
  });

  it('applies overrides on top of presets', () => {
    const cfg = resolveSpringConfig({ preset: 'default', damping: 40 });
    expect(cfg.damping).toBe(40);
    expect(cfg.stiffness).toBe(260);
    expect(cfg.mass).toBe(1);
  });

  it('rejects non-positive parameters', () => {
    expect(() => resolveSpringConfig({ mass: 0 })).toThrow(InvalidArgumentError);
    expect(() => resolveSpringConfig({ stiffness: -1 })).toThrow(InvalidArgumentError);
    expect(() => resolveSpringConfig({ damping: 0 })).toThrow(InvalidArgumentError);
    expect(() => resolveSpringConfig({ restDelta: 1 })).toThrow(InvalidArgumentError);
  });
});

describe('spring dynamics', () => {
  it('starts fully displaced and settles within restDelta', () => {
    const cfg = resolveSpringConfig({ preset: 'gentle' });
    const x = springDisplacement(cfg);
    const settle = springSettleTime(cfg);
    expect(x(0)).toBeCloseTo(1, 6);
    expect(Math.abs(x(settle))).toBeLessThanOrEqual(cfg.restDelta + 1e-9);
    expect(Math.abs(x(settle * 2))).toBeLessThanOrEqual(cfg.restDelta + 1e-9);
  });

  it('settle times are finite and positive for every preset', () => {
    for (const preset of Object.keys(SPRING_PRESETS) as Array<keyof typeof SPRING_PRESETS>) {
      const settle = springSettleTime(resolveSpringConfig({ preset }));
      expect(settle).toBeGreaterThan(0);
      expect(settle).toBeLessThan(5);
    }
  });

  it('underdamped springs overshoot past the target', () => {
    const bouncy = springDisplacement(resolveSpringConfig({ preset: 'bouncy' }));
    let min = 1;
    for (let i = 0; i <= 400; i++) min = Math.min(min, bouncy(i / 400));
    expect(min).toBeLessThan(0);

    const gentle = springDisplacement(resolveSpringConfig({ preset: 'gentle' }));
    let minGentle = 1;
    for (let i = 0; i <= 400; i++) minGentle = Math.min(minGentle, gentle(i / 400));
    expect(minGentle).toBeLessThan(0);
  });

  it('critically damped springs do not overshoot past the target', () => {
    const critical = resolveSpringConfig({ preset: 'default', damping: 2 * Math.sqrt(260) });
    const x = springDisplacement(critical);
    let min = 1;
    for (let i = 0; i <= 400; i++) min = Math.min(min, x(i / 400));
    expect(min).toBeGreaterThanOrEqual(0);
  });

  it('overdamped springs decay without oscillation', () => {
    const overdamped = resolveSpringConfig({ preset: 'default', damping: 200 });
    const x = springDisplacement(overdamped);
    expect(x(0)).toBeCloseTo(1, 6);
    let prev = x(0);
    for (let i = 1; i <= 50; i++) {
      const value = x(i / 50);
      expect(value).toBeLessThanOrEqual(prev + 1e-9);
      expect(value).toBeGreaterThanOrEqual(0);
      prev = value;
    }
  });
});