import { describe, expect, it } from 'vitest';
import { XMLParser } from 'fast-xml-parser';
import JSZip from 'jszip';
import { PresentationReader, PresentationWriter, TimingInjector, flattenSlideElements } from '@motion-ppt/pptx';
import { EffectNotSupportedError } from '@motion-ppt/animation';
import type { AnimationPlan } from '@motion-ppt/animation';
import { samplePresentation } from './helpers.js';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });

type AnyNode = Record<string, unknown>;

function toArray<T>(value: T | T[] | undefined): T[] {
  if (value === undefined) return [];
  return Array.isArray(value) ? value : [value];
}

function attr(node: AnyNode | undefined, name: string): string | undefined {
  const value = node?.[`@_${name}`];
  return typeof value === 'string' ? value : undefined;
}

function children(node: AnyNode, tag: string): AnyNode[] {
  return toArray(node[tag] as AnyNode | AnyNode[] | undefined).filter(
    (n): n is AnyNode => typeof n === 'object' && n !== null,
  );
}

async function slideXmlOf(buffer: Uint8Array, index: number): Promise<string> {
  const zip = await JSZip.loadAsync(buffer);
  const file = zip.file(`ppt/slides/slide${index}.xml`);
  if (!file) throw new Error(`slide${index}.xml missing`);
  return file.async('string');
}

function timingRoot(xml: string): AnyNode | undefined {
  const parsed = parser.parse(xml) as AnyNode;
  const sld = toArray(parsed['p:sld'])[0] as AnyNode | undefined;
  return toArray(sld?.['p:timing'])[0] as AnyNode | undefined;
}

function mainSeqChildren(timing: AnyNode): AnyNode[] {
  const tnLst = toArray(timing['p:tnLst'])[0] as AnyNode | undefined;
  const par = toArray(tnLst?.['p:par'])[0] as AnyNode | undefined;
  const cTn = toArray(par?.['p:cTn'])[0] as AnyNode | undefined;
  const childTnLst = toArray(cTn?.['p:childTnLst'])[0] as AnyNode | undefined;
  const seq = toArray(childTnLst?.['p:seq'])[0] as AnyNode | undefined;
  const seqCn = toArray(seq?.['p:cTn'])[0] as AnyNode | undefined;
  const seqChildren = toArray(seqCn?.['p:childTnLst'])[0] as AnyNode | undefined;
  return children(seqChildren ?? {}, 'p:par');
}

function behaviorOf(animPar: AnyNode): AnyNode | undefined {
  const outerCn = toArray(animPar['p:cTn'])[0] as AnyNode | undefined;
  const childLst = toArray(outerCn?.['p:childTnLst'])[0] as AnyNode | undefined;
  const innerPar = toArray(childLst?.['p:par'])[0] as AnyNode | undefined;
  const innerCn = toArray(innerPar?.['p:cTn'])[0] as AnyNode | undefined;
  const innerLst = toArray(innerCn?.['p:childTnLst'])[0] as AnyNode | undefined;
  if (!innerLst) return undefined;
  for (const key of Object.keys(innerLst)) {
    if (key === ':@') continue;
    const nodes = toArray(innerLst[key] as AnyNode | AnyNode[] | undefined);
    return nodes[0] as AnyNode | undefined;
  }
  return undefined;
}

function delayOf(animPar: AnyNode): string | undefined {
  const outerCn = toArray(animPar['p:cTn'])[0] as AnyNode | undefined;
  const condLst = toArray(outerCn?.['p:stCondLst'])[0] as AnyNode | undefined;
  const cond = toArray(condLst?.['p:cond'])[0] as AnyNode | undefined;
  return attr(cond, 'delay');
}

function spidOf(behavior: AnyNode): string | undefined {
  const cBhvr = toArray(behavior['p:cBhvr'])[0] as AnyNode | undefined;
  const tgtEl = toArray(cBhvr?.['p:tgtEl'])[0] as AnyNode | undefined;
  const spTgt = toArray(tgtEl?.['p:spTgt'])[0] as AnyNode | undefined;
  return attr(spTgt, 'spid');
}

/**
 * cNvPr id of the n-th p:sp / p:pic in document (z-)order. Uses a regex scan
 * of the raw XML because p:sp and p:pic may interleave.
 */
