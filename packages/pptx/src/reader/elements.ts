import type { AssetReference, SlideElement } from '@motion-ppt/core';
import { parseSlideElement } from '@motion-ppt/core';
import {
  attr,
  childEntries,
  elementChildren,
  elementTag,
  extractText,
  firstChild,
  hasNoFill,
  numAttr,
  parseSolidFill,
  parseXfrm,
  type XmlEntry,
} from './ooxml.js';

export interface ParseElementContext {
  /** 1-based slide position, used to build stable element ids. */
  slideIndex: number;
  /** Assets resolved from the slide's relationships, keyed by relationship id. */
  assetByRid: ReadonlyMap<string, AssetReference>;
  warnings: string[];
  /** Mutable per-read counter used to build unique element ids. */
  elementCounter: { value: number };
}

export interface ParsedTextRunInfo {
  text: string;
  fontSize?: number;
  bold?: boolean;
  italic?: boolean;
  underline?: boolean;
  color?: string;
  fontFamily?: string;
  align?: 'left' | 'center' | 'right' | 'justify';
  verticalAlign?: 'top' | 'middle' | 'bottom';
  /** Element opacity derived from the run fill alpha (0..1). */
  opacity?: number;
}

/** Extracts text + run formatting from a `<p:txBody>`. */
export function parseTextBody(node: XmlEntry): ParsedTextRunInfo | undefined {
  const txBody = firstChild(node, 'p:txBody');
  if (!txBody) return undefined;

  const bodyPr = firstChild(txBody, 'a:bodyPr');
  const anchor = attr(bodyPr, 'anchor');
  const verticalAlign = anchor === 'ctr' ? 'middle' : anchor === 'b' ? 'bottom' : undefined;

  const parts: string[] = [];
  let firstRunPr: XmlEntry | undefined;
  for (const para of childEntries(txBody, 'a:p')) {
    for (const run of childEntries(para, 'a:r')) {
      const runPr = firstChild(run, 'a:rPr');
      if (!firstRunPr) firstRunPr = runPr;
      const textEntry = firstChild(run, 'a:t');
      parts.push(textEntry ? extractText(textEntry) : '');
    }
    parts.push('\n');
  }
  while (parts.length > 0 && parts[parts.length - 1] === '\n') parts.pop();

  const result: ParsedTextRunInfo = { text: parts.join('') };
  if (firstRunPr) {
    const sz = numAttr(firstRunPr, 'sz');
    if (sz !== undefined) result.fontSize = sz / 100;
    if (attr(firstRunPr, 'b') === '1') result.bold = true;
    if (attr(firstRunPr, 'i') === '1') result.italic = true;
    if (attr(firstRunPr, 'u') === 'sng') result.underline = true;
    const fill = parseSolidFill(firstRunPr);
    if (fill?.color) result.color = fill.color;
    // PptxGenJS encodes text transparency as an alpha on the run fill color.
    if (fill?.alpha !== undefined && fill.alpha < 100000) {
      result.opacity = fill.alpha / 100000;
    }
    const latin = firstChild(firstRunPr, 'a:latin');
    const typeface = attr(latin, 'typeface');
    if (typeface) result.fontFamily = typeface;
  }

  const firstPara = childEntries(txBody, 'a:p')[0];
  if (firstPara) {
    const pPr = firstChild(firstPara, 'a:pPr');
    const algn = attr(pPr, 'algn');
    if (algn === 'ctr') result.align = 'center';
    else if (algn === 'r') result.align = 'right';
    else if (algn === 'just') result.align = 'justify';
  }
  if (verticalAlign) result.verticalAlign = verticalAlign;
  return result;
}

/** Parses all element children of a slide's `<p:spTree>` in document order (z-order). */
export function parseSpTree(spTree: XmlEntry, ctx: ParseElementContext): SlideElement[] {
  const elements: SlideElement[] = [];
  for (const child of elementChildren(spTree)) {
    const tag = elementTag(child);
    if (tag === 'p:sp') {
      const element = parseShapeOrText(child, ctx);
      if (element) elements.push(element);
    } else if (tag === 'p:pic') {
      const element = parsePicture(child, ctx);
      if (element) elements.push(element);
    } else if (tag === 'p:grpSp') {
      ctx.warnings.push('Encountered a native OOXML group (p:grpSp), which the M1 reader does not parse; skipped.');
    } else if (tag === 'p:graphicFrame') {
      ctx.warnings.push('Encountered a table/chart (p:graphicFrame), which the M1 reader does not parse; skipped.');
    } else if (tag === 'p:cxnSp') {
      ctx.warnings.push('Encountered a connector (p:cxnSp), which the M1 reader does not parse; skipped.');
    }
  }
  return elements;
}

