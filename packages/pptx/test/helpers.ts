import {
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
  type Presentation,
  type AssetReference,
} from '@motion-ppt/core';
import { expect } from 'vitest';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const fixtureDir = join(dirname(fileURLToPath(import.meta.url)), 'fixtures');
/** Path of the 1x1 PNG fixture used by the tests. */
export const TINY_PNG_PATH = join(fixtureDir, 'tiny.png');

/** Builds a representative deck exercising every M1-supported element kind. */
export function samplePresentation(): Presentation {
  const assets = new Map<string, AssetReference>([
    ['demo-png', { id: 'demo-png', sourceType: 'file', uri: TINY_PNG_PATH, mimeType: 'image/png' }],
  ]);

  const slide1 = createSlide({
    id: 'slide-1',
    background: { color: '1F2937' },
    notes: 'Demo speaker notes',
    elements: [
      createTextElement({
        id: 'title',
        name: 'Title',
        transform: { x: 80, y: 100, width: 1120, height: 120 },
        content: { text: 'Hello Motion PPT', fontSize: 44, bold: true, color: 'FFFFFF', align: 'center' },
      }),
      createTextElement({
        id: 'subtitle',
        transform: { x: 80, y: 240, width: 1120, height: 60 },
        content: { text: 'Editable-first', fontSize: 24, color: 'D1D5DB', align: 'center', verticalAlign: 'middle' },
      }),
      createShapeElement({
        id: 'rect1',
        transform: { x: 100, y: 400, width: 300, height: 150, rotation: 45 },
        content: { shapeType: 'rect', fillColor: '3B82F6', lineColor: 'FFFFFF', lineWidth: 2 },
      }),
      createShapeElement({
        id: 'ellipse1',
        transform: { x: 500, y: 400, width: 200, height: 120 },
        content: { shapeType: 'ellipse', fillColor: '10B981' },
      }),
      createImageElement({
        id: 'img1',
        transform: { x: 800, y: 400, width: 100, height: 100 },
        content: { sourceId: 'demo-png' },
      }),
      createGroupElement({
        id: 'group1',
        transform: { x: 120, y: 500, width: 200, height: 80 },
        children: [
          createShapeElement({
            id: 'g-child-1',
            transform: { x: 0, y: 0, width: 200, height: 80 },
            content: { shapeType: 'rect', fillColor: 'F59E0B' },
          }),
          createTextElement({
            id: 'g-child-2',
            transform: { x: 0, y: 0, width: 200, height: 80 },
            content: { text: 'Grouped', fontSize: 16, color: 'FFFFFF', align: 'center', verticalAlign: 'middle' },
          }),
        ],
      }),
    ],
  });

  const slide2 = createSlide({
    id: 'slide-2',
    elements: [
      createTextElement({
        id: 'rotated',
        transform: { x: 200, y: 200, width: 400, height: 80, rotation: 30, opacity: 0.5 },
        content: { text: 'Rotated & faded', fontSize: 28, italic: true, underline: true, color: 'EF4444', fontFamily: 'Arial' },
      }),
      createShapeElement({
        id: 'nofill',
        transform: { x: 600, y: 200, width: 300, height: 100 },
        content: { shapeType: 'roundRect' },
      }),
    ],
  });

  return createPresentation({
    id: 'pres-demo',
    title: 'Demo Deck',
    slides: [slide1, slide2],
    assets,
    metadata: { author: 'Motion PPT Tests' },
  });
}

/** Asserts a transform is close to the expected px values (EMU rounding tolerance). */
export function expectTransformClose(
  actual: { x: number; y: number; width: number; height: number; rotation?: number; opacity?: number },
  expected: { x: number; y: number; width: number; height: number; rotation?: number; opacity?: number },
): void {
  expect(actual.x).toBeCloseTo(expected.x, 1);
  expect(actual.y).toBeCloseTo(expected.y, 1);
  expect(actual.width).toBeCloseTo(expected.width, 1);
  expect(actual.height).toBeCloseTo(expected.height, 1);
  if (expected.rotation !== undefined) {
    expect(actual.rotation).toBeCloseTo(expected.rotation, 1);
  } else {
    expect(actual.rotation).toBeUndefined();
  }
  if (expected.opacity !== undefined) {
    expect(actual.opacity).toBeCloseTo(expected.opacity, 2);
  } else {
    expect(actual.opacity).toBeUndefined();
  }
}




