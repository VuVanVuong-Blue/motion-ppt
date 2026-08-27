/**
 * Slide renderer: rasterizes a {@link Slide} (static) or a timeline frame
 * (animated) into a PNG buffer using the canvas backend.
 */
import { loadImage, type Image, type SKRSContext2D } from '@napi-rs/canvas';
import { existsSync, readFileSync } from 'node:fs';
import { computeTimeline } from '@motion-ppt/animation';
import type { AnimationPlan, Timeline } from '@motion-ppt/animation';
import type { AssetReference, Presentation, Slide } from '@motion-ppt/core';
import { createSurface, encodePng, hexToColor, registerFallbackFonts } from './canvas.js';
import { drawElement, type DrawContext } from './draw.js';
import { frameStatesAt, type MorphDelta } from './playback.js';
import { IDENTITY_VISUAL_STATE, type FrameResult, type RenderOptions } from './types.js';

export interface RenderFrameOptions extends RenderOptions {
  /** Per-target morph source deltas for cross-slide morph playback. */
  morphFrom?: ReadonlyMap<string, MorphDelta>;
}

/**
 * Rasterizes slides and animation frames. Instances are stateless; reuse one
 * renderer across a whole deck.
 */
export class SlideRenderer {
  /** Renders a slide in its final (unanimated) state. */
  async renderStatic(presentation: Presentation, slide: Slide, options: RenderOptions = {}): Promise<FrameResult> {
    return this.render(presentation, slide, undefined, undefined, options);
  }

  /**
   * Renders the animation frame at time `t` (seconds). Accepts either a
   * resolved {@link Timeline} or a raw {@link AnimationPlan} (compiled on the
   * fly via `computeTimeline`).
   */
  async renderFrame(
    presentation: Presentation,
    slide: Slide,
    timeline: Timeline | AnimationPlan,
    t: number,
    options: RenderFrameOptions = {},
  ): Promise<FrameResult> {
    const resolved = isTimeline(timeline) ? timeline : computeTimeline(timeline);
    return this.render(presentation, slide, resolved, t, options);
  }

  private async render(
    presentation: Presentation,
    slide: Slide,
    timeline: Timeline | undefined,
    t: number | undefined,
    options: RenderFrameOptions,
  ): Promise<FrameResult> {
    registerFallbackFonts();
    const scale = options.scale ?? 1;
    const surface = createSurface(slide.width * scale, slide.height * scale);
    const rawWarnings: string[] = [];
    const images = await preloadImages(presentation.assets, rawWarnings);
    const dc: DrawContext = { assets: presentation.assets, images, warnings: rawWarnings };

    surface.ctx.save();
    surface.ctx.scale(scale, scale);
    drawBackground(surface.ctx, slide, dc);

    if (timeline) {
      const states = frameStatesAt(timeline, t ?? 0, {
        bounds: boundsOf(slide),
        morphFrom: options.morphFrom,
      });
      for (const entry of states.targets.values()) rawWarnings.push(...entry.warnings);
      for (const element of slide.elements) {
        const state = states.targets.get(element.id)?.state ?? { ...IDENTITY_VISUAL_STATE };
        drawElement(surface.ctx, element, dc, { opacity: 1, state });
      }
    } else {
      for (const element of slide.elements) {
        drawElement(surface.ctx, element, dc, { opacity: 1, state: { ...IDENTITY_VISUAL_STATE } });
      }
    }
    surface.ctx.restore();

    return {
      buffer: encodePng(surface.canvas),
      width: surface.width,
      height: surface.height,
      warnings: [...new Set(rawWarnings)],
    };
  }
}

/** Per-top-level-element bounds map used by playback defaults. */
function boundsOf(slide: Slide): Record<string, { width: number; height: number }> {
  const bounds: Record<string, { width: number; height: number }> = {};
  for (const element of slide.elements) {
    bounds[element.id] = { width: element.transform.width, height: element.transform.height };
  }
  return bounds;
}

function drawBackground(ctx: SKRSContext2D, slide: Slide, dc: DrawContext): void {
  const bg = slide.background;
  if (bg?.color) {
    ctx.fillStyle = hexToColor(bg.color);
    ctx.fillRect(0, 0, slide.width, slide.height);
    return;
  }
  if (bg?.imageAssetId) {
    const image = dc.images.get(bg.imageAssetId);
    if (image) {
      const scale = Math.max(slide.width / image.width, slide.height / image.height);
      const dw = image.width * scale;
      const dh = image.height * scale;
      ctx.drawImage(image, (slide.width - dw) / 2, (slide.height - dh) / 2, dw, dh);
    } else {
      dc.warnings.push(`background image asset "${bg.imageAssetId}" is missing; slide left blank.`);
    }
    return;
  }
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, slide.width, slide.height);
}

/** Preloads every image asset; undecodable/missing assets become warnings. */
async function preloadImages(
  assets: ReadonlyMap<string, AssetReference>,
  warnings: string[],
): Promise<Map<string, Image>> {
  const images = new Map<string, Image>();
  for (const asset of assets.values()) {
    if (!asset.mimeType.startsWith('image/')) continue;
    try {
      let source: Buffer;
      if (asset.sourceType === 'file') {
        if (!existsSync(asset.uri)) {
          warnings.push(`Asset "${asset.id}" file not found: ${asset.uri}`);
          continue;
        }
        source = readFileSync(asset.uri);
      } else if (asset.sourceType === 'base64') {
        const comma = asset.uri.indexOf(',');
        source = Buffer.from(comma >= 0 ? asset.uri.slice(comma + 1) : asset.uri, 'base64');
      } else {
        warnings.push(`Asset "${asset.id}" uses unsupported sourceType "${asset.sourceType}"; skipped.`);
        continue;
      }
      images.set(asset.id, await loadImage(source));
    } catch {
      warnings.push(`Asset "${asset.id}" could not be decoded; skipped.`);
    }
  }
  return images;
}

function isTimeline(value: Timeline | AnimationPlan): value is Timeline {
  return typeof (value as Timeline).duration === 'number';
}
