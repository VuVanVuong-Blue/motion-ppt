import type { AssetReference, Presentation, SlideElement } from '@motion-ppt/core';
import { createId } from '@motion-ppt/shared';
import { parsePresentation } from '@motion-ppt/core';
import JSZip from 'jszip';
import { PptxFormatError } from '../errors.js';
import { parseSpTree } from './elements.js';
import {
  attr,
  childEntries,
  elementChildren,
  elementTag,
  extractText,
  firstChild,
  hasNoFill,
  mimeFromExtension,
  numAttr,
  parseRels,
  parseSolidFill,
  parseXml,
  resolveRelTarget,
  rootEntry,
  type XmlEntry,
} from './ooxml.js';

export interface ReadPresentationResult {
  presentation: Presentation;
  warnings: string[];
}

/**
 * Tier 1 reader: parses the .pptx subset produced by {@link PresentationWriter}
 * (text boxes, pictures, native shapes) back into the core domain model.
 *
 * Unsupported constructs (native groups, tables, charts, connectors) are
 * skipped with warnings. Media is imported as base64 data-URI assets.
 */
export class PresentationReader {
  async read(input: Uint8Array): Promise<ReadPresentationResult> {
    const warnings: string[] = [];
    let zip: JSZip;
    try {
      zip = await JSZip.loadAsync(input);
    } catch (err) {
      throw new PptxFormatError('Input is not a valid ZIP/PPTX archive', { cause: err });
    }

    const presXml = await readText(zip, 'ppt/presentation.xml');
    const presNode = rootEntry(parseXml(presXml), 'p:presentation');
    if (!presNode) {
      throw new PptxFormatError('ppt/presentation.xml does not contain a <p:presentation> root element');
    }

    const sldSz = firstChild(presNode, 'p:sldSz');
    const width = emuToPx(numAttr(sldSz, 'cx') ?? 0);
    const height = emuToPx(numAttr(sldSz, 'cy') ?? 0);

    const presRels = await tryReadText(zip, 'ppt/_rels/presentation.xml.rels');
    const presRelById = new Map(parseRels(presRels ?? '').map((rel) => [rel.id, rel]));

    const slideTargets: string[] = [];
    const sldIdLst = firstChild(presNode, 'p:sldIdLst');
    if (sldIdLst) {
      for (const sldId of childEntries(sldIdLst, 'p:sldId')) {
        const rId = attr(sldId, 'r:id');
        const rel = rId ? presRelById.get(rId) : undefined;
        if (!rel) {
          warnings.push(`Slide relationship ${rId ?? 'none'} could not be resolved; slide skipped.`);
          continue;
        }
        slideTargets.push(resolveRelTarget('ppt', rel.target));
      }
    }

    const assetsRecord: Record<string, AssetReference> = {};
    const slidesRaw: Array<Record<string, unknown>> = [];
    const elementCounter = { value: 0 };

    for (const [position, slidePath] of slideTargets.entries()) {
      const slideIndex = position + 1;
      const slideXml = await readText(zip, slidePath);
      const slideNode = rootEntry(parseXml(slideXml), 'p:sld');
      if (!slideNode) {
        throw new PptxFormatError(`${slidePath} does not contain a <p:sld> root element`);
      }

      const slideDir = slidePath.slice(0, slidePath.lastIndexOf('/'));
      const slideBase = slidePath.slice(slidePath.lastIndexOf('/') + 1).replace(/\.xml$/, '');
      const slideRels = await tryReadText(zip, `${slideDir}/_rels/${slideBase}.xml.rels`);
      const rels = parseRels(slideRels ?? '');

      const assetByRid = new Map<string, AssetReference>();
      const assetByMediaPath = new Map<string, AssetReference>();
      for (const rel of rels) {
        if (!rel.type.includes('/image')) continue;
        const mediaPath = resolveRelTarget(slideDir, rel.target);
        const existing = assetByMediaPath.get(mediaPath);
        if (existing) {
          assetByRid.set(rel.id, existing);
          continue;
        }
        const bytes = await readBinary(zip, mediaPath);
        const mime = mimeFromExtension(mediaPath);
        if (!mime) {
          warnings.push(`Media part ${mediaPath} has an unrecognized extension; imported as application/octet-stream.`);
        }
        const asset: AssetReference = {
          id: `asset-${Object.keys(assetsRecord).length}`,
          sourceType: 'base64',
          uri: `data:${mime ?? 'application/octet-stream'};base64,${bytes.toString('base64')}`,
          mimeType: mime ?? 'application/octet-stream',
        };
        assetsRecord[asset.id] = asset;
        assetByMediaPath.set(mediaPath, asset);
        assetByRid.set(rel.id, asset);
      }

      const cSld = firstChild(slideNode, 'p:cSld');
      const spTree = firstChild(cSld, 'p:spTree');
      const elements: SlideElement[] = spTree
        ? parseSpTree(spTree, { slideIndex, assetByRid, warnings, elementCounter })
        : [];

      const rawSlide: Record<string, unknown> = {
        id: `slide-${slideIndex}`,
        index: slideIndex,
        width,
        height,
        elements,
      };

      const background = parseSlideBackground(cSld);
      if (background) rawSlide.background = background;

      const notes = await readSlideNotes(zip, slideDir, rels);
      if (notes) rawSlide.notes = notes;

      slidesRaw.push(rawSlide);
    }

    const docProps = await tryReadText(zip, 'docProps/core.xml');
    const title = docProps ? readDcText(docProps, 'dc:title') : undefined;
    const author = docProps ? readDcText(docProps, 'dc:creator') : undefined;

    const rawPresentation: Record<string, unknown> = {
      id: createId('presentation'),
      title: title && title.trim() ? title : 'Untitled Presentation',
      slides: slidesRaw,
      assets: assetsRecord,
    };
    if (author && author.trim()) {
      rawPresentation.metadata = { author };
    }

    const presentation = parsePresentation(rawPresentation);
    return { presentation, warnings };
  }
}

