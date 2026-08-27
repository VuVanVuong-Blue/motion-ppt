import type { AssetReference, Presentation, Slide } from '@motion-ppt/core';
import type { AnimationPlan } from '@motion-ppt/animation';
import { computeTimeline } from '@motion-ppt/animation';
import JSZip from 'jszip';
import { PptxFormatError } from '../errors.js';
import {
  attr,
  childEntries,
  elementChildren,
  elementTag,
  firstChild,
  numAttr,
  parseRels,
  parseXml,
  resolveRelTarget,
  rootEntry,
} from '../reader/ooxml.js';
import { flattenSlideElements } from '../writer/elements.js';
import { buildTimingXml, hasNativeMapping, type TimingNode } from './timing-xml.js';

export interface TimingInjectionResult {
  /** The animated .pptx archive as a Node Buffer. */
  buffer: Buffer;
  warnings: string[];
  injectedSlides: Array<{ slideId: string; animations: number }>;
}

/**
 * Tier 2 timing injector (ADR 0002): post-processes a .pptx produced by
 * {@link PresentationWriter}, injecting a native <p:timing> node graph into
 * every slide that has an AnimationPlan.
 *
 * Element ids are resolved to OOXML shape ids via the `cNvPr name` written by
 * the writer (name === core element id). Animations whose effect has no
 * native OOXML mapping, or whose strategy is a rendered/generated asset, are
 * skipped with a warning.
 */
export class TimingInjector {
  async inject(
    input: Uint8Array,
    presentation: Presentation,
    plans: readonly AnimationPlan[],
  ): Promise<TimingInjectionResult> {
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
    const presRels = await tryReadText(zip, 'ppt/_rels/presentation.xml.rels');
    const presRelById = new Map(parseRels(presRels ?? '').map((rel) => [rel.id, rel]));
    const sldIdLst = firstChild(presNode, 'p:sldIdLst');
    const slidePaths: string[] = [];
    if (sldIdLst) {
      for (const sldId of childEntries(sldIdLst, 'p:sldId')) {
        const rId = attr(sldId, 'r:id');
        const rel = rId ? presRelById.get(rId) : undefined;
        if (rel) slidePaths.push(resolveRelTarget('ppt', rel.target));
      }
    }

    const planBySlideId = new Map(plans.map((plan) => [plan.slideId, plan]));
    const injectedSlides: Array<{ slideId: string; animations: number }> = [];

    for (let i = 0; i < slidePaths.length; i++) {
      const slide = presentation.slides[i];
      if (!slide) {
        warnings.push(`Presentation has no slide at position ${i + 1} matching the file's slide order; skipped.`);
        continue;
      }
      const plan = planBySlideId.get(slide.id);
      if (!plan) continue;

      const slidePath = slidePaths[i]!;
      const slideXml = await readText(zip, slidePath);
      const spidByTarget = resolveSpidByPosition(slideXml, slide, presentation.assets, warnings);
      if (!spidByTarget) continue;
      const timeline = computeTimeline(plan);

      const nodes: TimingNode[] = [];
      for (const resolved of timeline.animations) {
        if (resolved.strategy === 'generatedAsset' || resolved.strategy === 'renderedAsset') {
          warnings.push(
            `Animation "${resolved.itemId}" on "${resolved.target}" resolves to strategy ` +
              `"${resolved.strategy}", which is not injectable into PPTX in M3; skipped.`,
          );
          continue;
        }
        if (!hasNativeMapping(resolved.effect)) {
          warnings.push(
            `Animation "${resolved.itemId}" uses effect "${resolved.effect}", which has no native ` +
              `OOXML mapping in the M3 timing engine; skipped.`,
          );
          continue;
        }
        const spid = spidByTarget.get(resolved.target);
        if (spid === undefined) {
          warnings.push(
            `Animation "${resolved.itemId}" targets "${resolved.target}", which was not written to the slide; skipped.`,
          );
          continue;
        }
        nodes.push({
          effect: resolved.effect,
          spid,
          delayMs: Math.max(0, Math.round(resolved.start * 1000)),
          durationMs: Math.round(resolved.duration * 1000),
          direction: resolved.options?.direction,
          customPath:
            typeof resolved.options?.customProperties?.path === 'string'
              ? resolved.options.customProperties.path
              : undefined,
        });
      }

      nodes.sort((a, b) => a.delayMs - b.delayMs);
      const timingXml = buildTimingXml(nodes);
      if (timingXml.length === 0) continue;

      const nextXml = injectTimingIntoSlide(slideXml, timingXml);
      zip.file(slidePath, nextXml);
      injectedSlides.push({ slideId: slide.id, animations: nodes.length });
    }

    const buffer = (await zip.generateAsync({ type: 'nodebuffer', compression: 'DEFLATE' })) as Buffer;
    return { buffer, warnings, injectedSlides };
  }
}

/**
 * Resolves core element ids to OOXML shape ids (spids) positionally: the
 * writer emits elements in flattened order (see flattenSlideElements), and
 * the slide XML lists p:sp/p:pic children in the same document order.
 * Returns undefined (with a warning) when the counts do not match.
 */
function resolveSpidByPosition(
  slideXml: string,
  slide: Slide,
  assets: ReadonlyMap<string, AssetReference>,
  warnings: string[],
): Map<string, number> | undefined {
  const flattened = flattenSlideElements(slide, assets, warnings);
  const spids = readSpidByPosition(slideXml);
  if (spids.length !== flattened.length) {
    warnings.push(
      `Slide "${slide.id}": shape count mismatch (XML ${spids.length} vs model ${flattened.length}); timing not injected.`,
    );
    return undefined;
  }
  const map = new Map<string, number>();
  for (let i = 0; i < flattened.length; i++) {
    map.set(flattened[i]!.id, spids[i]!);
  }
  return map;
}

/** Reads the cNvPr ids of p:sp / p:pic elements in document (z-)order. */
function readSpidByPosition(slideXml: string): number[] {
  const out: number[] = [];
  const sld = rootEntry(parseXml(slideXml), 'p:sld');
  const cSld = sld ? firstChild(sld, 'p:cSld') : undefined;
  const spTree = cSld ? firstChild(cSld, 'p:spTree') : undefined;
  if (!spTree) return out;
  for (const child of elementChildren(spTree)) {
    const tag = elementTag(child);
    if (tag !== 'p:sp' && tag !== 'p:pic') continue;
    const nvPr = firstChild(child, 'p:nvSpPr') ?? firstChild(child, 'p:nvPicPr');
    const cNvPr = firstChild(nvPr, 'p:cNvPr');
    const id = numAttr(cNvPr, 'id');
    if (id !== undefined) out.push(id);
  }
  return out;
}

/** Inserts <p:timing> after </p:clrMapOvr> (schema order within p:sld). */
function injectTimingIntoSlide(slideXml: string, timingXml: string): string {
  const marker = '</p:clrMapOvr>';
  const idx = slideXml.indexOf(marker);
  if (idx !== -1) {
    return slideXml.slice(0, idx + marker.length) + timingXml + slideXml.slice(idx + marker.length);
  }
  const end = slideXml.lastIndexOf('</p:sld>');
  if (end === -1) {
    throw new PptxFormatError('Slide XML has no closing </p:sld> tag; cannot inject timing');
  }
  return slideXml.slice(0, end) + timingXml + slideXml.slice(end);
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