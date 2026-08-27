import { describe, expect, it } from 'vitest';
import {
  ElementNotFoundError,
  SlideNotFoundError,
  addElement,
  addSlide,
  createGroupElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
  removeElement,
  removeSlide,
  setSlideBackground,
  setSlideNotes,
} from '@motion-ppt/core';

describe('removeSlide', () => {
  it('removes and re-indexes remaining slides immutably', () => {
    const pres = createPresentation({ title: 'T', slides: [createSlide(), createSlide(), createSlide()] });
    const next = removeSlide(pres, pres.slides[1]!.id);
    expect(pres.slides).toHaveLength(3);
    expect(next.slides).toHaveLength(2);
    expect(next.slides.map((s) => s.index)).toEqual([1, 2]);
    expect(() => removeSlide(pres, 'nope')).toThrow(SlideNotFoundError);
  });
});

describe('addElement / removeElement', () => {
  it('adds elements to the top of the z-order', () => {
    const slide = addElement(createSlide(), createTextElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { text: 'a' } }));
    expect(slide.elements).toHaveLength(1);
  });

  it('removes elements deep inside groups', () => {
    const inner = createShapeElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { shapeType: 'rect' } });
    const group = createGroupElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, children: [inner] });
    const slide = createSlide({ elements: [group] });
    const next = removeElement(slide, inner.id);
    if (next.elements[0]?.type === 'group') {
      expect(next.elements[0].children).toHaveLength(0);
    }
    expect(() => removeElement(slide, 'nope')).toThrow(ElementNotFoundError);
  });

  it('leaves the original slide untouched', () => {
    const inner = createShapeElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { shapeType: 'rect' } });
    const slide = createSlide({ elements: [inner] });
    removeElement(slide, inner.id);
    expect(slide.elements).toHaveLength(1);
  });
});

describe('setSlideNotes / setSlideBackground', () => {
  it('sets and clears notes immutably', () => {
    const slide = setSlideNotes(createSlide(), 'hello');
    expect(slide.notes).toBe('hello');
    expect(setSlideNotes(slide, undefined).notes).toBeUndefined();
  });

  it('sets background color', () => {
    const slide = setSlideBackground(createSlide(), { color: '1F2937' });
    expect(slide.background?.color).toBe('1F2937');
  });
});

describe('addSlide chain', () => {
  it('builds a deck incrementally', () => {
    const pres = addSlide(addSlide(createPresentation({ title: 'T' }), createSlide()), createSlide());
    expect(pres.slides.map((s) => s.index)).toEqual([1, 2]);
  });
});
