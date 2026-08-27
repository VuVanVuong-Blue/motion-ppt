import { MotionPptError } from '@motion-ppt/shared';

/** Thrown when a slide cannot be rasterized (canvas creation, drawing failure). */
export class CanvasRenderError extends MotionPptError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, code: 'CANVAS_RENDER' });
  }
}

/** Thrown when an asset referenced by an image element cannot be decoded. */
export class AssetDecodeError extends MotionPptError {
  constructor(assetId: string, options: { cause?: unknown } = {}) {
    super(`Asset could not be decoded: ${assetId}`, { ...options, code: 'ASSET_DECODE' });
  }
}
