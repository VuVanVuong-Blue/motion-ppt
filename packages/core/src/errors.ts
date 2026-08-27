import { MotionPptError } from '@motion-ppt/shared';

/** Thrown when a slide cannot be found in a presentation. */
export class SlideNotFoundError extends MotionPptError {
  constructor(slideId: string, options: { cause?: unknown } = {}) {
    super(`Slide not found: ${slideId}`, { ...options, code: 'SLIDE_NOT_FOUND' });
  }
}

/** Thrown when a slide element cannot be found (searches nested groups). */
export class ElementNotFoundError extends MotionPptError {
  constructor(elementId: string, options: { cause?: unknown } = {}) {
    super(`Element not found: ${elementId}`, { ...options, code: 'ELEMENT_NOT_FOUND' });
  }
}

/** Thrown when an asset cannot be found in a presentation. */
export class AssetNotFoundError extends MotionPptError {
  constructor(assetId: string, options: { cause?: unknown } = {}) {
    super(`Asset not found: ${assetId}`, { ...options, code: 'ASSET_NOT_FOUND' });
  }
}

/** Thrown when an id is used more than once within the same scope. */
export class DuplicateIdError extends MotionPptError {
  constructor(id: string, scope: string, options: { cause?: unknown } = {}) {
    super(`Duplicate id "${id}" in ${scope}`, { ...options, code: 'DUPLICATE_ID' });
  }
}

/** Thrown when a presentation/slide/element payload fails structural validation. */
export class InvalidPresentationError extends MotionPptError {
  constructor(message: string, options: { cause?: unknown; path?: string } = {}) {
    const prefix = options.path ? `[${options.path}] ` : '';
    super(`${prefix}${message}`, { ...options, code: 'INVALID_PRESENTATION' });
  }
}
