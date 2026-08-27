// Generates demo .pptx files from the Motion PPT domain model.
// Run with: pnpm --filter @motion-ppt/pptx demo
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import {
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
} from '@motion-ppt/core';
import { PresentationWriter, writeAnimatedPresentation } from '@motion-ppt/pptx';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '../test/fixtures/tiny.png');

const presentation = createPresentation({
  title: 'Motion PPT Demo',
  metadata: { author: 'Motion PPT' },
  assets: new Map([['demo-png', { id: 'demo-png', sourceType: 'file', uri: fixture, mimeType: 'image/png' }]]),
  slides: [
    createSlide({
      id: 'slide-1',
      width: 1280,
      height: 720,
      background: { color: '1F2937' },
      notes: 'Welcome to Motion PPT. Everything here stays editable in PowerPoint.',
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
          content: { shapeType: 'roundRect', fillColor: '3B82F6' },
        }),
      ],
    }),
    createSlide({
      id: 'slide-2',
      width: 1280,
      height: 720,
      elements: [
        createShapeElement({
          id: 'card-bg',
          transform: { x: 100, y: 120, width: 300, height: 200 },
          content: { shapeType: 'roundRect', fillColor: '3B82F6', lineColor: 'FFFFFF', lineWidth: 2 },
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
          transform: { x: 100, y: 420 },
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

// --- 1. Static deck ---
const writer = new PresentationWriter();
const { buffer, warnings } = await writer.write(presentation, { author: 'Motion PPT Demo' });
const outDir = join(here, '../../../scratch');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'demo.pptx');
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${buffer.length} bytes)`);

// --- 2. Animated deck (native PowerPoint timings, Tier 2) ---
const plan = {
  slideId: 'slide-1',
  version: '2.0',
  metadata: { intent: 'Hero entrance', generatedBy: 'demo.mjs' },
  animations: [
    { id: 'title-in', target: 'hero-title', effect: 'fadeIn', start: 0, duration: 0.5 },
    { id: 'subtitle-in', target: 'hero-subtitle', effect: 'slideIn', start: 0.3, duration: 0.6, options: { direction: 'bottom' } },
    { id: 'cta-zoom', target: 'hero-cta', effect: 'zoomIn', start: 0.9, duration: 0.4 },
  ],
};
const plan2 = {
  slideId: 'slide-2',
  version: '2.0',
  metadata: { intent: 'Card stagger', generatedBy: 'demo.mjs' },
  animations: [
    { id: 'card-stagger', targets: ['card-bg', 'card-img', 'card-text'], effect: 'fadeIn', start: 0.2, duration: 0.5, stagger: { delay: 0.15 } },
    { id: 'group-in', targets: ['group-bg', 'group-label'], effect: 'fadeIn', start: 1.2, duration: 0.4, stagger: { delay: 0.1 } },
  ],
};

const { buffer: animated, warnings: animatedWarnings } = await writeAnimatedPresentation(presentation, [plan, plan2]);
const animatedPath = join(outDir, 'demo-animated.pptx');
writeFileSync(animatedPath, animated);
console.log(`Wrote ${animatedPath} (${animated.length} bytes) — native <p:timing> injected`);

for (const [label, list] of [
  ['writer warnings', warnings],
  ['animation warnings', animatedWarnings],
]) {
  if (list.length > 0) {
    console.log(`${label}:`);
    for (const warning of list) console.log(` - ${warning}`);
  }
}