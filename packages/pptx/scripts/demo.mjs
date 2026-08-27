// Generates a demo .pptx from the Motion PPT domain model.
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
import { PresentationWriter } from '@motion-ppt/pptx';

const here = dirname(fileURLToPath(import.meta.url));
const fixture = join(here, '../test/fixtures/tiny.png');

const presentation = createPresentation({
  title: 'Motion PPT Demo',
  metadata: { author: 'Motion PPT' },
  assets: new Map([['demo-png', { id: 'demo-png', sourceType: 'file', uri: fixture, mimeType: 'image/png' }]]),
  slides: [
    createSlide({
      width: 1280,
      height: 720,
      background: { color: '1F2937' },
      notes: 'Welcome to Motion PPT. Everything here stays editable in PowerPoint.',
      elements: [
        createTextElement({
          transform: { x: 80, y: 200, width: 1120, height: 120 },
          content: { text: 'Motion PPT', fontSize: 64, bold: true, color: 'FFFFFF', align: 'center' },
        }),
        createTextElement({
          transform: { x: 80, y: 340, width: 1120, height: 60 },
          content: { text: 'Editable-first AI presentation animation engine', fontSize: 24, color: 'D1D5DB', align: 'center' },
        }),
        createShapeElement({
          transform: { x: 540, y: 440, width: 200, height: 60 },
          content: { shapeType: 'roundRect', fillColor: '3B82F6' },
        }),
      ],
    }),
    createSlide({
      width: 1280,
      height: 720,
      elements: [
        createShapeElement({
          transform: { x: 100, y: 120, width: 300, height: 200 },
          content: { shapeType: 'roundRect', fillColor: '3B82F6', lineColor: 'FFFFFF', lineWidth: 2 },
        }),
        createImageElement({
          transform: { x: 480, y: 120, width: 200, height: 200 },
          content: { sourceId: 'demo-png' },
        }),
        createTextElement({
          transform: { x: 760, y: 120, width: 400, height: 200, rotation: 12, opacity: 0.85 },
          content: { text: 'Native shapes, text and images - all editable.', fontSize: 20, color: '111827', align: 'left', verticalAlign: 'top' },
        }),
        createGroupElement({
          transform: { x: 100, y: 420 },
          children: [
            createShapeElement({
              transform: { x: 0, y: 0, width: 220, height: 80 },
              content: { shapeType: 'rect', fillColor: '10B981' },
            }),
            createTextElement({
              transform: { x: 0, y: 0, width: 220, height: 80 },
              content: { text: 'Grouped', fontSize: 16, color: 'FFFFFF', align: 'center', verticalAlign: 'middle' },
            }),
          ],
        }),
      ],
    }),
  ],
});

const writer = new PresentationWriter();
const { buffer, warnings } = await writer.write(presentation, { author: 'Motion PPT Demo' });
const outDir = join(here, '../../../scratch');
mkdirSync(outDir, { recursive: true });
const outPath = join(outDir, 'demo.pptx');
writeFileSync(outPath, buffer);
console.log(`Wrote ${outPath} (${buffer.length} bytes)`);
if (warnings.length > 0) {
  console.log('Warnings:');
  for (const warning of warnings) console.log(` - ${warning}`);
}