function elementId(ctx: ParseElementContext): string {
  const value = ctx.elementCounter.value;
  ctx.elementCounter.value += 1;
  return `el-${ctx.slideIndex}-${value}`;
}

function commonName(node: XmlEntry): string | undefined {
  const nvPr = firstChild(node, 'p:nvSpPr') ?? firstChild(node, 'p:nvPicPr');
  const cNvPr = firstChild(nvPr, 'p:cNvPr');
  return attr(cNvPr, 'name');
}

function parseShapeOrText(node: XmlEntry, ctx: ParseElementContext): SlideElement | undefined {
  const spPr = firstChild(node, 'p:spPr');
  const xfrm = parseXfrm(spPr);
  if (!xfrm) {
    ctx.warnings.push('Skipped a shape without a usable transform (a:xfrm).');
    return undefined;
  }
  const textInfo = parseTextBody(node);
  const id = elementId(ctx);
  const name = commonName(node);

  if (textInfo) {
    const transform = textInfo.opacity !== undefined ? { ...xfrm, opacity: textInfo.opacity } : xfrm;
    return parseSlideElement({
      id,
      ...(name ? { name } : {}),
      type: 'text',
      transform,
      content: {
        text: textInfo.text,
        ...(textInfo.fontSize !== undefined ? { fontSize: textInfo.fontSize } : {}),
        ...(textInfo.bold ? { bold: true } : {}),
        ...(textInfo.italic ? { italic: true } : {}),
        ...(textInfo.underline ? { underline: true } : {}),
        ...(textInfo.color ? { color: textInfo.color } : {}),
        ...(textInfo.fontFamily ? { fontFamily: textInfo.fontFamily } : {}),
        ...(textInfo.align ? { align: textInfo.align } : {}),
        ...(textInfo.verticalAlign ? { verticalAlign: textInfo.verticalAlign } : {}),
      },
    });
  }

  const prstGeom = firstChild(spPr, 'a:prstGeom');
  const shapeType = attr(prstGeom, 'prst') ?? 'rect';
  const fill = parseSolidFill(spPr);
  const hasFill = fill !== undefined && !hasNoFill(spPr) && (fill.alpha === undefined || fill.alpha > 0);
  const lineNode = firstChild(spPr, 'a:ln');
  const lineFill = parseSolidFill(lineNode);
  const hasLine =
    lineNode !== undefined && !hasNoFill(lineNode) && lineFill !== undefined && (lineFill.alpha === undefined || lineFill.alpha > 0);

  return parseSlideElement({
    id,
    ...(name ? { name } : {}),
    type: 'shape',
    transform: xfrm,
    content: {
      shapeType,
      ...(hasFill && fill?.color ? { fillColor: fill.color } : {}),
      ...(hasLine && lineFill?.color ? { lineColor: lineFill.color } : {}),
      ...(hasLine && lineFill?.color ? { lineWidth: lineWidthPt(lineNode) } : {}),
    },
  });
}

function lineWidthPt(lineNode: XmlEntry): number | undefined {
  const w = numAttr(lineNode, 'w');
  if (w === undefined) return undefined;
  // OOXML line width is in EMU; 1pt = 12700 EMU.
  return w / 12700;
}

function parsePicture(node: XmlEntry, ctx: ParseElementContext): SlideElement | undefined {
  const blipFill = firstChild(node, 'p:blipFill');
  const blip = firstChild(blipFill, 'a:blip');
  const rId = attr(blip, 'r:embed');
  const asset = rId ? ctx.assetByRid.get(rId) : undefined;
  if (!asset) {
    ctx.warnings.push(`Skipped a picture whose image relationship (${rId ?? 'none'}) could not be resolved.`);
    return undefined;
  }
  const spPr = firstChild(node, 'p:spPr');
  const xfrm = parseXfrm(spPr);
  if (!xfrm) {
    ctx.warnings.push('Skipped a picture without a usable transform (a:xfrm).');
    return undefined;
  }
  if (firstChild(blipFill, 'a:srcRect')) {
    ctx.warnings.push('A picture uses a crop (a:srcRect); the M1 reader imports it as a stretched image.');
  }
  const id = elementId(ctx);
  const name = commonName(node);
  return parseSlideElement({
    id,
    ...(name ? { name } : {}),
    type: 'image',
    transform: xfrm,
    content: { sourceId: asset.id },
  });
}


