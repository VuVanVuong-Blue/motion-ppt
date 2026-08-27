/**
 * Timeline playback: turns a resolved {@link Timeline} (from
 * @motion-ppt/animation `computeTimeline`) into per-target
 * {@link ElementVisualState}s for a given time `t`.
 *
 * Rules:
 * - While an animation is active (`start <= t <= end`), its eased progress
 *   drives the effect's visual state.
 * - After the animation ends, the effect's settled state applies (e.g. an
 *   entrance stays fully visible; an exit stays hidden).
 * - When several animations overlap on one target, the one with the latest
 *   end time wins and a warning is emitted.
 * - Cross-slide `morph` interpolates from a caller-provided source snapshot
 *   (`morphFrom` deltas); without one it degrades to a fade-in with a warning.
 */
import type { ResolvedAnimation, Timeline } from '@motion-ppt/animation';
import type { Transform } from '@motion-ppt/core';
import { clamp01 } from './canvas.js';
import { effectVisualState } from './effects.js';
import { IDENTITY_VISUAL_STATE, type ElementVisualState } from './types.js';

/** Element bounding boxes used for default travel distances, keyed by target id. */
export interface BoundsMap {
  [targetId: string]: { width: number; height: number };
}

/**
 * Source-to-target morph deltas. Values are relative to the target's base
 * transform so the renderer only needs to apply the interpolated state.
 */
export interface MorphDelta {
  dx: number;
  dy: number;
  scaleX: number;
  scaleY: number;
  rotation: number;
  opacity: number;
}

/** Computes morph deltas from a source (previous slide) to a target transform. */
export function computeMorphDelta(from: Transform, to: Transform): MorphDelta {
  return {
    dx: (from.x ?? 0) - (to.x ?? 0),
    dy: (from.y ?? 0) - (to.y ?? 0),
    scaleX: (from.scaleX ?? 1) / (to.scaleX ?? 1),
    scaleY: (from.scaleY ?? 1) / (to.scaleY ?? 1),
    rotation: (from.rotation ?? 0) - (to.rotation ?? 0),
    opacity: (from.opacity ?? 1) / (to.opacity ?? 1),
  };
}

export interface PlaybackOptions {
  /** Per-target element bounding boxes in px (defaults to 100x100). */
  bounds?: BoundsMap;
  /** Per-target morph source deltas (see {@link computeMorphDelta}). */
  morphFrom?: ReadonlyMap<string, MorphDelta>;
}

export interface TargetFrameState {
  /** Visual state to apply to the target element. */
  state: ElementVisualState;
  /** The animation driving this frame, when one is active. */
  active?: ResolvedAnimation;
  /** Warnings specific to this target (overlaps, missing morph sources). */
  warnings: string[];
}

export interface FrameStates {
  /** Per-target states keyed by element id. */
  targets: ReadonlyMap<string, TargetFrameState>;
  /** Global playback warnings. */
  warnings: string[];
}

const DEFAULT_BOUNDS = { width: 100, height: 100 };

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/** Groups a timeline's animations by target, ordered by start time. */
export function buildTargetIndex(timeline: Timeline): ReadonlyMap<string, ResolvedAnimation[]> {
  const index = new Map<string, ResolvedAnimation[]>();
  for (const anim of timeline.animations) {
    const list = index.get(anim.target);
    if (list) list.push(anim);
    else index.set(anim.target, [anim]);
  }
  for (const list of index.values()) list.sort((a, b) => a.start - b.start || a.end - b.end);
  return index;
}

/** Computes the per-target visual states at time `t` (seconds). */
export function frameStatesAt(timeline: Timeline, t: number, options: PlaybackOptions = {}): FrameStates {
  const index = buildTargetIndex(timeline);
  const warnings: string[] = [];
  const targets = new Map<string, TargetFrameState>();
  for (const [target, animations] of index) {
    targets.set(target, targetStateAt(target, animations, t, options, warnings));
  }
  return { targets, warnings };
}

function targetStateAt(
  target: string,
  animations: readonly ResolvedAnimation[],
  t: number,
  options: PlaybackOptions,
  globalWarnings: string[],
): TargetFrameState {
  const bounds = options.bounds?.[target] ?? DEFAULT_BOUNDS;

  const activeList = animations.filter((a) => t >= a.start && t <= a.end);
  const active = activeList.length > 0 ? [...activeList].sort((a, b) => a.end - b.end).pop()! : undefined;
  if (activeList.length > 1 && active) {
    const ids = activeList.map((a) => a.itemId).join(', ');
    globalWarnings.push(
      `t=${t.toFixed(3)}s: overlapping animations [${ids}] on "${target}"; using "${active.itemId}".`,
    );
  }

  if (active) {
    return {
      state: evaluate(active, progressOf(active, t), bounds, options, target, globalWarnings),
      active,
      warnings: [],
    };
  }

  // No active animation: apply the settled state of the most recent completed one.
  const completed = [...animations].reverse().find((a) => a.end <= t);
  if (completed) {
    return {
      state: evaluate(completed, 1, bounds, options, target, globalWarnings),
      warnings: [],
    };
  }

  return { state: { ...IDENTITY_VISUAL_STATE }, warnings: [] };
}

function progressOf(animation: ResolvedAnimation, t: number): number {
  if (animation.duration <= 0) return t >= animation.start ? 1 : 0;
  return clamp01((t - animation.start) / animation.duration);
}

function evaluate(
  animation: ResolvedAnimation,
  p: number,
  bounds: { width: number; height: number },
  options: PlaybackOptions,
  target: string,
  warnings: string[],
): ElementVisualState {
  const eased = animation.easingFunction(p);
  if (animation.effect === 'morph') return morphState(eased, options, target, warnings);
  return effectVisualState({ effect: animation.effect, p: eased, bounds, options: animation.options });
}

function morphState(
  p: number,
  options: PlaybackOptions,
  target: string,
  warnings: string[],
): ElementVisualState {
  const delta = options.morphFrom?.get(target);
  if (!delta) {
    warnings.push(`Morph on "${target}" has no morphFrom source snapshot; rendered as a fade-in.`);
    return { ...IDENTITY_VISUAL_STATE, opacity: p };
  }
  return {
    opacity: clamp01(lerp(delta.opacity, 1, p)),
    translateX: lerp(delta.dx, 0, p),
    translateY: lerp(delta.dy, 0, p),
    scaleX: lerp(delta.scaleX, 1, p),
    scaleY: lerp(delta.scaleY, 1, p),
    rotation: lerp(delta.rotation, 0, p),
  };
}
