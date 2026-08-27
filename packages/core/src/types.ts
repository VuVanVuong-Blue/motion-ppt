/**
 * Element categories supported by the Motion PPT scene graph.
 *
 * - `text` — editable text box
 * - `image` — replaceable picture
 * - `shape` — native vector shape
 * - `group` — nested collection of elements sharing a transform
 * - `asset_overlay` — rendered asset (transparent video/image overlay), reserved for renderer milestones
 */
export type ElementType = 'text' | 'image' | 'shape' | 'group' | 'asset_overlay';

/**
 * Geometry of an element in the slide coordinate space.
 * All linear units are pixels (96 dpi); `rotation` is clockwise degrees.
 */
export interface Transform {
  /** Horizontal offset of the element's top-left corner from the slide's left edge, in px. */
  x: number;
  /** Vertical offset of the element's top-left corner from the slide's top edge, in px. */
  y: number;
  /** Width of the element's bounding box, in px. */
  width: number;
  /** Height of the element's bounding box, in px. */
  height: number;
  /** Clockwise rotation around the element's center, in degrees. Defaults to 0. */
  rotation?: number;
  /** Horizontal scale factor around the element's center. Defaults to 1. */
  scaleX?: number;
  /** Vertical scale factor around the element's center. Defaults to 1. */
  scaleY?: number;
  /** Opacity in the range 0..1. Defaults to 1. */
  opacity?: number;
  /** Optional explicit stacking-order hint (lower = further back). */
  zIndex?: number;
}

export type HorizontalAlign = 'left' | 'center' | 'right' | 'justify';
export type VerticalAlign = 'top' | 'middle' | 'bottom';

/** Content of a text element. Typography units are points unless noted. */
export interface TextElementContent {
  /** Plain text content (single paragraph for now). */
  text: string;
  /** Font family name, e.g. `Calibri`. */
  fontFamily?: string;
  /** Font size in points. */
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  /** Text color as hex `RRGGBB` (no leading `#`). */
  color?: string;
  /** Horizontal alignment of the paragraph. */
  align?: HorizontalAlign;
  /** Vertical anchoring of the text inside its box. */
  verticalAlign?: VerticalAlign;
  /** Line spacing as a multiple of single spacing. */
  lineSpacing?: number;
}

export type ImageFit = 'stretch' | 'cover' | 'contain';

/** Content of an image element. References an entry in `Presentation.assets`. */
export interface ImageElementContent {
  /** Id of the referenced {@link AssetReference}. */
  sourceId: string;
  /** How the image is placed inside its bounding box. Defaults to `stretch`. */
  fit?: ImageFit;
}

/** Content of a native vector shape. */
export interface ShapeElementContent {
  /**
   * Shape preset name using the OOXML preset-geometry identifier,
   * e.g. `rect`, `roundRect`, `ellipse`, `chevron`, `triangle`.
   */
  shapeType: string;
  /** Fill color as hex `RRGGBB`. Absent means no fill. */
  fillColor?: string;
  /** Stroke color as hex `RRGGBB`. Absent means no stroke. */
  lineColor?: string;
  /** Stroke width in points. Defaults to 1 when a stroke color is present. */
  lineWidth?: number;
  /** Corner radius in px (only meaningful for `roundRect`). */
  cornerRadius?: number;
}

/** Content of an asset overlay element (rendered video / transparent image). Reserved. */
export interface AssetOverlayContent {
  sourceId: string;
  opacity?: number;
}

/** Shared base of every slide element. */
export interface SlideElementBase {
  /** Stable, unique id within the presentation. */
  id: string;
  /** Human-readable name (maps to the OOXML shape name). */
  name?: string;
  transform: Transform;
  /** When true, the element is locked against edits in PowerPoint. */
  locked?: boolean;
  /** Free-form style extensions (renderer-specific, opaque to core). */
  style?: Record<string, unknown>;
}

export interface TextElement extends SlideElementBase {
  type: 'text';
  content: TextElementContent;
}

export interface ImageElement extends SlideElementBase {
  type: 'image';
  content: ImageElementContent;
}

export interface ShapeElement extends SlideElementBase {
  type: 'shape';
  content: ShapeElementContent;
}

export interface GroupElement extends SlideElementBase {
  type: 'group';
  /** Child elements in group-local coordinates. */
  children: SlideElement[];
}

export interface AssetOverlayElement extends SlideElementBase {
  type: 'asset_overlay';
  content: AssetOverlayContent;
}

/** Discriminated union of all supported slide element kinds. */
export type SlideElement = TextElement | ImageElement | ShapeElement | GroupElement | AssetOverlayElement;

/** Solid-color or image-based slide background. */
export interface SlideBackground {
  /** Background color as hex `RRGGBB`. */
  color?: string;
  /** Id of an asset used as a full-bleed background image. */
  imageAssetId?: string;
}

export interface Slide {
  id: string;
  /** 1-based position of the slide in the deck (PowerPoint convention). */
  index: number;
  /** Slide width in px. */
  width: number;
  /** Slide height in px. */
  height: number;
  /** Elements in z-order (later = on top). */
  elements: SlideElement[];
  /** Speaker notes (plain text). */
  notes?: string;
  background?: SlideBackground;
}

export type AssetSourceType = 'file' | 'url' | 'base64';

export interface AssetReference {
  id: string;
  /** `file` = filesystem path, `url` = remote URL, `base64` = data URI (`data:<mime>;base64,...`). */
  sourceType: AssetSourceType;
  /** File path, URL or data URI depending on `sourceType`. */
  uri: string;
  /** MIME type of the asset, e.g. `image/png`. */
  mimeType: string;
  /** Intrinsic width in px when known. */
  width?: number;
  /** Intrinsic height in px when known. */
  height?: number;
}

export interface PresentationMetadata {
  author?: string;
  createdAt?: string;
}

export interface Presentation {
  id: string;
  title: string;
  /** Slides in deck order. */
  slides: Slide[];
  /** Assets referenced by image / asset_overlay elements. */
  assets: Map<string, AssetReference>;
  metadata?: PresentationMetadata;
}
