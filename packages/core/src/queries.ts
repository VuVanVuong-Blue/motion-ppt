import { AssetNotFoundError, ElementNotFoundError, SlideNotFoundError } from './errors.js';
import type { AssetReference, Presentation, Slide, SlideElement } from './types.js';

/** Returns the slide with the given id, or `undefined`. */
export function findSlide(presentation: Presentation, slideId: string): Slide | undefined {
  return presentation.slides.find((slide) => slide.id === slideId);
}

/** Returns the slide with the given id, throwing {@link SlideNotFoundError}. */
export function getSlide(presentation: Presentation, slideId: string): Slide {
  const slide = findSlide(presentation, slideId);
  if (!slide) throw new SlideNotFoundError(slideId);
  return slide;
}

/** Returns the slide at the 1-based position, throwing {@link SlideNotFoundError}. */
export function getSlideByIndex(presentation: Presentation, index: number): Slide {
  const slide = presentation.slides.find((s) => s.index === index);
  if (!slide) throw new SlideNotFoundError(`index ${index}`);
  return slide;
}

/** Depth-first search for an element (including inside groups), or `undefined`. */
export function findElement(slide: Slide, elementId: string): SlideElement | undefined {
  return findElementInList(slide.elements, elementId);
}

function findElementInList(elements: readonly SlideElement[], elementId: string): SlideElement | undefined {
  for (const el of elements) {
    if (el.id === elementId) return el;
    if (el.type === 'group') {
      const found = findElementInList(el.children, elementId);
      if (found) return found;
    }
  }
  return undefined;
}

/** Returns an element (searching nested groups), throwing {@link ElementNotFoundError}. */
export function getElement(slide: Slide, elementId: string): SlideElement {
  const element = findElement(slide, elementId);
  if (!element) throw new ElementNotFoundError(elementId);
  return element;
}

/** Depth-first flattened element list (groups expanded into their children). */
export function listElements(slide: Slide): SlideElement[] {
  const out: SlideElement[] = [];
  const walk = (elements: readonly SlideElement[]): void => {
    for (const el of elements) {
      if (el.type === 'group') {
        walk(el.children);
      } else {
        out.push(el);
      }
    }
  };
  walk(slide.elements);
  return out;
}

/** Returns an asset by id, or `undefined`. */
export function findAsset(presentation: Presentation, assetId: string): AssetReference | undefined {
  return presentation.assets.get(assetId);
}

/** Returns an asset by id, throwing {@link AssetNotFoundError}. */
export function getAsset(presentation: Presentation, assetId: string): AssetReference {
  const asset = findAsset(presentation, assetId);
  if (!asset) throw new AssetNotFoundError(assetId);
  return asset;
}
