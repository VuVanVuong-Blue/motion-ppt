import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { PresentationReader, PresentationWriter } from '@motion-ppt/pptx';
import type { ImageElement, ShapeElement, TextElement } from '@motion-ppt/core';
import { expectTransformClose, samplePresentation, TINY_PNG_PATH } from './helpers.js';

async function roundtrip() {
  const { buffer, warnings: writeWarnings } = await new PresentationWriter().write(samplePresentation());
  const { presentation, warnings: readWarnings } = await new PresentationReader().read(buffer);
  return { presentation, writeWarnings, readWarnings };
}

describe('write -> read roundtrip', () => {
  it('preserves deck-level metadata', async () => {
    const { presentation, writeWarnings, readWarnings } = await roundtrip();
    expect(presentation.title).toBe('Demo Deck');
    expect(presentation.metadata?.author).toBe('Motion PPT Tests');
    expect(presentation.slides).toHaveLength(2);
    expect(presentation.slides[0]!.width).toBeCloseTo(1280, 0);
    expect(presentation.slides[0]!.height).toBeCloseTo(720, 0);
    expect(writeWarnings).toEqual([]);
    expect(readWarnings).toEqual([]);
  });

  it('preserves slide background color and notes', async () => {
    const { presentation } = await roundtrip();
    expect(presentation.slides[0]!.background?.color).toBe('1F2937');
    expect(presentation.slides[0]!.notes).toContain('Demo speaker notes');
  });

  it('flattens groups into positioned children in z-order', async () => {
    const { presentation } = await roundtrip();
    const slide = presentation.slides[0]!;
    expect(slide.elements).toHaveLength(7); // 5 top-level + 2 group children

    const texts = slide.elements.filter((e) => e.type === 'text') as TextElement[];
    const shapes = slide.elements.filter((e) => e.type === 'shape') as ShapeElement[];

    expect(texts[0]!.content.text).toBe('Hello Motion PPT');
    expect(texts[1]!.content.text).toBe('Editable-first');

    // group children flattened with the group translation applied
    const grouped = texts[2]!;
    expect(grouped.content.text).toBe('Grouped');
    expectTransformClose(grouped.transform, { x: 120, y: 500, width: 200, height: 80 });
    const groupShape = shapes.find((s) => s.content.fillColor === 'F59E0B');
    expect(groupShape).toBeDefined();
    expectTransformClose(groupShape!.transform, { x: 120, y: 500, width: 200, height: 80 });
  });

  it('roundtrips text formatting', async () => {
    const { presentation } = await roundtrip();
    const texts = presentation.slides[0]!.elements.filter((e) => e.type === 'text') as TextElement[];

    const title = texts[0]!;
    expect(title.content.fontSize).toBe(44);
    expect(title.content.bold).toBe(true);
    expect(title.content.color).toBe('FFFFFF');
    expect(title.content.align).toBe('center');
    expectTransformClose(title.transform, { x: 80, y: 100, width: 1120, height: 120 });

    const subtitle = texts[1]!;
    expect(subtitle.content.verticalAlign).toBe('middle');
  });

  it('roundtrips shape geometry, fill, line and rotation', async () => {
    const { presentation } = await roundtrip();
    const shapes = presentation.slides[0]!.elements.filter((e) => e.type === 'shape') as ShapeElement[];

    const rect = shapes.find((s) => s.content.fillColor === '3B82F6')!;
    expect(rect.content.shapeType).toBe('rect');
    expect(rect.content.lineColor).toBe('FFFFFF');
    expect(rect.content.lineWidth).toBeCloseTo(2, 1);
    expectTransformClose(rect.transform, { x: 100, y: 400, width: 300, height: 150, rotation: 45 });

    const ellipse = shapes.find((s) => s.content.fillColor === '10B981')!;
    expect(ellipse.content.shapeType).toBe('ellipse');
    expect(ellipse.content.lineColor).toBeUndefined();
  });

  it('reads back shapes without fill or line', async () => {
    const { presentation } = await roundtrip();
    const shapes = presentation.slides[1]!.elements.filter((e) => e.type === 'shape') as ShapeElement[];
    expect(shapes).toHaveLength(1);
    expect(shapes[0]!.content.shapeType).toBe('roundRect');
    expect(shapes[0]!.content.fillColor).toBeUndefined();
    expect(shapes[0]!.content.lineColor).toBeUndefined();
  });

  it('roundtrips images as base64 assets', async () => {
    const { presentation } = await roundtrip();
    const img = presentation.slides[0]!.elements.find((e) => e.type === 'image') as ImageElement | undefined;
    expect(img).toBeDefined();
    expectTransformClose(img!.transform, { x: 800, y: 400, width: 100, height: 100 });
    const asset = presentation.assets.get(img!.content.sourceId);
    expect(asset).toBeDefined();
    expect(asset!.mimeType).toBe('image/png');
    const fixtureBase64 = readFileSync(TINY_PNG_PATH).toString('base64');
    expect(asset!.uri).toBe(`data:image/png;base64,${fixtureBase64}`);
  });

  it('roundtrips rotation and opacity on text', async () => {
    const { presentation } = await roundtrip();
    const rotated = presentation.slides[1]!.elements[0] as TextElement;
    expect(rotated.content.text).toBe('Rotated & faded');
    expect(rotated.content.italic).toBe(true);
    expect(rotated.content.underline).toBe(true);
    expect(rotated.content.fontFamily).toBe('Arial');
    expect(rotated.content.color).toBe('EF4444');
    expectTransformClose(rotated.transform, { x: 200, y: 200, width: 400, height: 80, rotation: 30, opacity: 0.5 });
  });

  it('keeps element z-order identical to the input order', async () => {
    const { presentation } = await roundtrip();
    const types = presentation.slides[0]!.elements.map((e) => e.type);
    expect(types).toEqual(['text', 'text', 'shape', 'shape', 'image', 'shape', 'text']);
  });

  it('assigns stable ids and validates the result', async () => {
    const { presentation } = await roundtrip();
    const ids = presentation.slides.flatMap((s) => s.elements.map((e) => e.id));
    expect(new Set(ids).size).toBe(ids.length);
  });
});

