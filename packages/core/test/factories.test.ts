import { describe, expect, it } from 'vitest';
import {
  DEFAULT_SLIDE_HEIGHT,
  DEFAULT_SLIDE_WIDTH,
  addSlide,
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  createTextElement,
} from '@motion-ppt/core';

describe('createPresentation', () => {
  it('assigns default ids and re-indexes slides sequentially', () => {
    const slideA = createSlide();
    const slideB = createSlide();
    const pres = createPresentation({ title: 'T', slides: [slideA, slideB] });
    expect(pres.id).toMatch(/^presentation-/);
    expect(pres.title).toBe('T');
    expect(pres.slides[0]?.index).toBe(1);
    expect(pres.slides[1]?.index).toBe(2);
    expect(pres.slides[0]).not.toBe(slideA); // re-index copies
  });

  it('defaults to an empty deck and empty asset map', () => {
    const pres = createPresentation({ title: 'T' });
    expect(pres.slides).toEqual([]);
    expect(pres.assets.size).toBe(0);
  });
});

describe('createSlide', () => {
  it('uses 16:9 defaults and index 0 placeholder', () => {
    const slide = createSlide();
    expect(slide.width).toBe(DEFAULT_SLIDE_WIDTH);
    expect(slide.height).toBe(DEFAULT_SLIDE_HEIGHT);
    expect(slide.index).toBe(0);
    expect(slide.id).toMatch(/^slide-/);
  });
});

describe('element factories', () => {
  it('creates a text element with defaults', () => {
    const el = createTextElement({
      transform: { x: 1, y: 2, width: 3, height: 4 },
      content: { text: 'Hi' },
    });
    expect(el.type).toBe('text');
    expect(el.id).toMatch(/^element-/);
    expect(el.content.text).toBe('Hi');
    expect(el.transform).toEqual({ x: 1, y: 2, width: 3, height: 4 });
  });

  it('creates image, shape and group elements', () => {
    const img = createImageElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { sourceId: 'a' } });
    const shape = createShapeElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { shapeType: 'ellipse', fillColor: 'FF0000' } });
    const group = createGroupElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, children: [img, shape] });
    expect(img.type).toBe('image');
    expect(shape.type).toBe('shape');
    expect(group.type).toBe('group');
    expect(group.children).toHaveLength(2);
  });

  it('preserves optional fields', () => {
    const el = createTextElement({
      id: 't1',
      name: 'Title',
      transform: { x: 0, y: 0, width: 10, height: 10 },
      content: { text: 'x', bold: true, color: 'FFFFFF' },
      locked: true,
    });
    expect(el.id).toBe('t1');
    expect(el.name).toBe('Title');
    expect(el.locked).toBe(true);
    expect(el.content.bold).toBe(true);
  });
});

describe('addSlide', () => {
  it('appends and assigns the next index immutably', () => {
    const pres = createPresentation({ title: 'T' });
    const next = addSlide(pres, createSlide());
    expect(pres.slides).toHaveLength(0);
    expect(next.slides).toHaveLength(1);
    expect(next.slides[0]?.index).toBe(1);
    const third = addSlide(next, createSlide());
    expect(third.slides[1]?.index).toBe(2);
  });
});
