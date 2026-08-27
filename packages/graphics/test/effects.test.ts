import { describe, expect, it } from 'vitest';
import { InvalidArgumentError } from '@motion-ppt/shared';
import {
  DEFAULT_SLIDE_DIRECTION,
  easeOutBounce,
  effectVisualState,
  parseMotionPath,
  pointAtFraction,
  PULSE_AMPLITUDE,
  RISE_FRACTION,
  WIGGLE_AMPLITUDE_DEG,
} from '@motion-ppt/graphics';

const BOUNDS = { width: 100, height: 50 };

describe('effectVisualState', () => {
  it('fadeIn interpolates opacity 0 -> 1', () => {
    expect(effectVisualState({ effect: 'fadeIn', p: 0, bounds: BOUNDS }).opacity).toBe(0);
    expect(effectVisualState({ effect: 'fadeIn', p: 0.5, bounds: BOUNDS }).opacity).toBeCloseTo(0.5, 10);
    expect(effectVisualState({ effect: 'fadeIn', p: 1, bounds: BOUNDS }).opacity).toBe(1);
  });

  it('fadeOut interpolates opacity 1 -> 0', () => {
    expect(effectVisualState({ effect: 'fadeOut', p: 0, bounds: BOUNDS }).opacity).toBe(1);
    expect(effectVisualState({ effect: 'fadeOut', p: 1, bounds: BOUNDS }).opacity).toBe(0);
  });

  it('staggerIn behaves like an entrance fade', () => {
    expect(effectVisualState({ effect: 'staggerIn', p: 0, bounds: BOUNDS }).opacity).toBe(0);
    expect(effectVisualState({ effect: 'staggerIn', p: 1, bounds: BOUNDS }).opacity).toBe(1);
  });

  it('slideIn travels from the requested edge to rest', () => {
    const start = effectVisualState({ effect: 'slideIn', p: 0, bounds: BOUNDS, options: { direction: 'bottom' } });
    expect(start.translateY).toBeCloseTo(50, 8);
    expect(effectVisualState({ effect: 'slideIn', p: 1, bounds: BOUNDS, options: { direction: 'bottom' } }).translateY).toBeCloseTo(0, 8);
    const left = effectVisualState({ effect: 'slideIn', p: 0, bounds: BOUNDS, options: { direction: 'left' } });
    expect(left.translateX).toBeCloseTo(-100, 8);
  });

  it('slideIn defaults to bottom, matching the PPTX timing engine', () => {
    expect(DEFAULT_SLIDE_DIRECTION).toBe('bottom');
    expect(effectVisualState({ effect: 'slideIn', p: 0, bounds: BOUNDS }).translateY).toBeCloseTo(50, 8);
  });

  it('slideIn honors an explicit distance', () => {
    const start = effectVisualState({ effect: 'slideIn', p: 0, bounds: BOUNDS, options: { direction: 'top', distance: 20 } });
    expect(start.translateY).toBeCloseTo(-20, 8);
  });

  it('slideOut travels from rest to the edge', () => {
    const end = effectVisualState({ effect: 'slideOut', p: 1, bounds: BOUNDS, options: { direction: 'right' } });
    expect(end.translateX).toBeCloseTo(100, 8);
    expect(effectVisualState({ effect: 'slideOut', p: 0, bounds: BOUNDS, options: { direction: 'right' } }).translateX).toBeCloseTo(0, 8);
  });

  it('riseIn combines upward travel with a fade-in', () => {
    const start = effectVisualState({ effect: 'riseIn', p: 0, bounds: BOUNDS });
    expect(start.opacity).toBe(0);
    expect(start.translateY).toBeCloseTo(50 * RISE_FRACTION, 8);
    const end = effectVisualState({ effect: 'riseIn', p: 1, bounds: BOUNDS });
    expect(end.opacity).toBe(1);
    expect(end.translateY).toBeCloseTo(0, 8);
  });

  it('zoomIn scales 0 -> 1 and zoomOut scales 1 -> 0', () => {
    expect(effectVisualState({ effect: 'zoomIn', p: 0, bounds: BOUNDS }).scaleX).toBe(0);
    expect(effectVisualState({ effect: 'zoomIn', p: 0.5, bounds: BOUNDS }).scaleX).toBeCloseTo(0.5, 10);
    expect(effectVisualState({ effect: 'zoomIn', p: 1, bounds: BOUNDS }).scaleX).toBe(1);
    expect(effectVisualState({ effect: 'zoomOut', p: 1, bounds: BOUNDS }).scaleX).toBe(0);
  });

  it('pulse oscillates within the amplitude band and settles at 1', () => {
    for (const p of [0, 0.125, 0.25, 0.375, 0.5, 0.75, 1]) {
      const s = effectVisualState({ effect: 'pulse', p, bounds: BOUNDS });
      expect(s.scaleX).toBeGreaterThanOrEqual(1 - PULSE_AMPLITUDE - 1e-9);
      expect(s.scaleX).toBeLessThanOrEqual(1 + PULSE_AMPLITUDE + 1e-9);
    }
    expect(effectVisualState({ effect: 'pulse', p: 0, bounds: BOUNDS }).scaleX).toBeCloseTo(1, 8);
    expect(effectVisualState({ effect: 'pulse', p: 1, bounds: BOUNDS }).scaleX).toBeCloseTo(1, 8);
  });

  it('wiggle oscillates rotation within its amplitude and settles at 0', () => {
    for (const p of [0, 0.25, 0.5, 0.75, 1]) {
      const s = effectVisualState({ effect: 'wiggle', p, bounds: BOUNDS });
      expect(Math.abs(s.rotation)).toBeLessThanOrEqual(WIGGLE_AMPLITUDE_DEG + 1e-9);
    }
    expect(effectVisualState({ effect: 'wiggle', p: 0, bounds: BOUNDS }).rotation).toBeCloseTo(0, 8);
    expect(effectVisualState({ effect: 'wiggle', p: 1, bounds: BOUNDS }).rotation).toBeCloseTo(0, 8);
  });

  it('flash toggles opacity and ends visible', () => {
    expect(effectVisualState({ effect: 'flash', p: 0, bounds: BOUNDS }).opacity).toBe(1);
    expect(effectVisualState({ effect: 'flash', p: 0.375, bounds: BOUNDS }).opacity).toBe(0);
    expect(effectVisualState({ effect: 'flash', p: 1, bounds: BOUNDS }).opacity).toBe(1);
  });

  it('spin rotates 360 degrees over its duration', () => {
    expect(effectVisualState({ effect: 'spin', p: 0.25, bounds: BOUNDS }).rotation).toBeCloseTo(90, 8);
    expect(effectVisualState({ effect: 'spin', p: 1, bounds: BOUNDS }).rotation).toBeCloseTo(360, 8);
  });

  it('bounce starts above the slide and lands at rest', () => {
    expect(effectVisualState({ effect: 'bounce', p: 0, bounds: BOUNDS }).translateY).toBeCloseTo(-50, 8);
    expect(effectVisualState({ effect: 'bounce', p: 1, bounds: BOUNDS }).translateY).toBeCloseTo(0, 8);
  });

  it('movePath follows an array of points', () => {
    const options = { customProperties: { path: [{ x: 0, y: 0 }, { x: 100, y: 0 }] } };
    expect(effectVisualState({ effect: 'movePath', p: 0, bounds: BOUNDS, options }).translateX).toBeCloseTo(0, 8);
    expect(effectVisualState({ effect: 'movePath', p: 0.5, bounds: BOUNDS, options }).translateX).toBeCloseTo(50, 8);
    expect(effectVisualState({ effect: 'movePath', p: 1, bounds: BOUNDS, options }).translateX).toBeCloseTo(100, 8);
  });

  it('movePath without a usable path is an identity', () => {
    expect(effectVisualState({ effect: 'movePath', p: 0.5, bounds: BOUNDS })).toEqual({
      opacity: 1, translateX: 0, translateY: 0, scaleX: 1, scaleY: 1, rotation: 0,
    });
  });

  it('morph is a fade-in without a source snapshot', () => {
    const s = effectVisualState({ effect: 'morph', p: 0.5, bounds: BOUNDS });
    expect(s.opacity).toBeCloseTo(0.5, 8);
    expect(s.translateX).toBe(0);
  });

  it('throws for unknown effects', () => {
    expect(() => effectVisualState({ effect: 'nope', p: 0.5, bounds: BOUNDS })).toThrow(InvalidArgumentError);
  });

  it('clamps opacity into [0, 1]', () => {
    expect(effectVisualState({ effect: 'fadeIn', p: 2, bounds: BOUNDS }).opacity).toBe(1);
  });
});

