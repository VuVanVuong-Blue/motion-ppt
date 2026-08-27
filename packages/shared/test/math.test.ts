import { describe, expect, it } from 'vitest';
import { clamp, lerp, normalizeDegrees, remap, round } from '@motion-ppt/shared';
import { InvalidArgumentError } from '@motion-ppt/shared';

describe('clamp', () => {
  it('clamps values into the inclusive range', () => {
    expect(clamp(5, 0, 10)).toBe(5);
    expect(clamp(-1, 0, 10)).toBe(0);
    expect(clamp(11, 0, 10)).toBe(10);
    expect(clamp(0, 0, 10)).toBe(0);
    expect(clamp(10, 0, 10)).toBe(10);
  });

  it('throws when the range is inverted', () => {
    expect(() => clamp(1, 5, 2)).toThrow(InvalidArgumentError);
  });
});

describe('lerp', () => {
  it('interpolates linearly', () => {
    expect(lerp(0, 10, 0)).toBe(0);
    expect(lerp(0, 10, 1)).toBe(10);
    expect(lerp(0, 10, 0.5)).toBe(5);
    expect(lerp(10, 0, 0.25)).toBe(7.5);
  });
});

describe('remap', () => {
  it('maps between ranges', () => {
    expect(remap(0.5, 0, 1, 0, 100)).toBe(50);
    expect(remap(0, 0, 1, 100, 0)).toBe(100);
  });

  it('extrapolates outside the source range unless clamped', () => {
    expect(remap(2, 0, 1, 0, 10)).toBe(20);
    expect(remap(2, 0, 1, 0, 10, true)).toBe(10);
  });

  it('throws on a zero-width source range', () => {
    expect(() => remap(1, 5, 5, 0, 10)).toThrow(InvalidArgumentError);
  });
});

describe('round & normalizeDegrees', () => {
  it('rounds to decimal places', () => {
    expect(round(1.23456, 2)).toBe(1.23);
    expect(round(1.5)).toBe(2);
  });

  it('normalizes degrees into [0, 360)', () => {
    expect(normalizeDegrees(45)).toBe(45);
    expect(normalizeDegrees(-45)).toBe(315);
    expect(normalizeDegrees(720)).toBe(0);
    expect(normalizeDegrees(370)).toBe(10);
  });
});
