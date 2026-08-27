import { describe, expect, it } from 'vitest';
import { createCanvas, loadImage } from '@napi-rs/canvas';
import {
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
} from '@motion-ppt/core';
import type { Presentation, SlideElement } from '@motion-ppt/core';
import { computeTimeline } from '@motion-ppt/animation';
import type { AnimationItem, AnimationPlan } from '@motion-ppt/animation';
import { SlideRenderer } from '@motion-ppt/graphics';

function redPngDataUri(): string {
  const canvas = createCanvas(10, 10);
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#ff0000';
  ctx.fillRect(0, 0, 10, 10);
  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
}

const RED_PNG = redPngDataUri();

function deck(elements: SlideElement[], background = 'FFFFFF'): Presentation {
  return createPresentation({
    title: 'T',
    assets: new Map([['red', { id: 'red', sourceType: 'base64', uri: RED_PNG, mimeType: 'image/png' }]]),
    slides: [createSlide({ id: 's1', width: 200, height: 120, background: { color: background }, elements })],
  });
}

/** Decodes a PNG and returns the RGBA of one pixel. */
async function pixelAt(buffer: Buffer, x: number, y: number): Promise<[number, number, number, number]> {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(x, y, 1, 1).data;
  return [data[0]!, data[1]!, data[2]!, data[3]!];
}

async function countNonWhitePixels(buffer: Buffer, x: number, y: number, w: number, h: number): Promise<number> {
  const img = await loadImage(buffer);
  const canvas = createCanvas(img.width, img.height);
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0);
  const data = ctx.getImageData(x, y, w, h).data;
  let count = 0;
  for (let i = 0; i < data.length; i += 4) {
    if (data[i]! < 245 || data[i + 1]! < 245 || data[i + 2]! < 245) count++;
  }
  return count;
}

const renderer = new SlideRenderer();
const RED_RECT: SlideElement = createShapeElement({
  id: 'rect',
  transform: { x: 10, y: 10, width: 40, height: 40 },
  content: { shapeType: 'rect', fillColor: 'FF0000' },
});

describe('SlideRenderer.renderStatic', () => {
  it('produces a valid PNG buffer', async () => {
    const p = deck([]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(result.width).toBe(200);
    expect(result.height).toBe(120);
    expect([...result.buffer.subarray(0, 4)]).toEqual([0x89, 0x50, 0x4e, 0x47]);
  });

  it('paints the background color', async () => {
    const p = deck([], '112233');
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(await pixelAt(result.buffer, 5, 5)).toEqual([0x11, 0x22, 0x33, 255]);
  });

  it('draws a filled shape at its transform', async () => {
    const p = deck([RED_RECT]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(await pixelAt(result.buffer, 30, 30)).toEqual([255, 0, 0, 255]);
    expect(await pixelAt(result.buffer, 5, 5)).toEqual([255, 255, 255, 255]);
  });

  it('composites element opacity over the background', async () => {
    const half = createShapeElement({
      id: 'rect',
      transform: { x: 10, y: 10, width: 40, height: 40, opacity: 0.5 },
      content: { shapeType: 'rect', fillColor: '000000' },
    });
    const p = deck([half]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    const [r] = await pixelAt(result.buffer, 30, 30);
    expect(r).toBeGreaterThan(120);
    expect(r).toBeLessThan(135);
  });

  it('draws a raster image from a base64 asset', async () => {
    const img = createImageElement({
      id: 'img',
      transform: { x: 50, y: 50, width: 40, height: 40 },
      content: { sourceId: 'red' },
    });
    const p = deck([img]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(await pixelAt(result.buffer, 70, 70)).toEqual([255, 0, 0, 255]);
  });

  it('renders text as non-background pixels', async () => {
    const txt = createTextElement({
      id: 'txt',
      transform: { x: 20, y: 50, width: 80, height: 20 },
      content: { text: 'Hi', fontSize: 16, color: '000000' },
    });
    const p = deck([txt]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(await countNonWhitePixels(result.buffer, 20, 50, 80, 20)).toBeGreaterThan(0);
  });

  it('flattens groups with translation', async () => {
    const group = createGroupElement({
      id: 'g',
      transform: { x: 100, y: 10, width: 20, height: 20 },
      children: [
        createShapeElement({
          id: 'child',
          transform: { x: 0, y: 0, width: 20, height: 20 },
          content: { shapeType: 'rect', fillColor: 'FF0000' },
        }),
      ],
    });
    const p = deck([group]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(await pixelAt(result.buffer, 110, 20)).toEqual([255, 0, 0, 255]);
    expect(await pixelAt(result.buffer, 95, 20)).toEqual([255, 255, 255, 255]);
  });

  it('warns about missing assets and reserved asset_overlay elements', async () => {
    const overlay: SlideElement = {
      id: 'ovl',
      type: 'asset_overlay',
      transform: { x: 0, y: 0, width: 10, height: 10 },
      content: { sourceId: 'red' },
    };
    const missing = createImageElement({
      id: 'missing',
      transform: { x: 0, y: 0, width: 10, height: 10 },
      content: { sourceId: 'nope' },
    });
    const p = deck([missing, overlay]);
    const result = await renderer.renderStatic(p, p.slides[0]!);
    expect(result.warnings.some((w) => w.includes('nope'))).toBe(true);
    expect(result.warnings.some((w) => w.includes('asset_overlay'))).toBe(true);
  });
});

describe('SlideRenderer.renderFrame', () => {
  function fadePlan(effect: string): AnimationPlan {
    const animations: AnimationItem[] = [{ id: 'a', target: 'rect', effect, start: 0, duration: 0.5, easing: 'linear' }];
    return { slideId: 's1', version: '2.0', animations };
  }

  it('fades the shape in over time', async () => {
    const p = deck([RED_RECT]);
    const plan = fadePlan('fadeIn');
    const hidden = await renderer.renderFrame(p, p.slides[0]!, plan, 0);
    expect(await pixelAt(hidden.buffer, 30, 30)).toEqual([255, 255, 255, 255]);
    const visible = await renderer.renderFrame(p, p.slides[0]!, plan, 0.5);
    expect(await pixelAt(visible.buffer, 30, 30)).toEqual([255, 0, 0, 255]);
  });

  it('keeps the settled state after the animation ends', async () => {
    const p = deck([RED_RECT]);
    const result = await renderer.renderFrame(p, p.slides[0]!, fadePlan('fadeIn'), 2);
    expect(await pixelAt(result.buffer, 30, 30)).toEqual([255, 0, 0, 255]);
  });

  it('applies morph translation from a source snapshot', async () => {
    const p = deck([RED_RECT]);
    const morphFrom = new Map([['rect', { dx: 50, dy: 0, scaleX: 1, scaleY: 1, rotation: 0, opacity: 1 }]]);
    const atStart = await renderer.renderFrame(p, p.slides[0]!, fadePlan('morph'), 0, { morphFrom });
    expect(await pixelAt(atStart.buffer, 30, 30)).toEqual([255, 255, 255, 255]); // shifted right
    expect(await pixelAt(atStart.buffer, 70, 30)).toEqual([255, 0, 0, 255]);
  });

  it('accepts a pre-computed timeline', async () => {
    const p = deck([RED_RECT]);
    const timeline = computeTimeline(fadePlan('fadeIn'));
    const result = await renderer.renderFrame(p, p.slides[0]!, timeline, 0.5);
    expect(await pixelAt(result.buffer, 30, 30)).toEqual([255, 0, 0, 255]);
  });
});
