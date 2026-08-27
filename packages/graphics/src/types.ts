/**
 * Types shared by the @motion-ppt/graphics renderers.
 *
 * The package rasterizes `Presentation`/`Slide` models from @motion-ppt/core
 * and applies resolved animation timelines from @motion-ppt/animation as
 * per-frame visual states. Everything is expressible without a DOM so the
 * renderer runs in Node (frame export, generated assets, previews).
 */

/**
 * The per-frame visual delta applied to an element on top of its base
 * `Transform`. `opacity` multiplies the base opacity; `translateX`/`translateY`
 * are in slide px; `scaleX`/`scaleY` and `rotation` (clockwise degrees) are
 * applied around the element's center.
 */
export interface ElementVisualState {
  opacity: number;
  translateX: number;
  translateY: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
}

/** The neutral state: no visual change applied. */
export const IDENTITY_VISUAL_STATE: Readonly<ElementVisualState> = {
  opacity: 1,
  translateX: 0,
  translateY: 0,
  scaleX: 1,
  scaleY: 1,
  rotation: 0,
};

export interface RenderOptions {
  /** Output scale factor relative to slide pixels (1 = 1:1). Defaults to 1. */
  scale?: number;
}

/** Result of rasterizing a slide or an animation frame. */
export interface FrameResult {
  /** Encoded PNG bytes. */
  buffer: Buffer;
  /** Output width in px (slide width × scale). */
  width: number;
  /** Output height in px (slide height × scale). */
  height: number;
  /** Non-fatal issues collected during rendering (missing assets, skips). */
  warnings: string[];
}
