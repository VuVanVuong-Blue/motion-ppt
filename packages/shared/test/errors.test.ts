import { describe, expect, it } from 'vitest';
import {
  DataFormatError,
  InvalidArgumentError,
  MotionPptError,
  UnsupportedFeatureError,
  isMotionPptError,
} from '@motion-ppt/shared';

class SampleError extends MotionPptError {}

describe('MotionPptError', () => {
  it('is an instance of Error and MotionPptError', () => {
    const err = new MotionPptError('boom');
    expect(err).toBeInstanceOf(Error);
    expect(err).toBeInstanceOf(MotionPptError);
    expect(err.name).toBe('MotionPptError');
    expect(err.code).toBe('MOTION_PPT_ERROR');
    expect(err.message).toBe('boom');
  });

  it('uses the subclass name and custom code', () => {
    const err = new SampleError('nope', { code: 'SAMPLE' });
    expect(err.name).toBe('SampleError');
    expect(err.code).toBe('SAMPLE');
  });

  it('carries the cause when provided', () => {
    const cause = new Error('root cause');
    const err = new MotionPptError('wrapped', { cause });
    expect(err.cause).toBe(cause);
  });

  it('isMotionPptError narrows correctly', () => {
    expect(isMotionPptError(new MotionPptError('x'))).toBe(true);
    expect(isMotionPptError(new Error('x'))).toBe(false);
    expect(isMotionPptError('x')).toBe(false);
    expect(isMotionPptError(null)).toBe(false);
  });

  it('provides default codes for the generic error classes', () => {
    expect(new InvalidArgumentError('a').code).toBe('INVALID_ARGUMENT');
    expect(new UnsupportedFeatureError('a').code).toBe('UNSUPPORTED_FEATURE');
    expect(new DataFormatError('a').code).toBe('DATA_FORMAT');
    expect(new UnsupportedFeatureError('a').message).toContain('a');
  });
});
