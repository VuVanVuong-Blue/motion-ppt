import { describe, expect, it } from 'vitest';
import {
  isArray,
  isBoolean,
  isFiniteNumber,
  isNonEmptyString,
  isObject,
  isRecord,
  isString,
  optionalBoolean,
  optionalNumber,
  optionalString,
} from '@motion-ppt/shared';

describe('primitive guards', () => {
  it('isObject excludes null but includes arrays', () => {
    expect(isObject({})).toBe(true);
    expect(isObject([])).toBe(true);
    expect(isObject(null)).toBe(false);
    expect(isObject('x')).toBe(false);
  });

  it('isRecord excludes arrays', () => {
    expect(isRecord({ a: 1 })).toBe(true);
    expect(isRecord([])).toBe(false);
    expect(isRecord(null)).toBe(false);
  });

  it('isString / isNonEmptyString / isBoolean / isFiniteNumber', () => {
    expect(isString('x')).toBe(true);
    expect(isString(1)).toBe(false);
    expect(isNonEmptyString('x')).toBe(true);
    expect(isNonEmptyString('')).toBe(false);
    expect(isBoolean(true)).toBe(true);
    expect(isBoolean(0)).toBe(false);
    expect(isFiniteNumber(1.5)).toBe(true);
    expect(isFiniteNumber(Number.NaN)).toBe(false);
    expect(isFiniteNumber(Number.POSITIVE_INFINITY)).toBe(false);
    expect(isArray([1])).toBe(true);
    expect(isArray('x')).toBe(false);
  });
});

describe('optional readers', () => {
  it('optionalString returns undefined for wrong types', () => {
    expect(optionalString({ a: 'x' }, 'a')).toBe('x');
    expect(optionalString({ a: 1 }, 'a')).toBeUndefined();
    expect(optionalString({}, 'a')).toBeUndefined();
  });

  it('optionalNumber rejects NaN/Infinity', () => {
    expect(optionalNumber({ a: 3 }, 'a')).toBe(3);
    expect(optionalNumber({ a: Number.NaN }, 'a')).toBeUndefined();
    expect(optionalNumber({ a: '3' }, 'a')).toBeUndefined();
  });

  it('optionalBoolean', () => {
    expect(optionalBoolean({ a: true }, 'a')).toBe(true);
    expect(optionalBoolean({ a: 1 }, 'a')).toBeUndefined();
  });
});
