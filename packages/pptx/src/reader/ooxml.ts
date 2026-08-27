import { XMLParser } from 'fast-xml-parser';
import { emuToPx } from '@motion-ppt/shared';

/**
 * Low-level helpers for reading OOXML parts.
 *
 * The parser runs in `preserveOrder` mode so that sibling order (z-order of
 * the spTree) and repeated elements are preserved exactly as written.
 *
 * Entry model (preserveOrder): every element becomes an entry object
 * `{ tagName: XmlEntry[], ':@': { '@_attr': value }, '#text'?: string }` —
 * child elements are arrays of entries under their tag key, attributes live
 * under the reserved `:@` key, and text nodes appear as `#text` entries.
 */

/** One parsed element entry. */
export type XmlEntry = Record<string, unknown>;

export function parseXml(xml: string): XmlEntry[] {
  const parser = new XMLParser({
    ignoreAttributes: false,
    attributeNamePrefix: '@_',
    parseTagValue: false,
    parseAttributeValue: false,
    trimValues: false,
    processEntities: true,
    preserveOrder: true,
  });
  return parser.parse(xml) as XmlEntry[];
}

export function isEntry(value: unknown): value is XmlEntry {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/** Finds the top-level entry carrying the given tag (e.g. the document root). */
export function rootEntry(entries: XmlEntry[], tag: string): XmlEntry | undefined {
  for (const entry of entries) {
    if (entry[tag] !== undefined) return entry;
  }
  return undefined;
}

/**
 * Returns the tag name of an element entry — the one key that is neither the
 * reserved attributes (`:@`) nor a text node (`#text`).
 */
export function elementTag(entry: XmlEntry): string | undefined {
  for (const key of Object.keys(entry)) {
    if (key === ':@' || key === '#text') continue;
    return key;
  }
  return undefined;
}

/**
 * Child element entries of an entry, in document order. An element entry
 * stores its children under its own tag key: `{ 'p:sld': [ ...children ] }`.
 */
export function elementChildren(entry: XmlEntry): XmlEntry[] {
  for (const key of Object.keys(entry)) {
    if (key === ':@' || key === '#text') continue;
    const value = entry[key];
    if (Array.isArray(value)) return value.filter(isEntry);
  }
  return [];
}

/** Child entries of `entry` carrying the given tag. */
export function childEntries(entry: XmlEntry, tag: string): XmlEntry[] {
  return elementChildren(entry).filter((child) => child[tag] !== undefined);
}

/** First child entry with the given tag, or `undefined`. */
export function firstChild(entry: XmlEntry | undefined, tag: string): XmlEntry | undefined {
  if (!entry) return undefined;
  return childEntries(entry, tag)[0];
}

/** Reads a string attribute value, or `undefined`. */
export function attr(entry: XmlEntry | undefined, name: string): string | undefined {
  if (!entry) return undefined;
  const attrs = entry[':@'];
  if (!isEntry(attrs)) return undefined;
  const value = attrs[`@_${name}`];
  return typeof value === 'string' ? value : undefined;
}

/** Reads a numeric attribute value, or `undefined`. */
export function numAttr(entry: XmlEntry | undefined, name: string): number | undefined {
  const value = attr(entry, name);
  if (value === undefined || value === '') return undefined;
  const n = Number(value);
  return Number.isFinite(n) ? n : undefined;
}

/**
 * Extracts the text content of an element: either a direct string, the
 * entry's own `#text`, or the `#text` of a text-node child entry.
 */
export function extractText(value: unknown): string {
  if (typeof value === 'string') return value;
  if (!isEntry(value)) return '';
  const direct = value['#text'];
  if (typeof direct === 'string') return direct;
  for (const key of Object.keys(value)) {
    if (key === ':@' || key === '#text') continue;
    const children = value[key];
    if (!Array.isArray(children)) continue;
    for (const child of children) {
      if (isEntry(child)) {
        const text = child['#text'];
        if (typeof text === 'string') return text;
      }
    }
  }
  return '';
}

export interface ParsedXfrm {
  x: number;
  y: number;
  width: number;
  height: number;
  /** Clockwise rotation in degrees. */
  rotation?: number;
}

/**
 * Parses the `<a:xfrm>` inside an element's `spPr`. OOXML positions are in
 * EMU; the result is converted to pixels (96 dpi). `rot` is in 1/60000 deg.
 */
export function parseXfrm(spPr: XmlEntry | undefined): ParsedXfrm | undefined {
  if (!spPr) return undefined;
  const xfrm = firstChild(spPr, 'a:xfrm');
  if (!xfrm) return undefined;
  const off = firstChild(xfrm, 'a:off');
  const ext = firstChild(xfrm, 'a:ext');
  const x = numAttr(off, 'x');
  const y = numAttr(off, 'y');
  const cx = numAttr(ext, 'cx');
  const cy = numAttr(ext, 'cy');
  if (x === undefined || y === undefined || cx === undefined || cy === undefined) return undefined;
  const rot = numAttr(xfrm, 'rot');
  const parsed: ParsedXfrm = {
    x: emuToPx(x),
    y: emuToPx(y),
    width: emuToPx(cx),
    height: emuToPx(cy),
  };
  if (rot !== undefined) parsed.rotation = rot / 60000;
  return parsed;
}

export interface ParsedFill {
  /** Hex color `RRGGBB` when a solid fill is present. */
  color?: string;
  /** Alpha in 0..100000 (100000 = fully opaque). */
  alpha?: number;
}

/** Parses the first `<a:solidFill>` child into color + alpha. */
export function parseSolidFill(parent: XmlEntry | undefined): ParsedFill | undefined {
  if (!parent) return undefined;
  const solidFill = firstChild(parent, 'a:solidFill');
  if (!solidFill) return undefined;
  const srgbClr = firstChild(solidFill, 'a:srgbClr');
  if (!srgbClr) return undefined;
  const color = attr(srgbClr, 'val');
  const alphaNode = firstChild(srgbClr, 'a:alpha');
  const alpha = numAttr(alphaNode, 'val');
  return { ...(color ? { color } : {}), ...(alpha !== undefined ? { alpha } : {}) };
}

/** Returns `true` when the parent contains an `<a:noFill/>` marker. */
export function hasNoFill(parent: XmlEntry | undefined): boolean {
  if (!parent) return false;
  return firstChild(parent, 'a:noFill') !== undefined;
}

export interface ParsedRelationship {
  id: string;
  type: string;
  target: string;
}

/** Parses a `.rels` part into its relationships. */
export function parseRels(xml: string): ParsedRelationship[] {
  const entries = parseXml(xml);
  const root = rootEntry(entries, 'Relationships');
  if (!root) return [];
  const out: ParsedRelationship[] = [];
  for (const rel of childEntries(root, 'Relationship')) {
    const id = attr(rel, 'Id');
    const target = attr(rel, 'Target');
    if (id && target) {
      out.push({ id, type: attr(rel, 'Type') ?? '', target });
    }
  }
  return out;
}

/** Resolves a relationship target relative to the part's directory. */
export function resolveRelTarget(baseDir: string, target: string): string {
  const parts = [...baseDir.split('/'), ...target.split('/')];
  const out: string[] = [];
  for (const part of parts) {
    if (!part || part === '.') continue;
    if (part === '..') {
      out.pop();
      continue;
    }
    out.push(part);
  }
  return out.join('/');
}

const MIME_BY_EXT: Record<string, string> = {
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  gif: 'image/gif',
  webp: 'image/webp',
  svg: 'image/svg+xml',
  bmp: 'image/bmp',
  tif: 'image/tiff',
  tiff: 'image/tiff',
  ico: 'image/x-icon',
  emf: 'image/x-emf',
  wmf: 'image/x-wmf',
  mp4: 'video/mp4',
  webm: 'video/webm',
};

/** Maps a media file extension to a MIME type, or `undefined`. */
export function mimeFromExtension(path: string): string | undefined {
  const ext = path.split('.').pop()?.toLowerCase();
  return ext ? MIME_BY_EXT[ext] : undefined;
}

