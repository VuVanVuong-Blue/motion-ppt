import {
  isBoolean,
  isFiniteNumber,
  isNonEmptyString,
  isRecord,
  isString,
  optionalNumber,
  optionalString,
} from '@motion-ppt/shared';
import { DuplicateIdError, InvalidPresentationError } from './errors.js';
import type {
  AssetOverlayElement,
  AssetReference,
  AssetSourceType,
  ElementType,
  GroupElement,
  HorizontalAlign,
  ImageElement,
  ImageFit,
  Presentation,
  ShapeElement,
  Slide,
  SlideBackground,
  SlideElement,
  TextElement,
  Transform,
  VerticalAlign,
} from './types.js';

function fail(message: string, path: string): never {
  throw new InvalidPresentationError(message, { path });
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`Expected an object, got ${describe(value)}`, path);
  return value;
}

function expectString(value: unknown, path: string): string {
  if (!isString(value)) fail(`Expected a string, got ${describe(value)}`, path);
  return value;
}

function expectFiniteNumber(value: unknown, path: string): number {
  if (!isFiniteNumber(value)) fail(`Expected a finite number, got ${describe(value)}`, path);
  return value;
}

function expectNonEmptyString(value: unknown, path: string): string {
  if (!isNonEmptyString(value)) fail(`Expected a non-empty string, got ${describe(value)}`, path);
  return value;
}

function expectOptionalNumberInRange(
  value: unknown,
  path: string,
  min: number,
  max: number,
): number | undefined {
  if (value === undefined) return undefined;
  const n = expectFiniteNumber(value, path);
  if (n < min || n > max) fail(`Expected a number in [${min}, ${max}], got ${n}`, path);
  return n;
}

function expectOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return expectString(value, path);
}

function expectOptionalBoolean(value: unknown, path: string): boolean | undefined {
  if (value === undefined) return undefined;
  if (!isBoolean(value)) fail(`Expected a boolean, got ${describe(value)}`, path);
  return value;
}

function expectOptionalEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  const s = expectString(value, path);
  if (!(allowed as readonly string[]).includes(s)) {
    fail(`Expected one of ${allowed.join(', ')}, got "${s}"`, path);
  }
  return s as T;
}

const HORIZONTAL_ALIGNS: readonly HorizontalAlign[] = ['left', 'center', 'right', 'justify'];
const VERTICAL_ALIGNS: readonly VerticalAlign[] = ['top', 'middle', 'bottom'];
const IMAGE_FITS: readonly ImageFit[] = ['stretch', 'cover', 'contain'];
const ASSET_SOURCE_TYPES: readonly AssetSourceType[] = ['file', 'url', 'base64'];
const ELEMENT_TYPES: readonly ElementType[] = ['text', 'image', 'shape', 'group', 'asset_overlay'];

/** Validates an unknown payload and returns a typed {@link Transform}. */
export function parseTransform(value: unknown, path = 'transform'): Transform {
  const record = expectRecord(value, path);
  const transform: Transform = {
    x: expectFiniteNumber(record.x, `${path}.x`),
    y: expectFiniteNumber(record.y, `${path}.y`),
    width: expectFiniteNumber(record.width, `${path}.width`),
    height: expectFiniteNumber(record.height, `${path}.height`),
  };
  const rotation = expectOptionalNumberInRange(record.rotation, `${path}.rotation`, -360, 360);
  if (rotation !== undefined) transform.rotation = rotation;
  const scaleX = expectOptionalNumberInRange(record.scaleX, `${path}.scaleX`, -1000, 1000);
  if (scaleX !== undefined) transform.scaleX = scaleX;
  const scaleY = expectOptionalNumberInRange(record.scaleY, `${path}.scaleY`, -1000, 1000);
  if (scaleY !== undefined) transform.scaleY = scaleY;
  const opacity = expectOptionalNumberInRange(record.opacity, `${path}.opacity`, 0, 1);
  if (opacity !== undefined) transform.opacity = opacity;
  const zIndex = optionalNumber(record, 'zIndex');
  if (zIndex !== undefined) transform.zIndex = zIndex;
  return transform;
}

function parseTextContent(value: unknown, path: string): TextElement['content'] {
  const record = expectRecord(value, path);
  const text = expectString(record.text, `${path}.text`);
  const content: TextElement['content'] = { text };
  const fontFamily = expectOptionalString(record.fontFamily, `${path}.fontFamily`);
  if (fontFamily !== undefined) content.fontFamily = fontFamily;
  const fontSize = expectOptionalNumberInRange(record.fontSize, `${path}.fontSize`, 1, 400);
  if (fontSize !== undefined) content.fontSize = fontSize;
  const bold = expectOptionalBoolean(record.bold, `${path}.bold`);
  if (bold !== undefined) content.bold = bold;
  const italic = expectOptionalBoolean(record.italic, `${path}.italic`);
  if (italic !== undefined) content.italic = italic;
  const underline = expectOptionalBoolean(record.underline, `${path}.underline`);
  if (underline !== undefined) content.underline = underline;
  const color = expectOptionalString(record.color, `${path}.color`);
  if (color !== undefined) content.color = color;
  const align = expectOptionalEnum(record.align, `${path}.align`, HORIZONTAL_ALIGNS);
  if (align !== undefined) content.align = align;
  const verticalAlign = expectOptionalEnum(record.verticalAlign, `${path}.verticalAlign`, VERTICAL_ALIGNS);
  if (verticalAlign !== undefined) content.verticalAlign = verticalAlign;
  const lineSpacing = expectOptionalNumberInRange(record.lineSpacing, `${path}.lineSpacing`, 0.5, 10);
  if (lineSpacing !== undefined) content.lineSpacing = lineSpacing;
  return content;
}

