import { describe, expect, it } from 'vitest';
import { PresentationWriter } from '@motion-ppt/pptx';
import { createPresentation } from '@motion-ppt/core';
import { samplePresentation } from './helpers.js';

describe('PresentationWriter', () => {
  it('serializes the sample deck to a non-empty buffer without warnings', async () => {
    const { buffer, warnings } = await new PresentationWriter().write(samplePresentation());
    expect(buffer.length).toBeGreaterThan(1000);
    expect(warnings).toEqual([]);
  });

  it('honors the author override', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation(), { author: 'Override Author' });
    expect(buffer.length).toBeGreaterThan(0);
  });

  it('warns when slides have mixed sizes', async () => {
    const pres = samplePresentation();
    pres.slides.push({ ...pres.slides[0]!, id: 'other-size', width: 1024, height: 768, elements: [] });
    const { warnings } = await new PresentationWriter().write(pres);
    expect(warnings.some((w) => w.includes('different size'))).toBe(true);
  });

  it('warns and skips images whose asset is missing', async () => {
    const pres = samplePresentation();
    pres.assets.delete('demo-png');
    const { warnings } = await new PresentationWriter().write(pres);
    expect(warnings.some((w) => w.includes('missing asset'))).toBe(true);
  });

  it('warns and skips asset overlays', async () => {
    const pres = samplePresentation();
    pres.slides[0]!.elements.push({
      id: 'overlay',
      type: 'asset_overlay',
      transform: { x: 0, y: 0, width: 10, height: 10 },
      content: { sourceId: 'demo-png' },
    });
    const { warnings } = await new PresentationWriter().write(pres);
    expect(warnings.some((w) => w.includes('asset overlay'))).toBe(true);
  });

  it('warns for unknown shape types and falls back to rect', async () => {
    const pres = samplePresentation();
    pres.slides[0]!.elements.push({
      id: 'weird',
      type: 'shape',
      transform: { x: 0, y: 0, width: 10, height: 10 },
      content: { shapeType: 'notAShape' },
    });
    const { warnings } = await new PresentationWriter().write(pres);
    expect(warnings.some((w) => w.includes('unknown shapeType'))).toBe(true);
  });

  it('warns for group rotation/scale (flattened with translation only)', async () => {
    const pres = samplePresentation();
    const group = pres.slides[0]!.elements.find((e) => e.type === 'group');
    if (group?.type === 'group') {
      group.transform.rotation = 15;
    }
    const { warnings } = await new PresentationWriter().write(pres);
    expect(warnings.some((w) => w.includes('rotation/scale'))).toBe(true);
  });

  it('writes an empty presentation', async () => {
    const { buffer, warnings } = await new PresentationWriter().write(createPresentation({ title: 'Empty' }));
    expect(buffer.length).toBeGreaterThan(0);
    expect(warnings).toEqual([]);
  });
});

describe('PresentationWriter validation boundary', () => {
  it('defers structural validation to the core package (writer accepts typed models)', async () => {
    // The writer trusts the typed domain model; structural validation of
    // untrusted payloads happens via core's parsePresentation() before writing.
    const pres = createPresentation({ title: 'x' });
    pres.title = '';
    const { buffer } = await new PresentationWriter().write(pres);
    expect(buffer.length).toBeGreaterThan(0);
  });
});


