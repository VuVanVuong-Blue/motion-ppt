import { describe, expect, it } from 'vitest';
import { parsePresentation, parseSlideElement } from '@motion-ppt/core';
import { DuplicateIdError, InvalidPresentationError } from '@motion-ppt/core';

interface RawElement {
  id: string;
  type: string;
  transform: Record<string, unknown>;
  content?: Record<string, unknown>;
  children?: RawElement[];
}

interface RawSlide {
  id: string;
  index: number;
  width: number;
  height: number;
  elements: RawElement[];
}

interface RawPresentationPayload {
  id: string;
  title: string;
  assets: Record<string, unknown>;
  slides: RawSlide[];
}

function validPresentation(): RawPresentationPayload {
  return {
    id: 'pres-1',
    title: 'Demo',
    assets: {
      'img-1': { id: 'img-1', sourceType: 'file', uri: 'a.png', mimeType: 'image/png' },
    },
    slides: [
      {
        id: 'slide-1',
        index: 1,
        width: 1280,
        height: 720,
        elements: [
          {
            id: 'title',
            type: 'text',
            transform: { x: 0, y: 0, width: 100, height: 50 },
            content: { text: 'Hello' },
          },
          {
            id: 'pic',
            type: 'image',
            transform: { x: 10, y: 10, width: 50, height: 50 },
            content: { sourceId: 'img-1' },
          },
        ],
      },
    ],
  };
}

describe('parsePresentation', () => {
  it('parses a valid payload and normalizes assets into a Map', () => {
    const pres = parsePresentation(validPresentation());
    expect(pres.id).toBe('pres-1');
    expect(pres.title).toBe('Demo');
    expect(pres.slides).toHaveLength(1);
    expect(pres.assets.get('img-1')?.mimeType).toBe('image/png');
  });

  it('rejects unknown element types', () => {
    const bad = validPresentation();
    bad.slides[0]!.elements[0]!.type = 'video';
    expect(() => parsePresentation(bad)).toThrow(InvalidPresentationError);
  });

  it('rejects missing transform fields with a path', () => {
    const bad = validPresentation();
    delete (bad.slides[0]!.elements[0]!.transform as Record<string, unknown>).width;
    try {
      parsePresentation(bad);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(InvalidPresentationError);
      expect((err as InvalidPresentationError).message).toContain('transform.width');
    }
  });

  it('rejects duplicate slide ids', () => {
    const bad = validPresentation();
    bad.slides.push({ ...bad.slides[0]!, id: 'slide-1' });
    expect(() => parsePresentation(bad)).toThrow(DuplicateIdError);
  });

  it('rejects duplicate element ids inside groups', () => {
    const bad = validPresentation();
    bad.slides[0]!.elements = [
      {
        id: 'g',
        type: 'group',
        transform: { x: 0, y: 0, width: 10, height: 10 },
        children: [
          { id: 'dup', type: 'text', transform: { x: 0, y: 0, width: 5, height: 5 }, content: { text: 'a' } },
        ],
      },
      { id: 'dup', type: 'text', transform: { x: 0, y: 0, width: 5, height: 5 }, content: { text: 'b' } },
    ];
    expect(() => parsePresentation(bad)).toThrow(DuplicateIdError);
  });

  it('rejects image elements referencing missing assets', () => {
    const bad = validPresentation();
    (bad.slides[0]!.elements[1]!.content as { sourceId: string }).sourceId = 'nope';
    expect(() => parsePresentation(bad)).toThrow(/missing asset/);
  });

  it('rejects non-record assets', () => {
    const bad = validPresentation();
    bad.assets = 'nope' as unknown as Record<string, unknown>;
    expect(() => parsePresentation(bad)).toThrow(InvalidPresentationError);
  });

  it('validates group children recursively', () => {
    const bad = validPresentation();
    bad.slides[0]!.elements = [
      {
        id: 'g',
        type: 'group',
        transform: { x: 0, y: 0, width: 10, height: 10 },
        children: [{ id: 'x', type: 'text', transform: { x: 0 }, content: { text: 'a' } }],
      },
    ];
    expect(() => parsePresentation(bad)).toThrow(/children\[0\]\.transform\.y/);
  });
});

describe('parseSlideElement', () => {
  it('parses a group with nested elements', () => {
    const group = parseSlideElement({
      id: 'g',
      type: 'group',
      transform: { x: 1, y: 2, width: 3, height: 4 },
      children: [{ id: 'c', type: 'shape', transform: { x: 0, y: 0, width: 1, height: 1 }, content: { shapeType: 'rect' } }],
    });
    expect(group.type).toBe('group');
    if (group.type === 'group') {
      expect(group.children).toHaveLength(1);
      expect(group.children[0]?.type).toBe('shape');
    }
  });

  it('parses opacity clamping range violations', () => {
    expect(() =>
      parseSlideElement({
        id: 'x',
        type: 'shape',
        transform: { x: 0, y: 0, width: 1, height: 1, opacity: 1.5 },
        content: { shapeType: 'rect' },
      }),
    ).toThrow(/opacity/);
  });
});




