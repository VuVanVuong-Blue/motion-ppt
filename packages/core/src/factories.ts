import { createId } from '@motion-ppt/shared';
import type {
  AssetOverlayElement,
  AssetOverlayContent,
  AssetReference,
  GroupElement,
  ImageElement,
  ImageElementContent,
  Presentation,
  PresentationMetadata,
  ShapeElement,
  ShapeElementContent,
  Slide,
  SlideBackground,
  SlideElement,
  TextElement,
  TextElementContent,
  Transform,
} from './types.js';

/** Default slide size: 1280x720 px (16:9, 13.33 x 7.5 in at 96 dpi). */
export const DEFAULT_SLIDE_WIDTH = 1280;
/** Default slide height: 720 px. */
export const DEFAULT_SLIDE_HEIGHT = 720;

export interface CreatePresentationInput {
  title: string;
  id?: string;
  /** Slides are re-indexed sequentially (1-based) regardless of input `index`. */
  slides?: Slide[];
  assets?: Map<string, AssetReference>;
  metadata?: PresentationMetadata;
}

/** Creates a new {@link Presentation} with sequentially re-indexed slides. */
export function createPresentation(input: CreatePresentationInput): Presentation {
  const slides = (input.slides ?? []).map((slide, i) => ({ ...slide, index: i + 1 }));
  return {
    id: input.id ?? createId('presentation'),
    title: input.title,
    slides,
    assets: new Map(input.assets ?? []),
    ...(input.metadata ? { metadata: input.metadata } : {}),
  };
}

export interface CreateSlideInput {
  id?: string;
  width?: number;
  height?: number;
  elements?: SlideElement[];
  notes?: string;
  background?: SlideBackground;
}

/**
 * Creates a new {@link Slide}. The `index` is `0` until the slide is added
 * to a presentation via `addSlide` (which assigns the 1-based position).
 */
export function createSlide(input: CreateSlideInput = {}): Slide {
  return {
    id: input.id ?? createId('slide'),
    index: 0,
    width: input.width ?? DEFAULT_SLIDE_WIDTH,
    height: input.height ?? DEFAULT_SLIDE_HEIGHT,
    elements: input.elements ?? [],
    ...(input.notes !== undefined ? { notes: input.notes } : {}),
    ...(input.background !== undefined ? { background: input.background } : {}),
  };
}

export interface CreateElementBaseInput {
  id?: string;
  name?: string;
  transform: Transform;
  locked?: boolean;
  style?: Record<string, unknown>;
}

function base(input: CreateElementBaseInput) {
  return {
    id: input.id ?? createId('element'),
    transform: input.transform,
    ...(input.name !== undefined ? { name: input.name } : {}),
    ...(input.locked !== undefined ? { locked: input.locked } : {}),
    ...(input.style !== undefined ? { style: input.style } : {}),
  };
}

export interface CreateTextElementInput extends CreateElementBaseInput {
  content: TextElementContent & { text: string };
}

/** Creates a {@link TextElement}. */
export function createTextElement(input: CreateTextElementInput): TextElement {
  return { ...base(input), type: 'text', content: input.content };
}

export interface CreateImageElementInput extends CreateElementBaseInput {
  content: ImageElementContent & { sourceId: string };
}

/** Creates an {@link ImageElement} referencing an asset id. */
export function createImageElement(input: CreateImageElementInput): ImageElement {
  return { ...base(input), type: 'image', content: input.content };
}

export interface CreateShapeElementInput extends CreateElementBaseInput {
  content: ShapeElementContent & { shapeType: string };
}

/** Creates a {@link ShapeElement}. */
export function createShapeElement(input: CreateShapeElementInput): ShapeElement {
  return { ...base(input), type: 'shape', content: input.content };
}

export interface CreateGroupElementInput extends CreateElementBaseInput {
  children: SlideElement[];
}

/** Creates a {@link GroupElement} from children in group-local coordinates. */
export function createGroupElement(input: CreateGroupElementInput): GroupElement {
  return { ...base(input), type: 'group', children: input.children };
}

export interface CreateAssetOverlayElementInput extends CreateElementBaseInput {
  content: AssetOverlayContent & { sourceId: string };
}

/** Creates an {@link AssetOverlayElement} (rendered-asset placeholder). */
export function createAssetOverlayElement(input: CreateAssetOverlayElementInput): AssetOverlayElement {
  return { ...base(input), type: 'asset_overlay', content: input.content };
}
