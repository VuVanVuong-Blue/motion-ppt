import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { PresentationWriter } from '@motion-ppt/pptx';
import { samplePresentation } from './helpers.js';

interface Relationship {
  '@_Id'?: string;
  '@_Type'?: string;
  '@_Target'?: string;
}

function resolvePath(baseDir: string, target: string): string {
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

describe('generated PPTX archive validity', () => {
  it('contains the required OOXML parts', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation());
    const zip = await JSZip.loadAsync(buffer);
    for (const part of [
      '[Content_Types].xml',
      'ppt/presentation.xml',
      'ppt/_rels/presentation.xml.rels',
      'ppt/slides/slide1.xml',
      'ppt/slides/slide2.xml',
      'docProps/core.xml',
    ]) {
      expect(zip.file(part), `missing part ${part}`).toBeTruthy();
    }
  });

  it('parses every slide part as well-formed XML', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation());
    const zip = await JSZip.loadAsync(buffer);
    const parser = new XMLParser({ ignoreAttributes: false });
    const slideParts = Object.keys(zip.files).filter((f) => /^ppt\/slides\/slide\d+\.xml$/.test(f));
    expect(slideParts.length).toBeGreaterThanOrEqual(2);
    for (const part of slideParts) {
      const xml = await zip.file(part)!.async('string');
      expect(() => parser.parse(xml), `malformed XML in ${part}`).not.toThrow();
    }
  });

  it('resolves every relationship target to an existing part', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation());
    const zip = await JSZip.loadAsync(buffer);
    const parser = new XMLParser({ ignoreAttributes: false });
    const relParts = Object.keys(zip.files).filter((f) => f.endsWith('.rels'));
    expect(relParts.length).toBeGreaterThan(0);
    for (const relPath of relParts) {
      const xml = await zip.file(relPath)!.async('string');
      const parsed = parser.parse(xml) as { Relationships?: { Relationship?: Relationship | Relationship[] } };
      const list = parsed.Relationships?.Relationship;
      const relationships = Array.isArray(list) ? list : list ? [list] : [];
      const idx = relPath.lastIndexOf('/_rels/');
      const baseDir = idx === -1 ? '' : relPath.slice(0, idx);
      for (const rel of relationships) {
        const target = rel['@_Target'];
        if (!target || /^https?:|^mailto:/.test(target)) continue;
        const resolved = resolvePath(baseDir, target);
        expect(zip.file(resolved), `${relPath} -> ${target} (resolved ${resolved})`).toBeTruthy();
      }
    }
  });

  it('does not double-embed a shared media asset', async () => {
    const { buffer } = await new PresentationWriter().write(samplePresentation());
    const zip = await JSZip.loadAsync(buffer);
    const media = Object.keys(zip.files).filter((f) => f.startsWith('ppt/media/') && !f.endsWith('/'));
    expect(media).toHaveLength(1);
  });
});


