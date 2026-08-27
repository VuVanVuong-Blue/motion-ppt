import type {
  AssetReference,
  GroupElement,
  ImageElement,
  ShapeElement,
  SlideElement,
  TextElement,
} from '@motion-ppt/core';
import { pxToInch } from '@motion-ppt/shared';
import type { PptxEngine, PptxImageOptions, PptxShapeOptions, PptxSlide, PptxTextOptions } from '../pptxgenjs-types.js';

export interface WriteContext {
  pptx: PptxEngine;
  assets: ReadonlyMap<string, AssetReference>;
  warnings: string[];
}

/** Dispatches a slide element to its renderer, collecting warnings. */
export function writeElement(pslide: PptxSlide, element: SlideElement, ctx: WriteContext): void {
  switch (element.type) {
    case 'text':
      writeText(pslide, element, ctx);
      break;
    case 'shape':
      writeShape(pslide, element, ctx);
      break;
    case 'image':
      writeImage(pslide, element, ctx);
      break;
    case 'group':
      writeGroup(pslide, element, ctx);
      break;
    case 'asset_overlay':
      ctx.warnings.push(
        `Element "${element.id}" is an asset overlay; rendered assets arrive with the renderer milestone, skipped.`,
      );
      break;
  }
}

function writeText(pslide: PptxSlide, element: TextElement, ctx: WriteContext): void {
  const { transform: t, content: c } = element;
  const options: PptxTextOptions = {
    x: pxToInch(t.x),
    y: pxToInch(t.y),
    w: pxToInch(t.width),
    h: pxToInch(t.height),
    fontSize: c.fontSize ?? 18,
    color: c.color ?? '000000',
  };
  if (c.fontFamily) options.fontFace = c.fontFamily;
  if (c.bold) options.bold = true;
  if (c.italic) options.italic = true;
  if (c.underline) options.underline = { style: 'sng' };
  if (c.align) options.align = c.align;
  // PptxGenJS defaults text boxes to anchor="ctr"; write the anchor
  // explicitly so the roundtrip is stable.
  options.valign = c.verticalAlign ?? 'top';
  if (t.rotation) options.rotate = t.rotation;
  if (t.opacity !== undefined) options.transparency = Math.round((1 - t.opacity) * 100);
  if (c.lineSpacing !== undefined) {
    ctx.warnings.push(`Text element "${element.id}": lineSpacing is not supported by the M1 writer; skipped.`);
  }
  pslide.addText(c.text, options);
}

/**
 * Maps core shape preset names (OOXML preset-geometry identifiers) to
 * PptxGenJS shape names. Only entries guaranteed to exist in the PptxGenJS
 * ShapeType registry are listed; anything else falls back to `rect`.
 */
const SHAPE_NAME_BY_TYPE: Record<string, string> = {
  rect: 'rect',
  roundRect: 'roundRect',
  ellipse: 'ellipse',
  line: 'line',
  triangle: 'triangle',
  rightTriangle: 'rightTriangle',
  isocelesTriangle: 'isocelesTriangle',
  chevron: 'chevron',
  pentagon: 'pentagon',
  regularPentagon: 'regularPentagon',
  hexagon: 'hexagon',
  heptagon: 'heptagon',
  octagon: 'octagon',
  diamond: 'diamond',
  parallelogram: 'parallelogram',
  trapezoid: 'trapezoid',
  heart: 'heart',
  star4: 'star4',
  star5: 'star5',
  star6: 'star6',
  star7: 'star7',
  star8: 'star8',
  star10: 'star10',
  star12: 'star12',
  star16: 'star16',
  star24: 'star24',
  star32: 'star32',
  arrow: 'arrow',
  leftArrow: 'leftArrow',
  rightArrow: 'rightArrow',
  upArrow: 'upArrow',
  downArrow: 'downArrow',
  leftRightArrow: 'leftRightArrow',
  upDownArrow: 'upDownArrow',
  bentArrow: 'bentArrow',
  curvedRightArrow: 'curvedRightArrow',
  curvedLeftArrow: 'curvedLeftArrow',
  plus: 'plus',
  minus: 'minus',
  multiply: 'multiply',
  divide: 'divide',
  pie: 'pie',
  ring: 'ring',
  blockArc: 'blockArc',
  arc: 'arc',
  cloud: 'cloud',
  sun: 'sun',
  moon: 'moon',
  lightningBolt: 'lightningBolt',
  smileyFace: 'smileyFace',
  teardrop: 'teardrop',
  homePlate: 'homePlate',
  quarterCircle: 'quarterCircle',
  halfCircle: 'halfCircle',
  frame: 'frame',
  halfFrame: 'halfFrame',
  corner: 'corner',
  diagonalStripe: 'diagonalStripe',
  plaque: 'plaque',
  can: 'can',
  cube: 'cube',
  bevel: 'bevel',
  donut: 'donut',
  wave: 'wave',
  doubleWave: 'doubleWave',
  horizontalScroll: 'horizontalScroll',
  verticalScroll: 'verticalScroll',
};

