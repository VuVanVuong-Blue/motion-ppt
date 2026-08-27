import { describe, expect, it } from 'vitest';
import { EASING_FUNCTIONS, resolveEasing } from '@motion-ppt/animation';
import { UnknownEasingError } from '@motion-ppt/animation';

const NON_BACK_EASINGS = [
  'linear',
  'easeIn',
  'easeOut',
  'easeInOut',
  'easeInCubic',
  'easeOutCubic',
  'easeInOutCubic',
  'ease-m3-emphasized',
  'ease-m3-decelerate',
  'ease-apple-fluid',
  'ease-cinematic',
] as const;

describe('easing functions', () => {
  it.each(NON_BACK_EASINGS)('%s satisfies f(0)=0 and f(1)=1', (name) => {
    const fn = EASING_FUNCTIONS[name];
    expect(fn(0)).toBeCloseTo(0, 9);
    expect(fn(1)).toBeCloseTo(1, 9);
  });

  it.each(NON_BACK_EASINGS)('%s is non-decreasing over [0,1]', (name) => {
    const fn = EASING_FUNCTIONS[name];
    let prev = fn(0);
    for (let i = 1; i <= 100; i++) {
      const value = fn(i / 100);
      expect(value).toBeGreaterThanOrEqual(prev - 1e-9);
      prev = value;
    }
  });

  it('back easings satisfy the boundaries and stay within a sane range', () => {
    for (const name of ['easeOutBack', 'easeInOutBack'] as const) {
      const fn = EASING_FUNCTIONS[name];
      expect(fn(0)).toBeCloseTo(0, 9);
      expect(fn(1)).toBeCloseTo(1, 9);
      for (let i = 0; i <= 100; i++) {
        const value = fn(i / 100);
        expect(value).toBeGreaterThanOrEqual(-0.3);
        expect(value).toBeLessThanOrEqual(1.3);
      }
    }
  });

  it('resolveEasing clamps inputs outside [0, 1]', () => {
    expect(resolveEasing('linear')(-5)).toBe(0);
    expect(resolveEasing('linear')(5)).toBe(1);
    expect(resolveEasing('easeOutCubic')(-1)).toBe(0);
  });

  it('resolveEasing supports spring configs', () => {
    const springFn = resolveEasing('spring', { preset: 'bouncy' });
    expect(springFn(0)).toBeCloseTo(0, 6);
    expect(springFn(1)).toBeCloseTo(1, 2);
  });

  it('resolveEasing throws UnknownEasingError for unknown names', () => {
    expect(() => resolveEasing('not-an-easing' as never)).toThrow(UnknownEasingError);
  });
});