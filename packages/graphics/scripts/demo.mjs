// Renders the demo deck to PNG frames: one static shot per slide plus
// animation frames at 0/25/50/75/100% of the timeline.
// Run with: pnpm --filter @motion-ppt/graphics demo
import { writeFileSync, mkdirSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createCanvas } from '@napi-rs/canvas';
import {
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
} from '@motion-ppt/core';
import { computeTimeline } from '@motion-ppt/animation';
import { SlideRenderer } from '@motion-ppt/graphics';

const here = dirname(fileURLToPath(import.meta.url));

// A tiny generated PNG asset (avoids fixture-path coupling).
function gradientPngDataUri() {
  const canvas = createCanvas(64, 64);
  const ctx = canvas.getContext('2d');
  const gradient = ctx.createLinearGradient(0, 0, 64, 64);
  gradient.addColorStop(0, '#3b82f6');
  gradient.addColorStop(1, '#8b5cf6');
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, 64, 64);
  return `data:image/png;base64,${canvas.toBuffer('image/png').toString('base64')}`;
}

const presentation = createPresentation({
  title: 'Motion PPT Graphics Demo',
  metadata: { author: 'Motion PPT' },
  assets: new Map([
    ['demo-png', { id: 'demo-png', sourceType: 'base64', uri: gradientPngDataUri(), mimeType: 'image/png', width: 64, height: 64 }],
  ]),
  slides: [
    createSlide({
      id: 'slide-1',
      width: 1280,
      height: 720,
      background: { color: '1F2937' },
      elements: [
        createTextElement({
          id: 'hero-title',
          transform: { x: 80, y: 200, width: 1120, height: 120 },
          content: { text: 'Motion PPT', fontSize: 64, bold: true, color: 'FFFFFF', align: 'center' },
        }),
        createTextElement({
          id: 'hero-subtitle',
          transform: { x: 80, y: 340, width: 1120, height: 60 },
          content: { text: 'Editable-first AI presentation animation engine', fontSize: 24, color: 'D1D5DB', align: 'center' },
        }),
        createShapeElement({
          id: 'hero-cta',
          transform: { x: 540, y: 440, width: 200, height: 60 },
          content: { shapeType: 'roundRect', fillColor: '3B82F6', cornerRadius: 12 },
        }),
      ],
    }),
    createSlide({
      id: 'slide-2',
      width: 1280,
      height: 720,
      background: { color: 'F3F4F6' },
      elements: [
        createShapeElement({
          id: 'card-bg',
          transform: { x: 100, y: 120, width: 300, height: 200 },
          content: { shapeType: 'roundRect', fillColor: '3B82F6', lineColor: 'FFFFFF', lineWidth: 2, cornerRadius: 16 },
        }),
        createImageElement({
          id: 'card-img',
          transform: { x: 480, y: 120, width: 200, height: 200 },
          content: { sourceId: 'demo-png' },
        }),
        createTextElement({
          id: 'card-text',
          transform: { x: 760, y: 120, width: 400, height: 200, rotation: 12, opacity: 0.85 },
          content: { text: 'Native shapes, text and images - all editable.', fontSize: 20, color: '111827', align: 'left', verticalAlign: 'top' },
        }),
        createGroupElement({
          id: 'card-group',
          transform: { x: 100, y: 420, width: 220, height: 80 },
          children: [
            createShapeElement({
              id: 'group-bg',
              transform: { x: 0, y: 0, width: 220, height: 80 },
              content: { shapeType: 'rect', fillColor: '10B981' },
            }),
            createTextElement({
              id: 'group-label',
              transform: { x: 0, y: 0, width: 220, height: 80 },
              content: { text: 'Grouped', fontSize: 16, color: 'FFFFFF', align: 'center', verticalAlign: 'middle' },
            }),
          ],
        }),
      ],
    }),
  ],
});

const plan1 = {
  slideId: 'slide-1',
  version: '2.0',
  metadata: { intent: 'Hero entrance', generatedBy: 'graphics demo' },
  animations: [
    { id: 'title-in', target: 'hero-title', effect: 'fadeIn', start: 0, duration: 0.5 },
    { id: 'subtitle-in', target: 'hero-subtitle', effect: 'slideIn', start: 0.3, duration: 0.6, options: { direction: 'bottom' } },
    { id: 'cta-zoom', target: 'hero-cta', effect: 'zoomIn', start: 0.9, duration: 0.4 },
  ],
};

const plan2 = {
  slideId: 'slide-2',
  version: '2.0',
  metadata: { intent: 'Card stagger', generatedBy: 'graphics demo' },
  animations: [
    { id: 'card-stagger', targets: ['card-bg', 'card-img', 'card-text'], effect: 'fadeIn', start: 0.2, duration: 0.5, stagger: { delay: 0.15 } },
    { id: 'group-in', targets: ['group-bg', 'group-label'], effect: 'fadeIn', start: 1.2, duration: 0.4, stagger: { delay: 0.1 } },
  ],
};

const renderer = new SlideRenderer();
const outDir = join(here, '../../../scratch/graphics');
mkdirSync(outDir, { recursive: true });

const timeline1 = computeTimeline(plan1);
const timeline2 = computeTimeline(plan2);

for (const [name, slide, plan, timeline] of [
  ['slide-1', presentation.slides[0], plan1, timeline1],
  ['slide-2', presentation.slides[1], plan2, timeline2],
]) {
  const staticResult = await renderer.renderStatic(presentation, slide);
  writeFileSync(join(outDir, `${name}-static.png`), staticResult.buffer);
  console.log(`Wrote ${name}-static.png (${staticResult.buffer.length} bytes)`);
  if (staticResult.warnings.length > 0) console.log(`  warnings: ${staticResult.warnings.join(' | ')}`);

  for (const [i, fraction] of [0, 0.25, 0.5, 0.75, 1].entries()) {
    const t = fraction * timeline.duration;
    const result = await renderer.renderFrame(presentation, slide, plan, t);
    const file = join(outDir, `${name}-frame-${String(i).padStart(2, '0')}.png`);
    writeFileSync(file, result.buffer);
    console.log(`Wrote ${file} (t=${t.toFixed(2)}s, ${result.buffer.length} bytes)`);
    for (const warning of result.warnings) console.log(`  warning: ${warning}`);
  }
}
