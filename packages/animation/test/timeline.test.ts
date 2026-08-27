import { describe, expect, it } from 'vitest';
import { computeStaggerOffsets, computeTimeline, getPlanTargets } from '@motion-ppt/animation';
import { EffectNotSupportedError, InvalidAnimationPlanError } from '@motion-ppt/animation';
import type { AnimationItem } from '@motion-ppt/animation';
import { ElementNotFoundError, createSlide, createTextElement } from '@motion-ppt/core';

function plan(animations: AnimationItem[]) {
  return { slideId: 's1', version: '2.0' as const, animations };
}

describe('computeStaggerOffsets', () => {
  it('forward staggers from the first item', () => {
    expectClose(computeStaggerOffsets(3, { delay: 0.15, mode: 'forward' }), [0, 0.15, 0.3]);
  });

  it('reverse staggers from the last item', () => {
    expectClose(computeStaggerOffsets(3, { delay: 0.15, mode: 'reverse' }), [0.3, 0.15, 0]);
  });

  it('center_out starts at the middle and alternates outward', () => {
    expectClose(computeStaggerOffsets(3, { delay: 0.15, mode: 'center_out' }), [0.15, 0, 0.3]);
    expectClose(computeStaggerOffsets(4, { delay: 0.1, mode: 'center_out' }), [0.1, 0, 0.2, 0.3]);
  });

  it('defaults to a 0.06s forward stagger', () => {
    expectClose(computeStaggerOffsets(2), [0, 0.06]);
  });

  it('a single target has no offset', () => {
    expect(computeStaggerOffsets(1, { delay: 1 })).toEqual([0]);
  });
});

describe('computeTimeline', () => {
  it('resolves absolute start/end with defaults', () => {
    const timeline = computeTimeline(plan([{ id: 'a', target: 't', effect: 'fadeIn', start: 0.2, duration: 0.5 }]));
    expect(timeline.animations).toHaveLength(1);
    expect(timeline.animations[0]).toMatchObject({
      target: 't',
      start: 0.2,
      end: 0.7,
      duration: 0.5,
      easing: 'easeOutCubic',
      category: 'entrance',
      strategy: 'native',
    });
    expect(timeline.duration).toBe(0.7);
    expect(timeline.slideId).toBe('s1');
  });

  it('applies stagger offsets to multiple targets', () => {
    const timeline = computeTimeline(
      plan([{ id: 'a', targets: ['c1', 'c2', 'c3'], effect: 'riseIn', start: 0, duration: 0.4, stagger: { delay: 0.1 } }]),
    );
    const starts = timeline.animations.map((a) => a.start);
    expectClose(starts, [0, 0.1, 0.2]);
    expect(timeline.duration).toBeCloseTo(0.6, 9);
  });

  it('honors strategyOverride when supported', () => {
    const timeline = computeTimeline(
      plan([{ id: 'a', target: 't', effect: 'fadeIn', start: 0, duration: 0.5, strategyOverride: 'composite' }]),
    );
    expect(timeline.animations[0]?.strategy).toBe('composite');
  });

  it('falls back to the best supported strategy for unsupported overrides', () => {
    const timeline = computeTimeline(
      plan([{ id: 'a', target: 't', effect: 'riseIn', start: 0, duration: 0.5, strategyOverride: 'native' }]),
    );
    expect(timeline.animations[0]?.strategy).toBe('composite');
  });

  it('throws EffectNotSupportedError for unknown effects', () => {
    expect(() => computeTimeline(plan([{ id: 'a', target: 't', effect: 'nope', start: 0, duration: 0.5 }]))).toThrow(
      EffectNotSupportedError,
    );
  });

  it('rejects structurally invalid plans', () => {
    expect(() =>
      computeTimeline({ slideId: 's', version: '2.0', animations: [{ id: 'x', effect: 'fadeIn', start: -1, duration: 1 }] }),
    ).toThrow(InvalidAnimationPlanError);
  });

  it('validates targets against a slide when provided', () => {
    const slide = createSlide({
      elements: [createTextElement({ id: 't', transform: { x: 0, y: 0, width: 10, height: 10 }, content: { text: 'x' } })],
    });
    const timeline = computeTimeline(plan([{ id: 'a', target: 't', effect: 'fadeIn', start: 0, duration: 0.5 }]), { slide });
    expect(timeline.animations[0]?.target).toBe('t');
    expect(() =>
      computeTimeline(plan([{ id: 'a', target: 'missing', effect: 'fadeIn', start: 0, duration: 0.5 }]), { slide }),
    ).toThrow(ElementNotFoundError);
  });

  it('resolves spring easings with per-target entries', () => {
    const timeline = computeTimeline(
      plan([
        {
          id: 'cards-organic',
          targets: ['card-1', 'card-2'],
          effect: 'riseIn',
          start: 0.12,
          duration: 0.42,
          easing: 'spring',
          spring: { preset: 'default' },
        },
      ]),
    );
    expect(timeline.animations).toHaveLength(2);
    expect(timeline.animations[0]?.start).toBeCloseTo(0.12, 6);
    expect(timeline.animations[1]?.start).toBeCloseTo(0.18, 6);
    expect(typeof timeline.animations[0]?.easingFunction(0.5)).toBe('number');
  });

  it('computes an empty timeline', () => {
    const timeline = computeTimeline(plan([]));
    expect(timeline.animations).toEqual([]);
    expect(timeline.duration).toBe(0);
  });
});

describe('getPlanTargets', () => {
  it('collects unique targets in first-use order', () => {
    const targets = getPlanTargets(
      plan([
        { id: 'a', target: 't1', effect: 'fadeIn', start: 0, duration: 0.5 },
        { id: 'b', targets: ['t2', 't1'], effect: 'fadeIn', start: 0, duration: 0.5 },
      ]),
    );
    expect(targets).toEqual(['t1', 't2']);
  });
});
/** Asserts arrays of numbers are equal within float tolerance. */
function expectClose(actual: number[], expected: number[]): void {
  expect(actual).toHaveLength(expected.length);
  for (let i = 0; i < expected.length; i++) {
    expect(actual[i]).toBeCloseTo(expected[i]!, 9);
  }
}