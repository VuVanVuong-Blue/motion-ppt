import { getElement, type Slide } from '@motion-ppt/core';
import { resolveEasing, type EasingFunction } from './easing.js';
import { defaultRegistry, EffectRegistry } from './registry.js';
import { parseAnimationPlan } from './validate.js';
import type {
  AnimationItem,
  AnimationOptions,
  AnimationPlan,
  EasingType,
  EffectCategory,
  MorphOptions,
  SpringConfig,
  StrategyType,
} from './types.js';

export const DEFAULT_STAGGER_DELAY = 0.06;
export const DEFAULT_EASING: EasingType = 'easeOutCubic';

/** One resolved animation entry with absolute timing for a single target. */
export interface ResolvedAnimation {
  itemId: string;
  effect: string;
  target: string;
  /** Absolute start time in seconds. */
  start: number;
  /** Absolute end time in seconds. */
  end: number;
  /** Duration in seconds. */
  duration: number;
  easing: EasingType;
  /** Concrete easing function for renderers. */
  easingFunction: EasingFunction;
  category: EffectCategory;
  strategy: StrategyType;
  spring?: SpringConfig;
  morph?: MorphOptions;
  options?: AnimationOptions;
}

export interface Timeline {
  slideId: string;
  animations: ResolvedAnimation[];
  /** End time of the last animation in seconds. */
  duration: number;
}

export interface ComputeTimelineOptions {
  /** Defaults to the shared {@link defaultRegistry}. */
  registry?: EffectRegistry;
  /** When provided, every animation target must exist on the slide. */
  slide?: Slide;
}

/** Expands an item into its target id list. */
export function expandTargets(item: AnimationItem): string[] {
  if (item.targets) return [...item.targets];
  return item.target ? [item.target] : [];
}

/** All unique target ids referenced by a plan, in first-use order. */
export function getPlanTargets(plan: AnimationPlan): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const item of plan.animations) {
    for (const target of expandTargets(item)) {
      if (!seen.has(target)) {
        seen.add(target);
        out.push(target);
      }
    }
  }
  return out;
}

/**
 * Absolute start offsets for `count` staggered items. `forward` plays
 * item-by-item, `reverse` starts from the last item, `center_out` starts from
 * the middle and alternates outward.
 */
export function computeStaggerOffsets(
  count: number,
  stagger?: { delay?: number; mode?: 'forward' | 'reverse' | 'center_out' },
): number[] {
  if (count <= 1) return [0];
  const delay = stagger?.delay ?? DEFAULT_STAGGER_DELAY;
  const order = staggerOrder(count, stagger?.mode ?? 'forward');
  const offsets = new Array<number>(count);
  for (let i = 0; i < count; i++) offsets[i] = order.indexOf(i) * delay;
  return offsets;
}

function staggerOrder(count: number, mode: 'forward' | 'reverse' | 'center_out'): number[] {
  if (mode === 'reverse') {
    const order: number[] = [];
    for (let i = count - 1; i >= 0; i--) order.push(i);
    return order;
  }
  if (mode === 'center_out') return centerOutOrder(count);
  const order: number[] = [];
  for (let i = 0; i < count; i++) order.push(i);
  return order;
}

function centerOutOrder(count: number): number[] {
  const order: number[] = [];
  const center = Math.floor((count - 1) / 2);
  order.push(center);
  for (let step = 1; step < count; step++) {
    const left = center - step;
    const right = center + step;
    if (left >= 0) order.push(left);
    if (right < count) order.push(right);
  }
  return order;
}

/**
 * Compiles an {@link AnimationPlan} into an absolute {@link Timeline} with
 * per-target entries, stagger offsets, resolved easing and strategy.
 *
 * The plan is re-validated structurally; unknown effects throw
 * {@link EffectNotSupportedError} and, when a slide is provided, missing
 * targets throw {@link ElementNotFoundError} (from @motion-ppt/core).
 */
export function computeTimeline(plan: AnimationPlan, options: ComputeTimelineOptions = {}): Timeline {
  const validated = parseAnimationPlan(plan);
  const registry = options.registry ?? defaultRegistry;
  const animations: ResolvedAnimation[] = [];
  let maxEnd = 0;

  for (const item of validated.animations) {
    const definition = registry.getEffect(item.effect);
    const targets = expandTargets(item);
    if (options.slide) {
      for (const target of targets) getElement(options.slide, target);
    }
    const offsets = computeStaggerOffsets(targets.length, item.stagger);
    const easing = item.easing ?? DEFAULT_EASING;
    const easingFunction = resolveEasing(easing, item.spring);
    const strategy = registry.resolveStrategy(definition, item.strategyOverride);

    for (let i = 0; i < targets.length; i++) {
      const start = item.start + offsets[i]!;
      const end = start + item.duration;
      maxEnd = Math.max(maxEnd, end);
      animations.push({
        itemId: item.id,
        effect: item.effect,
        target: targets[i]!,
        start,
        end,
        duration: item.duration,
        easing,
        easingFunction,
        category: definition.category,
        strategy,
        ...(item.spring ? { spring: item.spring } : {}),
        ...(item.morph ? { morph: item.morph } : {}),
        ...(item.options ? { options: item.options } : {}),
      });
    }
  }

  return { slideId: validated.slideId, animations, duration: maxEnd };
}