import { describe, expect, it } from 'vitest';
import { PresentationReader, PptxFormatError } from '@motion-ppt/pptx';
import { PresentationWriter } from '@motion-ppt/pptx';
import JSZip from 'jszip';
import { samplePresentation } from './helpers.js';

describe('PresentationReader', () => {
  it('throws PptxFormatError for non-zip input', async () => {
    const bytes = new TextEncoder().encode('definitely not a zip file');
    await expect(new PresentationReader().read(bytes)).rejects.toBeInstanceOf(PptxFormatError);
  });

  it('throws PptxFormatError when the presentation part is missing', async () => {
    const zip = new JSZip();
    zip.file('hello.txt', 'x');
    const buffer = await zip.generateAsync({ type: 'nodebuffer' });
    await expect(new PresentationReader().read(buffer)).rejects.toBeInstanceOf(PptxFormatError);
  });

  it('roundtrips writer output into a validated presentation', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation());
    const result = await new PresentationReader().read(buffer);
    expect(result.presentation.title).toBe('Demo Deck');
    expect(result.presentation.slides).toHaveLength(2);
    expect(result.presentation.assets.size).toBeGreaterThan(0);
  });
});