function shapeSpidAt(slideXml: string, index: number): string | undefined {
  const spids: string[] = [];
  for (const match of slideXml.matchAll(/<p:(?:sp|pic)>[\s\S]*?<p:cNvPr id="(\d+)"/g)) {
    spids.push(match[1]!);
  }
  return spids[index];
}

function planFor(slideId: string, animations: unknown[]): AnimationPlan {
  return { slideId, version: '2.0', animations: animations as AnimationPlan['animations'] };
}

async function writeAndInject(presentation = samplePresentation(), plans: readonly AnimationPlan[]) {
  const written = await new PresentationWriter().write(presentation);
  return new TimingInjector().inject(written.buffer, presentation, plans);
}

/** Position of a target id in the writer's flattened emission order. */
function flattenedIndexOf(presentation = samplePresentation(), slideIndex: number, targetId: string): number {
  const slide = presentation.slides[slideIndex]!;
  return flattenSlideElements(slide, presentation.assets, []).findIndex((el) => el.id === targetId);
}

describe('TimingInjector', () => {
  it('injects a fadeIn timing tree with absolute delays and correct spids', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'a1', target: 'title', effect: 'fadeIn', start: 0, duration: 0.5 },
      { id: 'a2', target: 'subtitle', effect: 'fadeIn', start: 0.3, duration: 0.4 },
    ]);
    const { buffer, warnings, injectedSlides } = await writeAndInject(presentation, [plan]);

    expect(warnings).toEqual([]);
    expect(injectedSlides).toEqual([{ slideId: 'slide-1', animations: 2 }]);

    const slide1 = await slideXmlOf(buffer, 1);
    const timing = timingRoot(slide1);
    expect(timing).toBeDefined();

    const anims = mainSeqChildren(timing!);
    expect(anims).toHaveLength(2);
    expect(delayOf(anims[0]!)).toBe('0');
    expect(delayOf(anims[1]!)).toBe('300');

    expect(spidOf(behaviorOf(anims[0]!)!)).toBe(shapeSpidAt(slide1, flattenedIndexOf(presentation, 0, 'title')));
    expect(spidOf(behaviorOf(anims[1]!)!)).toBe(shapeSpidAt(slide1, flattenedIndexOf(presentation, 0, 'subtitle')));

    // slide 2 has no plan -> untouched
    const slide2 = await slideXmlOf(buffer, 2);
    expect(slide2).not.toContain('<p:timing');
  });

  it('produces unique cTn ids across the timing tree', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'a1', targets: ['title', 'subtitle'], effect: 'fadeIn', start: 0, duration: 0.5, stagger: { delay: 0.1 } },
    ]);
    const { buffer } = await writeAndInject(presentation, [plan]);
    const slide1 = await slideXmlOf(buffer, 1);
    const ids = [...slide1.matchAll(/<p:cTn id="(\d+)"/g)].map((m) => m[1]!);
    expect(ids.length).toBeGreaterThan(3);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('maps DSL stagger to sequential native delays (default 0.06s)', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'cards', targets: ['rect1', 'ellipse1', 'img1'], effect: 'fadeIn', start: 0.4, duration: 0.5 },
    ]);
    const { buffer } = await writeAndInject(presentation, [plan]);
    const slide1 = await slideXmlOf(buffer, 1);
    const anims = mainSeqChildren(timingRoot(slide1)!);
    expect(anims.map(delayOf)).toEqual(['400', '460', '520']);
    expect(anims.map((a) => spidOf(behaviorOf(a)!))).toEqual([
      shapeSpidAt(slide1, flattenedIndexOf(presentation, 0, 'rect1')),
      shapeSpidAt(slide1, flattenedIndexOf(presentation, 0, 'ellipse1')),
      shapeSpidAt(slide1, flattenedIndexOf(presentation, 0, 'img1')),
    ]);
  });

  it('builds direction-aware motion paths for slideIn', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'a1', target: 'title', effect: 'slideIn', start: 0, duration: 0.6, options: { direction: 'bottom' } },
      { id: 'a2', target: 'subtitle', effect: 'slideIn', start: 0.7, duration: 0.6, options: { direction: 'left' } },
    ]);
    const { buffer, warnings } = await writeAndInject(presentation, [plan]);
    expect(warnings).toEqual([]);
    const slide1 = await slideXmlOf(buffer, 1);
    const anims = mainSeqChildren(timingRoot(slide1)!);
    const paths = anims.map((a) => attr(behaviorOf(a), 'path'));
    expect(paths).toEqual(['M 0 1 L 0 0', 'M -1 0 L 0 0']);
  });

  it('maps zoomIn, spin and pulse to native scale/rotate behaviors', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-2', [
      { id: 'z', target: 'rotated', effect: 'zoomIn', start: 0, duration: 0.4 },
      { id: 's', target: 'nofill', effect: 'spin', start: 0.5, duration: 0.7 },
    ]);
    const { buffer, warnings } = await writeAndInject(presentation, [plan]);
    expect(warnings).toEqual([]);
    const slide2 = await slideXmlOf(buffer, 2);
    expect(slide2).toContain('<p:animScale>');
    expect(slide2).toContain('<p:to x="100000" y="100000"/>');
    expect(slide2).toContain('<p:animRot by="21600000">');
  });

  it('skips effects without a native mapping and reports warnings', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'a1', target: 'title', effect: 'riseIn', start: 0, duration: 0.5 },
      { id: 'a2', target: 'subtitle', effect: 'morph', start: 0.3, duration: 0.4 },
    ]);
    const { buffer, warnings, injectedSlides } = await writeAndInject(presentation, [plan]);
    expect(warnings.some((w) => w.includes('riseIn'))).toBe(true);
    expect(warnings.some((w) => w.includes('morph'))).toBe(true);
    expect(injectedSlides).toEqual([]);
    const slide1 = await slideXmlOf(buffer, 1);
    expect(slide1).not.toContain('<p:timing');
  });

  it('skips animations targeting elements that were not written', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [{ id: 'a1', target: 'ghost', effect: 'fadeIn', start: 0, duration: 0.5 }]);
    const { warnings, injectedSlides } = await writeAndInject(presentation, [plan]);
    expect(warnings.some((w) => w.includes('ghost'))).toBe(true);
    expect(injectedSlides).toEqual([]);
  });

  it('rejects plans with unknown effects', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [{ id: 'a1', target: 'title', effect: 'nope', start: 0, duration: 0.5 }]);
    await expect(writeAndInject(presentation, [plan])).rejects.toBeInstanceOf(EffectNotSupportedError);
  });

  it('injects into multiple slides', async () => {
    const presentation = samplePresentation();
    const plans = [
      planFor('slide-1', [{ id: 'a1', target: 'title', effect: 'fadeIn', start: 0, duration: 0.5 }]),
      planFor('slide-2', [{ id: 'a2', target: 'rotated', effect: 'fadeIn', start: 0, duration: 0.5 }]),
    ];
    const { buffer, injectedSlides } = await writeAndInject(presentation, plans);
    expect(injectedSlides).toHaveLength(2);
    expect((await slideXmlOf(buffer, 1)).includes('<p:timing')).toBe(true);
    expect((await slideXmlOf(buffer, 2)).includes('<p:timing')).toBe(true);
  });

  it('injects nothing for an empty plan and leaves the file intact', async () => {
    const presentation = samplePresentation();
    const { buffer, injectedSlides } = await writeAndInject(presentation, [planFor('slide-1', [])]);
    expect(injectedSlides).toEqual([]);
    const slide1 = await slideXmlOf(buffer, 1);
    expect(slide1).not.toContain('<p:timing');
    const { presentation: readBack } = await new PresentationReader().read(buffer);
    expect(readBack.slides).toHaveLength(2);
  });

  it('keeps the injected file readable and z-order intact', async () => {
    const presentation = samplePresentation();
    const plan = planFor('slide-1', [
      { id: 'a1', target: 'title', effect: 'fadeIn', start: 0, duration: 0.5 },
      { id: 'a2', target: 'rect1', effect: 'slideIn', start: 0.2, duration: 0.6, options: { direction: 'left' } },
    ]);
    const { buffer } = await writeAndInject(presentation, [plan]);
    const { presentation: readBack, warnings } = await new PresentationReader().read(buffer);
    expect(warnings).toEqual([]);
    expect(readBack.slides[0]!.elements.map((e) => e.type)).toEqual([
      'text', 'text', 'shape', 'shape', 'image', 'shape', 'text',
    ]);
  });
});