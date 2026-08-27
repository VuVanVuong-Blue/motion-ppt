import { describe, expect, it } from 'vitest';
import {
  AssetNotFoundError,
  DuplicateIdError,
  ElementNotFoundError,
  InvalidPresentationError,
  SlideNotFoundError,
} from '@motion-ppt/core';
import { MotionPptError } from '@motion-ppt/shared';

describe('core errors', () => {
  it('all extend MotionPptError and expose stable codes', () => {
    expect(new SlideNotFoundError('s')).toBeInstanceOf(MotionPptError);
    expect(new SlideNotFoundError('s').code).toBe('SLIDE_NOT_FOUND');
    expect(new ElementNotFoundError('e').code).toBe('ELEMENT_NOT_FOUND');
    expect(new AssetNotFoundError('a').code).toBe('ASSET_NOT_FOUND');
    expect(new DuplicateIdError('x', 'slides').code).toBe('DUPLICATE_ID');
    expect(new InvalidPresentationError('bad').code).toBe('INVALID_PRESENTATION');
  });

  it('InvalidPresentationError includes a path prefix', () => {
    const err = new InvalidPresentationError('bad value', { path: 'presentation.slides[0].elements[1]' });
    expect(err.message).toBe('[presentation.slides[0].elements[1]] bad value');
  });
});
