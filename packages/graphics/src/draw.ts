/**
 * Element drawing: rasterizes the core `SlideElement` union onto a 2D canvas
 * context. Groups are flattened exactly like the PPTX writer (translation +
 * opacity; child coordinates are group-local).
 */
import type { Image, SKRSContext2D } from '@napi-rs/canvas';
import type { AssetReference, GroupElement, ImageElement, ShapeElement, SlideElement, TextElement } from '@motion-ppt/core';
import { clamp01, hexToColor } from './canvas.js';
import { IDENTITY_VISUAL_STATE, type ElementVisualState } from './types.js';

export interface DrawContext {
  assets: ReadonlyMap<string, AssetReference>;
  /** Preloaded images keyed by asset id. */
  images: ReadonlyMap<string, Image>;
  /** Warnings collected while drawing (missing assets, unsupported shapes). */
  warnings: string[];
}

export interface DrawElementOptions {
  /** Parent opacity multiplier (group nesting). Defaults to 1. */
  opacity: number;
  /** Visual state applied on top of the element's base transform. */
  state: ElementVisualState;
}

/** Draws one element (top-level or nested) at its transformed position. */
export function drawElement(ctx: SKRSContext2D, element: SlideElement, dc: DrawContext, opts: DrawElementOptions): void {
  const { x, y, width, height } = element.transform;
  const rotation = (element.transform.rotation ?? 0) + opts.state.rotation;
  const scaleX = (element.transform.scaleX ?? 1) * opts.state.scaleX;
  const scaleY = (element.transform.scaleY ?? 1) * opts.state.scaleY;
  const opacity = clamp01((element.transform.opacity ?? 1) * opts.state.opacity * opts.opacity);

  ctx.save();
  ctx.globalAlpha = opacity;
  ctx.translate(x + opts.state.translateX, y + opts.state.translateY);
  if (rotation !== 0 || scaleX !== 1 || scaleY !== 1) {
    ctx.translate(width / 2, height / 2);
    ctx.rotate((rotation * Math.PI) / 180);
    ctx.scale(scaleX, scaleY);
    ctx.translate(-width / 2, -height / 2);
  }

  switch (element.type) {
    case 'text':
      drawText(ctx, element, dc);
      break;
    case 'shape':
      drawShape(ctx, element, dc);
      break;
    case 'image':
      drawImage(ctx, element, dc);
      break;
    case 'group':
      drawGroup(ctx, element, dc, opacity);
      break;
    case 'asset_overlay':
      dc.warnings.push(`asset_overlay "${element.id}" is reserved for rendered assets; skipped.`);
      break;
    default: {
      const exhaustive: never = element;
      throw new Error(`Unknown element type: ${String(exhaustive)}`);
    }
  }
  ctx.restore();
}

function drawGroup(ctx: SKRSContext2D, group: GroupElement, dc: DrawContext, parentOpacity: number): void {
  for (const child of group.children) {
    drawElement(ctx, child, dc, { opacity: parentOpacity, state: { ...IDENTITY_VISUAL_STATE } });
  }
}

// ---------------------------------------------------------------------------
// Text
// ---------------------------------------------------------------------------

function drawText(ctx: SKRSContext2D, element: TextElement, _dc: DrawContext): void {
  const c = element.content;
  const width = element.transform.width;
  const height = element.transform.height;
  const fontSizePx = ((c.fontSize ?? 18) * 96) / 72; // pt -> px
  const family = /\s/.test(c.fontFamily ?? '') ? `"${c.fontFamily}"` : (c.fontFamily ?? 'sans-serif');
  const style = c.italic ? 'italic' : 'normal';
  const weight = c.bold ? 'bold' : 'normal';
  ctx.font = `${style} ${weight} ${fontSizePx}px ${family}`;
  ctx.fillStyle = hexToColor(c.color ?? '000000');
  ctx.textBaseline = 'middle';

  const align = c.align ?? 'left';
  ctx.textAlign = align === 'center' ? 'center' : align === 'right' ? 'right' : 'left';
  const lineHeight = fontSizePx * (c.lineSpacing ?? 1) * 1.2;
  const lines = wrapText(ctx, c.text, width);
  const totalHeight = lines.length * lineHeight;
  const valign = c.verticalAlign ?? 'top';
  const firstBaseline =
    valign === 'middle'
      ? height / 2 - totalHeight / 2 + lineHeight / 2
      : valign === 'bottom'
        ? height - totalHeight + lineHeight / 2
        : lineHeight / 2;

  let y = firstBaseline;
  for (const line of lines) {
    const x = align === 'center' ? width / 2 : align === 'right' ? width : 0;
    ctx.fillText(line, x, y);
    y += lineHeight;
  }
}