function emuToPx(emu: number): number {
  return emu / 9525;
}

function parseSlideBackground(cSld: XmlEntry | undefined): { color?: string } | undefined {
  if (!cSld) return undefined;
  for (const child of elementChildren(cSld)) {
    if (elementTag(child) !== 'p:bg') continue;
    const bgPr = firstChild(child, 'p:bgPr') ?? firstChild(child, 'p:bgRef');
    if (!bgPr || hasNoFill(bgPr)) continue;
    const fill = parseSolidFill(bgPr);
    if (fill?.color && (fill.alpha === undefined || fill.alpha > 0)) return { color: fill.color };
  }
  return undefined;
}

async function readSlideNotes(
  zip: JSZip,
  slideDir: string,
  rels: Array<{ id: string; type: string; target: string }>,
): Promise<string | undefined> {
  const notesRel = rels.find((rel) => rel.type.includes('/notesSlide'));
  if (!notesRel) return undefined;
  const notesPath = resolveRelTarget(slideDir, notesRel.target);
  const notesXml = await readText(zip, notesPath);
  const notesNode = rootEntry(parseXml(notesXml), 'p:notes');
  const cSld = notesNode ? firstChild(notesNode, 'p:cSld') : undefined;
  const spTree = cSld ? firstChild(cSld, 'p:spTree') : undefined;
  if (!spTree) return undefined;
  const paragraphs: string[] = [];
  for (const sp of childEntries(spTree, 'p:sp')) {
    const txBody = firstChild(sp, 'p:txBody');
    if (!txBody) continue;
    const lines: string[] = [];
    for (const para of childEntries(txBody, 'a:p')) {
      const line: string[] = [];
      for (const run of childEntries(para, 'a:r')) {
        const textEntry = firstChild(run, 'a:t');
        line.push(textEntry ? extractText(textEntry) : '');
      }
      lines.push(line.join(''));
    }
    if (lines.some((line) => line.length > 0)) {
      paragraphs.push(lines.join('\n'));
    }
  }
  return paragraphs.length > 0 ? paragraphs.join('\n\n') : undefined;
}

function readDcText(xml: string, tag: string): string | undefined {
  const root = rootEntry(parseXml(xml), 'cp:coreProperties');
  if (!root) return undefined;
  const entry = firstChild(root, tag);
  if (!entry) return undefined;
  const text = extractText(entry);
  return text.trim().length > 0 ? text.trim() : undefined;
}

async function readText(zip: JSZip, path: string): Promise<string> {
  const file = zip.file(path);
  if (!file) throw new PptxFormatError(`Missing required part: ${path}`);
  return file.async('string');
}

async function tryReadText(zip: JSZip, path: string): Promise<string | undefined> {
  const file = zip.file(path);
  if (!file) return undefined;
  return file.async('string');
}

async function readBinary(zip: JSZip, path: string): Promise<Buffer> {
  const file = zip.file(path);
  if (!file) throw new PptxFormatError(`Missing required part: ${path}`);
  const data = await file.async('nodebuffer');
  return data as Buffer;
}