function parseImageContent(value: unknown, path: string): ImageElement['content'] {
  const record = expectRecord(value, path);
  const fit = expectOptionalEnum(record.fit, `${path}.fit`, IMAGE_FITS);
  return { sourceId: expectNonEmptyString(record.sourceId, `${path}.sourceId`), ...(fit ? { fit } : {}) };
}

function parseShapeContent(value: unknown, path: string): ShapeElement['content'] {
  const record = expectRecord(value, path);
  const content: ShapeElement['content'] = {
    shapeType: expectNonEmptyString(record.shapeType, `${path}.shapeType`),
  };
  const fillColor = expectOptionalString(record.fillColor, `${path}.fillColor`);
  if (fillColor !== undefined) content.fillColor = fillColor;
  const lineColor = expectOptionalString(record.lineColor, `${path}.lineColor`);
  if (lineColor !== undefined) content.lineColor = lineColor;
  const lineWidth = expectOptionalNumberInRange(record.lineWidth, `${path}.lineWidth`, 0.1, 100);
  if (lineWidth !== undefined) content.lineWidth = lineWidth;
  const cornerRadius = expectOptionalNumberInRange(record.cornerRadius, `${path}.cornerRadius`, 0, 10000);
  if (cornerRadius !== undefined) content.cornerRadius = cornerRadius;
  return content;
}

function parseAssetOverlayContent(value: unknown, path: string): AssetOverlayElement['content'] {
  const record = expectRecord(value, path);
  const opacity = expectOptionalNumberInRange(record.opacity, `${path}.opacity`, 0, 1);
  return { sourceId: expectNonEmptyString(record.sourceId, `${path}.sourceId`), ...(opacity ? { opacity } : {}) };
}

function parseBase(record: Record<string, unknown>, path: string) {
  return {
    id: expectNonEmptyString(record.id, `${path}.id`),
    name: expectOptionalString(record.name, `${path}.name`),
    transform: parseTransform(record.transform, `${path}.transform`),
    locked: expectOptionalBoolean(record.locked, `${path}.locked`),
  };
}

/** Validates an unknown payload and returns a typed {@link SlideElement}. */
export function parseSlideElement(value: unknown, path = 'element'): SlideElement {
  const record = expectRecord(value, path);
  const type = expectString(record.type, `${path}.type`);
  if (!(ELEMENT_TYPES as readonly string[]).includes(type)) {
    fail(`Unknown element type "${type}"`, `${path}.type`);
  }
  const base = parseBase(record, path);
  const style = record.style;
  const styleRecord = style === undefined ? undefined : expectRecord(style, `${path}.style`);
  const common = { ...base, ...(styleRecord ? { style: styleRecord } : {}) };

  switch (type as ElementType) {
    case 'text': {
      return { ...common, type: 'text', content: parseTextContent(record.content, `${path}.content`) } as TextElement;
    }
    case 'image': {
      return { ...common, type: 'image', content: parseImageContent(record.content, `${path}.content`) } as ImageElement;
    }
    case 'shape': {
      return { ...common, type: 'shape', content: parseShapeContent(record.content, `${path}.content`) } as ShapeElement;
    }
    case 'asset_overlay': {
      return {
        ...common,
        type: 'asset_overlay',
        content: parseAssetOverlayContent(record.content, `${path}.content`),
      } as AssetOverlayElement;
    }
    case 'group': {
      const childrenValue = record.children;
      if (!Array.isArray(childrenValue)) fail('Expected an array of elements', `${path}.children`);
      const children = childrenValue.map((child, i) => parseSlideElement(child, `${path}.children[${i}]`));
      return { ...common, type: 'group', children } as GroupElement;
    }
  }
}

function parseBackground(value: unknown, path: string): SlideBackground | undefined {
  if (value === undefined) return undefined;
  const record = expectRecord(value, path);
  const background: SlideBackground = {};
  const color = expectOptionalString(record.color, `${path}.color`);
  if (color !== undefined) background.color = color;
  const imageAssetId = expectOptionalString(record.imageAssetId, `${path}.imageAssetId`);
  if (imageAssetId !== undefined) background.imageAssetId = imageAssetId;
  return background;
}

