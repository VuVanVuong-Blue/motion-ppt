/**
 * Animation DSL types. This module is the single source of truth between
 * agent intent and renderers; it is JSON-serializable and renderer-agnostic.
 * See docs/ANIMATION-DSL-SPEC.md for the formal specification.
 */

export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'ease-m3-emphasized'
  | 'ease-m3-decelerate'
  | 'ease-apple-fluid'
  | 'ease-cinematic'
  | 'spring';

export type SpringPreset = 'snappy' | 'default' | 'gentle' | 'bouncy' | 'cinematicHeavy';

export interface SpringConfig {
  preset?: SpringPreset;
  /** Inertia (mass), default 1.0. */
  mass?: number;
  /** Tension (stiffness k), e.g. 260. */
  stiffness?: number;
  /** Friction (damping c), e.g. 20. */
  damping?: number;
  /** Tolerance for settle, default 0.001. */
  restDelta?: number;
}

export type EffectCategory = 'entrance' | 'exit' | 'emphasis' | 'motion_path' | 'composite' | 'morph';

export type StrategyType = 'native' | 'composite' | 'generatedAsset' | 'renderedAsset';

export interface StaggerConfig {
  /** Delay between items in seconds (default: 0.06). */
  delay?: number;
  mode?: 'forward' | 'reverse' | 'center_out';
}

export interface MorphOptions {
  mode: 'by_object' | 'by_word' | 'by_character';
  /** data-morph-id matching elements across slides. */
  persistentId: string;
  /** Default: 0.2s (fast exit). */
  unmatchedFadeDuration?: number;
}

export interface AnimationOptions {
  direction?: 'left' | 'right' | 'top' | 'bottom';
  /** Travel distance in px. */
  distance?: number;
  fromScale?: number;
  toScale?: number;
  /** Z-depth in px (e.g. -400, 0, +200). */
  parallaxDepth?: number;
  customProperties?: Record<string, unknown>;
}

export interface AnimationItem {
  id: string;
  /** Single target element id. Use either `target` or `targets`, not both. */
  target?: string;
  /** Multiple targets for staggered animations. */
  targets?: string[];
  /** Effect id, e.g. 'fadeIn', 'slideIn', 'riseIn', 'morph'. */
  effect: string;
  /** Start time offset in seconds. */
  start: number;
  /** Duration in seconds (e.g. 0.42). */
  duration: number;
  /** Defaults to 'easeOutCubic'. */
  easing?: EasingType;
  /** Explicit cubic-bezier control points (x1, y1, x2, y2). */
  customBezier?: [number, number, number, number];
  /** Spring physics override (used when easing is 'spring'). */
  spring?: SpringConfig;
  stagger?: StaggerConfig;
  morph?: MorphOptions;
  options?: AnimationOptions;
  strategyOverride?: StrategyType;
}

export interface AnimationPlan {
  slideId: string;
  version: '2.0';
  animations: AnimationItem[];
  metadata?: {
    intent?: string;
    generatedBy?: string;
    notes?: string;
  };
}

export const EFFECT_CATEGORY_LIST: readonly EffectCategory[] = [
  'entrance',
  'exit',
  'emphasis',
  'motion_path',
  'composite',
  'morph',
];

export const STRATEGY_TYPE_LIST: readonly StrategyType[] = [
  'native',
  'composite',
  'generatedAsset',
  'renderedAsset',
];

export const DIRECTION_LIST: readonly NonNullable<AnimationOptions['direction']>[] = ['left', 'right', 'top', 'bottom'];

export const STAGGER_MODE_LIST: readonly NonNullable<StaggerConfig['mode']>[] = [
  'forward',
  'reverse',
  'center_out',
];

export const MORPH_MODE_LIST: readonly MorphOptions['mode'][] = ['by_object', 'by_word', 'by_character'];