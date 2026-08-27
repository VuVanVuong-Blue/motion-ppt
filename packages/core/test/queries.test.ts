import { describe, expect, it } from 'vitest';
import {
  AssetNotFoundError,
  ElementNotFoundError,
  SlideNotFoundError,
  createGroupElement,
  createImageElement,
  createPresentation,
  createShapeElement,
  createSlide,
  findElement,
  getAsset,
  getElement,
  getSlide,
  getSlideByIndex,
  listElements,
} from '@motion-ppt/core';

function sample() {
  const inner = createShapeElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { shapeType: 'rect' } });
  const group = createGroupElement({ transform: { x: 5, y: 5, width: 1, height: 1 }, children: [inner] });
  const slide = createSlide({ elements: [createImageElement({ transform: { x: 0, y: 0, width: 1, height: 1 }, content: { sourceId: 'a' } }), group] });
  const presentation = createPresentation({
    title: 'T',
    slides: [slide],
    assets: new Map([['a', { id: 'a', sourceType: 'file', uri: 'x.png', mimeType: 'image/png' }]]),
  });
  return { presentation, slide, inner, group };
}

describe('slide queries', () => {
  it('getSlide / getSlideByIndex', () => {
    const { presentation } = sample();
    const slide = getSlide(presentation, presentation.slides[0]!.id);
    expect(slide).toBeDefined();
    expect(getSlideByIndex(presentation, 1).id).toBe(slide.id);
    expect(() => getSlide(presentation, 'nope')).toThrow(SlideNotFoundError);
    expect(() => getSlideByIndex(presentation, 99)).toThrow(SlideNotFoundError);
  });
});

describe('element queries', () => {
  it('finds elements inside nested groups', () => {
    const { slide, inner, group } = sample();
    expect(getElement(slide, inner.id).id).toBe(inner.id);
    expect(getElement(slide, group.id).type).toBe('group');
    expect(findElement(slide, 'nope')).toBeUndefined();
    expect(() => getElement(slide, 'nope')).toThrow(ElementNotFoundError);
  });

  it('listElements flattens groups depth-first', () => {
    const { slide } = sample();
    const flat = listElements(slide);
    expect(flat).toHaveLength(2);
    expect(flat[0]?.type).toBe('image');
    expect(flat[1]?.type).toBe('shape');
  });
});

describe('asset queries', () => {
  it('getAsset / findAsset', () => {
    const { presentation } = sample();
    expect(getAsset(presentation, 'a').mimeType).toBe('image/png');
    expect(() => getAsset(presentation, 'nope')).toThrow(AssetNotFoundError);
  });
});
