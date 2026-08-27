/**
 * Minimal structural types for the small PptxGenJS surface used by Motion PPT.
 *
 * PptxGenJS ships a UMD-style declaration (`export as namespace` + a
 * `declare namespace` merged into the default-exported class) that is not
 * usable under NodeNext ESM module interpretation: the default import binds to
 * the module-namespace type instead of the class. Rather than depending on
 * that declaration, we model exactly the API this writer calls and cast the
 * runtime instance once in `createPptxEngine()`.
 */
export interface PptxTextOptions {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fontSize?: number;
  color?: string;
  fontFace?: string;
  bold?: boolean;
  italic?: boolean;
  underline?: { style?: string };
  align?: 'left' | 'center' | 'right' | 'justify';
  valign?: 'top' | 'middle' | 'bottom';
  rotate?: number;
  /** 0 = opaque, 100 = fully transparent. */
  transparency?: number;
}

export interface PptxShapeFillOptions {
  color?: string;
  /** 0 = opaque, 100 = fully transparent. */
  transparency?: number;
}

export interface PptxShapeOptions {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  fill?: PptxShapeFillOptions;
  line?: PptxShapeFillOptions & { width?: number };
  rotate?: number;
  /** Rounded-rectangle radius as a fraction (0..1) of the smaller dimension. */
  rectRadius?: number;
}

export interface PptxImageOptions {
  x?: number;
  y?: number;
  w?: number;
  h?: number;
  path?: string;
  data?: string;
  rotate?: number;
  /** 0 = opaque, 100 = fully transparent. */
  transparency?: number;
  sizing?: { type: 'cover' | 'contain' | 'crop'; w: number; h: number };
}

export interface PptxSlide {
  background?: { color?: string };
  addNotes(notes: string): void;
  addText(text: string, options?: PptxTextOptions): void;
  addShape(shapeName: string, options?: PptxShapeOptions): void;
  addImage(options: PptxImageOptions): void;
}

export interface PptxEngine {
  title: string;
  author: string;
  layout: string;
  /** Registry of known shape names, e.g. `ShapeType.rect === 'rect'`. */
  ShapeType: Record<string, string>;
  defineLayout(layout: { name: string; width: number; height: number }): void;
  addSlide(): PptxSlide;
  write(options: { outputType: 'nodebuffer' }): Promise<Buffer>;
}