describe('motion path parsing', () => {
  it('parses absolute SVG M/L commands', () => {
    const points = parseMotionPath('M 0 0 L 100 0 L 100 50');
    expect(points).toHaveLength(3);
    expect(points[2]).toEqual({ x: 100, y: 50 });
  });

  it('parses relative m/l commands', () => {
    const points = parseMotionPath('m 10 10 l 20 0 l 0 30');
    expect(points).toHaveLength(3);
    expect(points[2]).toEqual({ x: 30, y: 40 });
  });

  it('rejects unusable paths', () => {
    expect(parseMotionPath('garbage')).toEqual([]);
    expect(parseMotionPath([{ x: 1 }])).toEqual([]);
    expect(parseMotionPath(undefined)).toEqual([]);
  });
});

describe('pointAtFraction', () => {
  it('samples endpoints and midpoints by arc length', () => {
    const points = [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 10, y: 10 }];
    expect(pointAtFraction(points, 0)).toEqual({ x: 0, y: 0 });
    expect(pointAtFraction(points, 1)).toEqual({ x: 10, y: 10 });
    const mid = pointAtFraction(points, 0.5); // half of the 20px length => (10, 0)
    expect(mid.x).toBeCloseTo(10, 8);
    expect(mid.y).toBeCloseTo(0, 8);
  });
});

describe('easeOutBounce', () => {
  it('has standard endpoints', () => {
    expect(easeOutBounce(0)).toBe(0);
    expect(easeOutBounce(1)).toBeCloseTo(1, 10);
  });
});
