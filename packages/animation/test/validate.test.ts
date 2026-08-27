import { describe, expect, it } from 'vitest';
import { parseAnimationPlan } from '@motion-ppt/animation';
import { InvalidAnimationPlanError } from '@motion-ppt/animation';

function validPlan() {
  return {
    slideId: 'slide-1',
    version: '2.0',
    animations: [
      {
        id: 'title-in',
        target: 'title-box',
        effect: 'fadeIn',
        start: 0,
        duration: 0.5,
        easing: 'easeOutCubic',
      },
      {
        id: 'cards-stagger',
        targets: ['card-1', 'card-2', 'card-3'],
        effect: 'riseIn',
        start: 0.4,
        duration: 0.6,
        easing: 'easeOutBack',
        stagger: { delay: 0.15, mode: 'center_out' },
        options: { distance: 80, direction: 'bottom' },
      },
    ],
  };
}

describe('parseAnimationPlan', () => {
  it('parses a valid plan', () => {
    const plan = parseAnimationPlan(validPlan());
    expect(plan.slideId).toBe('slide-1');
    expect(plan.version).toBe('2.0');
    expect(plan.animations).toHaveLength(2);
    expect(plan.animations[1]?.stagger?.mode).toBe('center_out');
  });

  it('accepts an empty animation list and metadata', () => {
    const plan = parseAnimationPlan({ slideId: 's', version: '2.0', animations: [], metadata: { intent: 'demo', generatedBy: 'test' } });
    expect(plan.animations).toEqual([]);
    expect(plan.metadata?.intent).toBe('demo');
  });

  it('rejects a wrong DSL version', () => {
    const bad = validPlan();
    bad.version = '1.0';
    expect(() => parseAnimationPlan(bad)).toThrow(/version/);
  });

  it('rejects a missing slideId', () => {
    const bad = validPlan();
    delete (bad as Partial<typeof bad>).slideId;
    expect(() => parseAnimationPlan(bad)).toThrow(InvalidAnimationPlanError);
  });

  it('rejects items without target or targets', () => {
    const bad = validPlan();
    delete (bad.animations[0] as Record<string, unknown>).target;
    expect(() => parseAnimationPlan(bad)).toThrow(/target/);
  });

  it('rejects items with both target and targets', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).targets = ['a'];
    expect(() => parseAnimationPlan(bad)).toThrow(/Ambiguous/);
  });

  it('rejects negative start and non-positive duration', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).start = -0.1;
    expect(() => parseAnimationPlan(bad)).toThrow(/start/);
    (bad.animations[0] as Record<string, unknown>).start = 0;
    (bad.animations[0] as Record<string, unknown>).duration = 0;
    expect(() => parseAnimationPlan(bad)).toThrow(/duration/);
  });

  it('rejects unknown easings', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).easing = 'bouncey';
    expect(() => parseAnimationPlan(bad)).toThrow(InvalidAnimationPlanError);
  });

  it('rejects invalid customBezier', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).customBezier = [0.5, 0, 1.5, 1];
    expect(() => parseAnimationPlan(bad)).toThrow(/customBezier/);
    (bad.animations[0] as Record<string, unknown>).customBezier = [0.5, 0];
    expect(() => parseAnimationPlan(bad)).toThrow(/customBezier/);
  });

  it('rejects invalid spring parameters', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).spring = { stiffness: -5 };
    expect(() => parseAnimationPlan(bad)).toThrow(InvalidAnimationPlanError);
  });

  it('rejects invalid stagger modes and delays', () => {
    const bad = validPlan();
    (bad.animations[1] as Record<string, unknown>).stagger = { delay: -1 };
    expect(() => parseAnimationPlan(bad)).toThrow(/delay/);
    (bad.animations[1] as Record<string, unknown>).stagger = { mode: 'sideways' };
    expect(() => parseAnimationPlan(bad)).toThrow(/mode/);
  });

  it('rejects invalid morph options', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).morph = { mode: 'by_object' };
    expect(() => parseAnimationPlan(bad)).toThrow(/persistentId/);
  });

  it('rejects invalid strategyOverride', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).strategyOverride = 'gpu';
    expect(() => parseAnimationPlan(bad)).toThrow(InvalidAnimationPlanError);
  });

  it('rejects a non-array animations field', () => {
    const bad = validPlan();
    bad.animations = 'nope' as unknown as typeof bad.animations;
    expect(() => parseAnimationPlan(bad)).toThrow(InvalidAnimationPlanError);
  });

  it('includes the field path in error messages', () => {
    const bad = validPlan();
    (bad.animations[0] as Record<string, unknown>).start = -1;
    try {
      parseAnimationPlan(bad);
      expect.unreachable('should have thrown');
    } catch (err) {
      expect((err as InvalidAnimationPlanError).message).toContain('animations[0].start');
    }
  });
});