/** Validates an unknown payload and returns a typed {@link Slide}. */
export function parseSlide(value: unknown, path = 'slide'): Slide {
  const record = expectRecord(value, path);
  const elementsValue = record.elements;
  if (!Array.isArray(elementsValue)) fail('Expected an array of elements', `${path}.elements`);
  const slide: Slide = {
    id: expectNonEmptyString(record.id, `${path}.id`),
    index: expectFiniteNumber(record.index, `${path}.index`),
    width: expectFiniteNumber(record.width, `${path}.width`),
    height: expectFiniteNumber(record.height, `${path}.height`),
    elements: elementsValue.map((el, i) => parseSlideElement(el, `${path}.elements[${i}]`)),
  };
  const notes = expectOptionalString(record.notes, `${path}.notes`);
  if (notes !== undefined) slide.notes = notes;
  const background = parseBackground(record.background, `${path}.background`);
  if (background !== undefined) slide.background = background;
  return slide;
}

/** Validates an unknown asset payload and returns a typed {@link AssetReference}. */
export function parseAssetReference(value: unknown, path = 'asset'): AssetReference {
  const record = expectRecord(value, path);
  const asset: AssetReference = {
    id: expectNonEmptyString(record.id, `${path}.id`),
    sourceType: expectOptionalEnum(record.sourceType, `${path}.sourceType`, ASSET_SOURCE_TYPES) ?? 'file',
    uri: expectNonEmptyString(record.uri, `${path}.uri`),
    mimeType: expectNonEmptyString(record.mimeType, `${path}.mimeType`),
  };
  const width = optionalNumber(record, 'width');
  if (width !== undefined) asset.width = width;
  const height = optionalNumber(record, 'height');
  if (height !== undefined) asset.height = height;
  return asset;
}

function checkElementIdUniqueness(elements: readonly SlideElement[], path: string, seen: Set<string>): void {
  for (const el of elements) {
    if (seen.has(el.id)) throw new DuplicateIdError(el.id, 'slide elements');
    seen.add(el.id);
    if (el.type === 'group') {
      checkElementIdUniqueness(el.children, `${path} > group:${el.id}`, seen);
    }
  }
}

function checkAssetReferences(elements: readonly SlideElement[], assets: ReadonlyMap<string, AssetReference>, path: string): void {
  for (const el of elements) {
    if (el.type === 'image' && !assets.has(el.content.sourceId)) {
      fail(`Image element references missing asset "${el.content.sourceId}"`, `${path} > image:${el.id}`);
    }
    if (el.type === 'asset_overlay' && !assets.has(el.content.sourceId)) {
      fail(`Asset overlay element references missing asset "${el.content.sourceId}"`, `${path} > asset_overlay:${el.id}`);
    }
    if (el.type === 'group') checkAssetReferences(el.children, assets, `${path} > group:${el.id}`);
  }
}

/**
 * Validates an unknown payload and returns a typed {@link Presentation}.
 *
 * `assets` may be provided as a JSON-style record `{ [id]: AssetReference }`
 * and is normalized into a `Map`. Cross-checks enforce unique slide/element
 * ids and that every image / overlay references a known asset.
 */
export function parsePresentation(value: unknown): Presentation {
  const record = expectRecord(value, 'presentation');
  const slidesValue = record.slides;
  if (!Array.isArray(slidesValue)) fail('Expected an array of slides', 'presentation.slides');

  const assetsValue = record.assets;
  if (assetsValue !== undefined && !isRecord(assetsValue)) {
    fail('Expected an object map of assets', 'presentation.assets');
  }
  const assets = new Map<string, AssetReference>();
  if (assetsValue !== undefined) {
    for (const key of Object.keys(assetsValue)) {
      const asset = parseAssetReference(assetsValue[key], `presentation.assets.${key}`);
      if (assets.has(asset.id)) throw new DuplicateIdError(asset.id, 'assets');
      assets.set(asset.id, asset);
    }
  }

  const slides = slidesValue.map((slide, i) => parseSlide(slide, `presentation.slides[${i}]`));

  const slideIds = new Set<string>();
  for (const slide of slides) {
    if (slideIds.has(slide.id)) throw new DuplicateIdError(slide.id, 'slides');
    slideIds.add(slide.id);
    checkElementIdUniqueness(slide.elements, `presentation.slides[${slide.id}]`, new Set<string>());
    checkAssetReferences(slide.elements, assets, `presentation.slides[${slide.id}]`);
  }

  const presentation: Presentation = {
    id: expectNonEmptyString(record.id, 'presentation.id'),
    title: expectNonEmptyString(record.title, 'presentation.title'),
    slides,
    assets,
  };
  const metadataValue = record.metadata;
  if (metadataValue !== undefined) {
    const metadataRecord = expectRecord(metadataValue, 'presentation.metadata');
    const author = optionalString(metadataRecord, 'author');
    const createdAt = optionalString(metadataRecord, 'createdAt');
    presentation.metadata = { ...(author ? { author } : {}), ...(createdAt ? { createdAt } : {}) };
  }
  return presentation;
}

