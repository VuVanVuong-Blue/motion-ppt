import PptxGenJS from 'pptxgenjs';
import type { Presentation } from '@motion-ppt/core';
import { pxToInch } from '@motion-ppt/shared';
import type { PptxEngine } from '../pptxgenjs-types.js';
import { writeElement } from './elements.js';

export interface WritePresentationOptions {
  /** Overrides the author written into the file metadata. */
  author?: string;
}

export interface WritePresentationResult {
  /** The generated .pptx archive as a Node Buffer. */
  buffer: Buffer;
  /** Human-readable warnings collected while writing. */
  warnings: string[];
}

/**
 * Constructs the PptxGenJS engine with our structural typing (see
 * `pptxgenjs-types.ts` for why the package's own declarations are unusable
 * under NodeNext ESM). The runtime value is the genuine PptxGenJS class.
 */
function createPptxEngine(): PptxEngine {
  const Ctor = PptxGenJS as unknown as { new (): PptxEngine };
  return new Ctor();
}

/**
 * Tier 1 writer: serializes a {@link Presentation} (core domain model) into a
 * .pptx archive via PptxGenJS.
 *
 * Animation timing injection (Tier 2 of the hybrid engine, see ADR 0002)
 * arrives with the animation milestone and will operate on top of the
 * archives produced here.
 */
export class PresentationWriter {
  async write(
    presentation: Presentation,
    options: WritePresentationOptions = {},
  ): Promise<WritePresentationResult> {
    const warnings: string[] = [];
    const pptx = createPptxEngine();
    pptx.title = presentation.title;
    pptx.author = options.author ?? presentation.metadata?.author ?? 'Motion PPT';

    // A PPTX file has one global slide size; use the first slide as the layout.
    const firstSlide = presentation.slides[0];
    const widthPx = firstSlide?.width ?? 1280;
    const heightPx = firstSlide?.height ?? 720;
    pptx.defineLayout({ name: 'MOTION_PPT_CUSTOM', width: pxToInch(widthPx), height: pxToInch(heightPx) });
    pptx.layout = 'MOTION_PPT_CUSTOM';

    for (const slide of presentation.slides.slice(1)) {
      if (slide.width !== widthPx || slide.height !== heightPx) {
        warnings.push(
          `Slide "${slide.id}" uses a different size (${slide.width}x${slide.height}px); ` +
            `a PPTX file has one global slide size, using ${widthPx}x${heightPx}px.`,
        );
      }
    }

    for (const slide of presentation.slides) {
      const pslide = pptx.addSlide();
      if (slide.background?.color) {
        pslide.background = { color: slide.background.color };
      }
      if (slide.background?.imageAssetId) {
        warnings.push(`Slide "${slide.id}": background images are not supported by the M1 writer; skipped.`);
      }
      if (slide.notes) {
        pslide.addNotes(slide.notes);
      }
      for (const element of slide.elements) {
        writeElement(pslide, element, { pptx, assets: presentation.assets, warnings });
      }
    }

    const buffer = await pptx.write({ outputType: 'nodebuffer' });
    return { buffer, warnings };
  }
}
