import { ElementNotFoundError, SlideNotFoundError } from './errors.js';
import type { Presentation, Slide, SlideBackground, SlideElement } from './types.js';

/**
 * Appends a slide to the presentation (immutably), assigning the next
 * 1-based index. The original presentation is left unchanged.
 */
export function addSlide(presentation: Presentation, slide: Slide): Presentation {
  const nextSlide: Slide = { ...slide, index: presentation.slides.length + 1 };
  return { ...presentation, slides: [...presentation.slides, nextSlide] };
}

/** Removes a slide by id (immutably). Throws {@link SlideNotFoundError}. */
export function removeSlide(presentation: Presentation, slideId: string): Presentation {
  if (!presentation.slides.some((s) => s.id === slideId)) throw new SlideNotFoundError(slideId);
  const slides = presentation.slides.filter((s) => s.id !== slideId).map((s, i) => ({ ...s, index: i + 1 }));
  return { ...presentation, slides };
}

/** Appends an element to the top of the z-order (immutably). */
export function addElement(slide: Slide, element: SlideElement): Slide {
  return { ...slide, elements: [...slide.elements, element] };
}

interface RemoveResult {
  elements: SlideElement[];
  found: boolean;
}

function removeFromList(elements: readonly SlideElement[], elementId: string): RemoveResult {
  let found = false;
  const next: SlideElement[] = [];
  for (const el of elements) {
    if (el.id === elementId) {
      found = true;
      continue;
    }
    if (el.type === 'group') {
      const result = removeFromList(el.children, elementId);
      if (result.found) {
        next.push({ ...el, children: result.elements });
        found = true;
        continue;
      }
    }
    next.push(el);
  }
  return { elements: next, found };
}

/**
 * Removes an element by id (immutably), searching nested groups.
 * Throws {@link ElementNotFoundError} when the id is absent.
 */
export function removeElement(slide: Slide, elementId: string): Slide {
  const { elements, found } = removeFromList(slide.elements, elementId);
  if (!found) throw new ElementNotFoundError(elementId);
  return { ...slide, elements };
}

/** Returns a copy of the slide with new speaker notes. */
export function setSlideNotes(slide: Slide, notes: string | undefined): Slide {
  return notes === undefined ? { ...slide, notes: undefined } : { ...slide, notes };
}

/** Returns a copy of the slide with a new background. */
export function setSlideBackground(slide: Slide, background: SlideBackground | undefined): Slide {
  return background === undefined ? { ...slide, background: undefined } : { ...slide, background };
}
