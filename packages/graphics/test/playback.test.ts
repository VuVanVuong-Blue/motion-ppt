import { describe, expect, it } from 'vitest';
import { computeTimeline } from '@motion-ppt/animation';
import type { AnimationPlan, AnimationItem } from '@motion-ppt/animation';
import { buildTargetIndex, computeMorphDelta, frameStatesAt } from '@motion-ppt/graphics';

const BOUNDS = { el: { width: 100, height: 50 }, x: { width: 100, height: 50 }, y: { width: 100, height: 50 }, z: { width: 100, height: 50 } };

function plan(animations: AnimationItem[]): AnimationPlan {
  return { slideId: 's1', version: '2.0', animations };
}

const IDENTITY = { opacity: 1, translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0 };

describe('frameStatesAt', () => {
  it('interpolates an active fadeIn with linear easing', () => {
    const timeline = computeTimeline(plan([{ id: 'a', target: 'el', effect: 'fadeIn', start: 0, duration: 0.5, easing: 'linear' }]));
    expect(frameStatesAt(timeline, 0, { bounds: BOUNDS }).targets.get('el')?.state.opacity).toBe(0);
    expect(frameStatesAt(timeline, 0.25, { bounds: BOUNDS }).targets.get('el')?.state.opacity).toBeCloseTo(0.5, 8);
    expect(frameStatesAt(timeline, 0.5, { bounds: BOUNDS }).targets.get('el')?.state.opacity).toBeCloseTo(1, 8);
  });

  it('applies the settled state after an entrance ends (stays visible)', () => {
    const timeline = computeTimeline(plan([{ id: 'a', target: 'el', effect: 'fadeIn', start: 0, duration: 0.5 }]));
    const s = frameStatesAt(timeline, 0.75, { bounds: BOUNDS }).targets.get('el')!;
    expect(s.active).toBeUndefined();
    expect(s.state.opacity).toBeCloseTo(1, 8);
  });

  it('keeps exits settled hidden', () => {
    const timeline = computeTimeline(plan([{ id: 'a', target: 'el', effect: 'fadeOut', start: 0, duration: 0.5 }]));
    expect(frameStatesAt(timeline, 1, { bounds: BOUNDS }).targets.get('el')?.state.opacity).toBe(0);
  });

  it('returns identity before the first animation', () => {
    const timeline = computeTimeline(plan([{ id: 'a', target: 'el', effect: 'fadeIn', start: 1, duration: 0.5 }]));
    const s = frameStatesAt(timeline, 0, { bounds: BOUNDS }).targets.get('el')!;
    expect(s.state).toEqual(IDENTITY);
    expect(s.active).toBeUndefined();
  });

  it('expands staggered targets with per-target offsets', () => {
    const timeline = computeTimeline(
      plan([{ id: 'a', targets: ['x', 'y', 'z'], effect: 'fadeIn', start: 0, duration: 0.5, stagger: { delay: 0.1 }, easing: 'linear' }]),
    );
    const at = frameStatesAt(timeline, 0.05, { bounds: BOUNDS });
    expect(at.targets.get('x')?.state.opacity).toBeCloseTo(0.1, 8); // progress (0.05 - 0) / 0.5
    expect(at.targets.get('y')?.active).toBeUndefined();
    expect(at.targets.get('y')?.state.opacity).toBe(1);
    expect(at.targets.get('z')?.state.opacity).toBe(1);
  });

  it('warns and picks the latest-ending animation on overlap', () => {
    const timeline = computeTimeline(
      plan([
        { id: 'a', target: 'el', effect: 'fadeIn', start: 0, duration: 1, easing: 'linear' },
        { id: 'b', target: 'el', effect: 'spin', start: 0.5, duration: 1 },
      ]),
    );
    const s = frameStatesAt(timeline, 0.75, { bounds: BOUNDS });
    expect(s.targets.get('el')?.active?.itemId).toBe('b');
    expect(s.warnings.some((w) => w.includes('overlapping'))).toBe(true);
  });

  it('morph interpolates from a source snapshot', () => {
    const timeline = computeTimeline(plan([{ id: 'm', target: 'el', effect: 'morph', start: 0, duration: 0.5, easing: 'linear' }]));
    const morphFrom = new Map([['el', { dx: 50, dy: 20, scaleX: 2, scaleY: 1, rotation: 0, opacity: 1 }]]);
    const start = frameStatesAt(timeline, 0, { bounds: BOUNDS, morphFrom }).targets.get('el')!.state;
    expect(start.translateX).toBeCloseTo(50, 8);
    expect(start.scaleX).toBeCloseTo(2, 8);
    const end = frameStatesAt(timeline, 0.5, { bounds: BOUNDS, morphFrom }).targets.get('el')!.state;
    expect(end.translateX).toBeCloseTo(0, 8);
    expect(end.scaleX).toBeCloseTo(1, 8);
  });

  it('morph without a source warns and fades in', () => {
    const timeline = computeTimeline(plan([{ id: 'm', target: 'el', effect: 'morph', start: 0, duration: 0.5, easing: 'linear' }]));
    const s = frameStatesAt(timeline, 0, { bounds: BOUNDS });
    expect(s.targets.get('el')?.state.opacity).toBe(0);
    expect(s.warnings.some((w) => w.includes('morphFrom'))).toBe(true);
  });
});

describe('buildTargetIndex', () => {
  it('groups by target in start order', () => {
    const timeline = computeTimeline(
      plan([
        { id: 'b', target: 'el', effect: 'fadeIn', start: 1, duration: 0.5 },
        { id: 'a', target: 'el', effect: 'fadeIn', start: 0, duration: 0.5 },
        { id: 'c', target: 'other', effect: 'fadeIn', start: 0, duration: 0.5 },
      ]),
    );
    const index = buildTargetIndex(timeline);
    expect(index.get('el')?.map((a) => a.itemId)).toEqual(['a', 'b']);
    expect(index.get('other')?.map((a) => a.itemId)).toEqual(['c']);
  });
});

describe('computeMorphDelta', () => {
  it('computes source-to-target deltas', () => {
    const d = computeMorphDelta({ x: 10, y: 20, width: 100, height: 50 }, { x: 60, y: 80, width: 100, height: 50 });
    expect(d.dx).toBe(-50);
    expect(d.dy).toBe(-60);
    expect(d.opacity).toBe(1);
  });
});