function resolveShapeName(pptx: PptxEngine, shapeType: string, elementId: string, warnings: string[]): string {
  const member = SHAPE_NAME_BY_TYPE[shapeType];
  if (!member) {
    warnings.push(`Shape element "${elementId}": unknown shapeType "${shapeType}", rendered as rect.`);
    return 'rect';
  }
  if (pptx.ShapeType[member] === undefined) {
    warnings.push(
      `Shape element "${elementId}": shapeType "${shapeType}" is not supported by this PptxGenJS build, rendered as rect.`,
    );
    return 'rect';
  }
  return member;
}

function writeShape(pslide: PptxSlide, element: ShapeElement, ctx: WriteContext): void {
  const { transform: t, content: c } = element;
  const shapeName = resolveShapeName(ctx.pptx, c.shapeType, element.id, ctx.warnings);
  const options: PptxShapeOptions = {
    x: pxToInch(t.x),
    y: pxToInch(t.y),
    w: pxToInch(t.width),
    h: pxToInch(t.height),
  };
  if (c.fillColor) {
    options.fill = { color: c.fillColor };
  } else {
    options.fill = { color: 'FFFFFF', transparency: 100 };
  }
  if (c.lineColor) {
    options.line = { color: c.lineColor, width: c.lineWidth ?? 1 };
  } else {
    options.line = { color: 'FFFFFF', transparency: 100 };
  }
  if (t.rotation) options.rotate = t.rotation;
  if (t.opacity !== undefined) {
    const transparency = Math.round((1 - t.opacity) * 100);
    options.fill = { ...options.fill, transparency };
    options.line = { ...options.line, transparency };
    ctx.warnings.push(
      `Shape element "${element.id}": PptxGenJS has no element-level opacity for shapes; ` +
        `opacity ${t.opacity} was applied to fill/line transparency instead.`,
    );
  }
  if (c.cornerRadius !== undefined) {
    if (c.shapeType === 'roundRect') {
      const minDim = Math.min(t.width, t.height);
      if (minDim > 0) {
        // PptxGenJS rectRadius is a fraction (0..1) of the smaller dimension.
        options.rectRadius = Math.min(1, c.cornerRadius / minDim);
      }
    } else {
      ctx.warnings.push(`Shape element "${element.id}": cornerRadius is only supported for roundRect; ignored.`);
    }
  }
  pslide.addShape(shapeName, options);
}

function writeImage(pslide: PptxSlide, element: ImageElement, ctx: WriteContext): void {
  const { transform: t, content: c } = element;
  const asset = ctx.assets.get(c.sourceId);
  if (!asset) {
    ctx.warnings.push(`Image element "${element.id}" references missing asset "${c.sourceId}"; skipped.`);
    return;
  }
  const options: PptxImageOptions = {
    x: pxToInch(t.x),
    y: pxToInch(t.y),
    w: pxToInch(t.width),
    h: pxToInch(t.height),
  };
  switch (asset.sourceType) {
    case 'file':
      options.path = asset.uri;
      break;
    case 'url':
      // PptxGenJS accepts URLs via the `path` property.
      options.path = asset.uri;
      break;
    case 'base64':
      options.data = asset.uri;
      break;
  }
  if (t.rotation) options.rotate = t.rotation;
  if (t.opacity !== undefined) options.transparency = Math.round((1 - t.opacity) * 100);
  const fit = c.fit ?? 'stretch';
  if (fit !== 'stretch') {
    if (asset.width !== undefined && asset.height !== undefined) {
      options.sizing = { type: fit, w: pxToInch(t.width), h: pxToInch(t.height) };
    } else {
      ctx.warnings.push(
        `Image element "${element.id}" requests ${fit} fit but asset "${asset.id}" has no intrinsic size; using stretch.`,
      );
    }
  }
  pslide.addImage(options);
}

function writeGroup(pslide: PptxSlide, element: GroupElement, ctx: WriteContext): void {
  const { transform: t, children } = element;
  if (t.rotation || t.scaleX !== undefined || t.scaleY !== undefined) {
    ctx.warnings.push(
      `Group "${element.id}" has rotation/scale; the M1 writer flattens groups with translation and opacity only.`,
    );
  }
  if (children.length === 0) {
    ctx.warnings.push(`Group "${element.id}" has no children; skipped.`);
    return;
  }
  const parentOpacity = t.opacity ?? 1;
  for (const child of children) {
    const opacity = (child.transform.opacity ?? 1) * parentOpacity;
    const flattened: SlideElement = {
      ...child,
      transform: {
        ...child.transform,
        x: child.transform.x + t.x,
        y: child.transform.y + t.y,
        ...(opacity !== 1 ? { opacity } : {}),
      },
    };
    writeElement(pslide, flattened, ctx);
  }
}