function wrapText(ctx: SKRSContext2D, text: string, maxWidth: number): string[] {
  const out: string[] = [];
  for (const paragraph of text.split('\n')) {
    if (paragraph === '') {
      out.push('');
      continue;
    }
    const words = paragraph.split(/\s+/);
    let line = '';
    for (const word of words) {
      const candidate = line ? `${line} ${word}` : word;
      if (line !== '' && ctx.measureText(candidate).width > maxWidth) {
        out.push(line);
        line = word;
      } else {
        line = candidate;
      }
    }
    out.push(line);
  }
  return out;
}

// ---------------------------------------------------------------------------
// Shapes
// ---------------------------------------------------------------------------

function drawShape(ctx: SKRSContext2D, element: ShapeElement, dc: DrawContext): void {
  const c = element.content;
  const w = element.transform.width;
  const h = element.transform.height;
  const supported = beginShapePath(ctx, c.shapeType, w, h, c.cornerRadius);
  if (!supported) {
    dc.warnings.push(`shape "${element.id}": unsupported shapeType "${c.shapeType}"; rendered as rect.`);
  }
  if (c.fillColor) {
    ctx.fillStyle = hexToColor(c.fillColor);
    ctx.fill();
  }
  if (c.lineColor) {
    ctx.lineWidth = ((c.lineWidth ?? 1) * 96) / 72;
    ctx.strokeStyle = hexToColor(c.lineColor);
    ctx.stroke();
  }
}

/** Builds the path for a supported OOXML preset geometry; falls back to rect. */
function beginShapePath(ctx: SKRSContext2D, type: string, w: number, h: number, cornerRadius?: number): boolean {
  ctx.beginPath();
  switch (type) {
    case 'rect':
      ctx.rect(0, 0, w, h);
      return true;
    case 'roundRect': {
      const max = Math.min(w, h);
      const r = Math.max(0, Math.min(cornerRadius ?? max * 0.1, max / 2));
      roundedRect(ctx, 0, 0, w, h, r);
      return true;
    }
    case 'ellipse':
      ctx.ellipse(w / 2, h / 2, w / 2, h / 2, 0, 0, Math.PI * 2);
      return true;
    case 'triangle':
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h);
      ctx.lineTo(0, h);
      ctx.closePath();
      return true;
    case 'diamond':
      ctx.moveTo(w / 2, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w / 2, h);
      ctx.lineTo(0, h / 2);
      ctx.closePath();
      return true;
    case 'chevron':
      ctx.moveTo(0, 0);
      ctx.lineTo(w * 0.6, 0);
      ctx.lineTo(w, h / 2);
      ctx.lineTo(w * 0.6, h);
      ctx.lineTo(0, h);
      ctx.lineTo(w * 0.4, h / 2);
      ctx.closePath();
      return true;
    default:
      ctx.rect(0, 0, w, h);
      return false;
  }
}

function roundedRect(ctx: SKRSContext2D, x: number, y: number, w: number, h: number, r: number): void {
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

// ---------------------------------------------------------------------------
// Images
// ---------------------------------------------------------------------------

function drawImage(ctx: SKRSContext2D, element: ImageElement, dc: DrawContext): void {
  const c = element.content;
  const image = dc.images.get(c.sourceId);
  if (!image) {
    dc.warnings.push(`image "${element.id}": asset "${c.sourceId}" is missing or undecodable; skipped.`);
    return;
  }
  const w = element.transform.width;
  const h = element.transform.height;
  const iw = image.width;
  const ih = image.height;
  if (iw === 0 || ih === 0) return;
  const fit = c.fit ?? 'stretch';
  if (fit === 'stretch') {
    ctx.drawImage(image, 0, 0, w, h);
    return;
  }
  if (fit === 'cover') {
    const scale = Math.max(w / iw, h / ih);
    const sw = w / scale;
    const sh = h / scale;
    ctx.drawImage(image, (iw - sw) / 2, (ih - sh) / 2, sw, sh, 0, 0, w, h);
    return;
  }
  // contain
  const scale = Math.min(w / iw, h / ih);
  const dw = iw * scale;
  const dh = ih * scale;
  ctx.drawImage(image, 0, 0, iw, ih, (w - dw) / 2, (h - dh) / 2, dw, dh);
}
