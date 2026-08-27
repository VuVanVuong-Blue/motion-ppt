import { isFiniteNumber, isNonEmptyString, isRecord, isString } from '@motion-ppt/shared';
import { EASING_TYPES } from './easing.js';
import { InvalidAnimationPlanError } from './errors.js';
import { SPRING_PRESETS } from './spring.js';
import {
  DIRECTION_LIST,
  MORPH_MODE_LIST,
  STAGGER_MODE_LIST,
  STRATEGY_TYPE_LIST,
  type AnimationItem,
  type AnimationOptions,
  type AnimationPlan,
  type MorphOptions,
  type SpringConfig,
  type SpringPreset,
  type StaggerConfig,
} from './types.js';

function fail(message: string, path: string): never {
  throw new InvalidAnimationPlanError(message, { path });
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'array';
  return typeof value;
}

function expectRecord(value: unknown, path: string): Record<string, unknown> {
  if (!isRecord(value)) fail(`Expected an object, got ${describe(value)}`, path);
  return value;
}

function expectString(value: unknown, path: string): string {
  if (!isString(value)) fail(`Expected a string, got ${describe(value)}`, path);
  return value;
}

function expectNonEmptyString(value: unknown, path: string): string {
  if (!isNonEmptyString(value)) fail(`Expected a non-empty string, got ${describe(value)}`, path);
  return value;
}

function expectFiniteNumber(value: unknown, path: string): number {
  if (!isFiniteNumber(value)) fail(`Expected a finite number, got ${describe(value)}`, path);
  return value;
}

function expectOptionalEnum<T extends string>(
  value: unknown,
  path: string,
  allowed: readonly T[],
): T | undefined {
  if (value === undefined) return undefined;
  const s = expectString(value, path);
  if (!(allowed as readonly string[]).includes(s)) fail(`Expected one of ${allowed.join(', ')}, got "${s}"`, path);
  return s as T;
}

function expectOptionalString(value: unknown, path: string): string | undefined {
  if (value === undefined) return undefined;
  return expectString(value, path);
}

export function parseSpringConfig(value: unknown, path = 'spring'): SpringConfig {
  const record = expectRecord(value, path);
  const config: SpringConfig = {};
  const preset = expectOptionalEnum(record.preset, `${path}.preset`, Object.keys(SPRING_PRESETS) as SpringPreset[]);
  if (preset) config.preset = preset;
  for (const key of ['mass', 'stiffness', 'damping', 'restDelta'] as const) {
    if (record[key] === undefined) continue;
    const n = expectFiniteNumber(record[key], `${path}.${key}`);
    if (!(n > 0)) fail(`Expected ${key} > 0, got ${n}`, `${path}.${key}`);
    config[key] = n;
  }
  return config;
}

export function parseStaggerConfig(value: unknown, path = 'stagger'): StaggerConfig {
  const record = expectRecord(value, path);
  const config: StaggerConfig = {};
  if (record.delay !== undefined) {
    const delay = expectFiniteNumber(record.delay, `${path}.delay`);
    if (delay < 0) fail(`Expected delay >= 0, got ${delay}`, `${path}.delay`);
    config.delay = delay;
  }
  const mode = expectOptionalEnum(record.mode, `${path}.mode`, STAGGER_MODE_LIST);
  if (mode) config.mode = mode;
  return config;
}

export function parseMorphOptions(value: unknown, path = 'morph'): MorphOptions {
  const record = expectRecord(value, path);
  const morph: MorphOptions = {
    mode: expectOptionalEnum(record.mode, `${path}.mode`, MORPH_MODE_LIST) ?? fail('Expected morph.mode', `${path}.mode`),
    persistentId: expectNonEmptyString(record.persistentId, `${path}.persistentId`),
  };
  if (record.unmatchedFadeDuration !== undefined) {
    const d = expectFiniteNumber(record.unmatchedFadeDuration, `${path}.unmatchedFadeDuration`);
    if (d < 0) fail(`Expected unmatchedFadeDuration >= 0, got ${d}`, `${path}.unmatchedFadeDuration`);
    morph.unmatchedFadeDuration = d;
  }
  return morph;
}

export function parseAnimationOptions(value: unknown, path = 'options'): AnimationOptions {
  const record = expectRecord(value, path);
  const options: AnimationOptions = {};
  const direction = expectOptionalEnum(record.direction, `${path}.direction`, DIRECTION_LIST);
  if (direction) options.direction = direction;
  for (const key of ['distance', 'fromScale', 'toScale', 'parallaxDepth'] as const) {
    if (record[key] !== undefined) options[key] = expectFiniteNumber(record[key], `${path}.${key}`);
  }
  if (record.customProperties !== undefined) {
    const cp = expectRecord(record.customProperties, `${path}.customProperties`);
    options.customProperties = { ...cp };
  }
  return options;
}

export function parseAnimationItem(value: unknown, path = 'animation'): AnimationItem {
  const record = expectRecord(value, path);

  const target = record.target === undefined ? undefined : expectNonEmptyString(record.target, `${path}.target`);
  const targetsRaw = record.targets;
  let targets: string[] | undefined;
  if (targetsRaw !== undefined) {
    if (!Array.isArray(targetsRaw)) fail('Expected an array of target ids', `${path}.targets`);
    targets = targetsRaw.map((t, i) => expectNonEmptyString(t, `${path}.targets[${i}]`));
  }
  if (!target && !targets) fail('Missing target: provide either "target" or "targets"', path);
  if (target && targets) fail('Ambiguous: provide either "target" or "targets", not both', path);

  const item: AnimationItem = {
    id: expectNonEmptyString(record.id, `${path}.id`),
    effect: expectNonEmptyString(record.effect, `${path}.effect`),
    start: expectFiniteNumber(record.start, `${path}.start`),
    duration: expectFiniteNumber(record.duration, `${path}.duration`),
  };
  if (item.start < 0) fail(`Expected start >= 0, got ${item.start}`, `${path}.start`);
  if (!(item.duration > 0)) fail(`Expected duration > 0, got ${item.duration}`, `${path}.duration`);

  if (target) item.target = target;
  if (targets) item.targets = targets;

  const easing = expectOptionalEnum(record.easing, `${path}.easing`, EASING_TYPES);
  if (easing) item.easing = easing;

  const bezier = record.customBezier;
  if (bezier !== undefined) {
    if (!Array.isArray(bezier) || bezier.length !== 4) {
      fail('Expected an array of 4 numbers (x1, y1, x2, y2)', `${path}.customBezier`);
    }
    const points = bezier.map((v, i) => expectFiniteNumber(v, `${path}.customBezier[${i}]`));
    if (points[0]! < 0 || points[0]! > 1 || points[2]! < 0 || points[2]! > 1) {
      fail('cubic-bezier x control points must be in [0, 1]', `${path}.customBezier`);
    }
    item.customBezier = [points[0]!, points[1]!, points[2]!, points[3]!];
  }

  if (record.spring !== undefined) item.spring = parseSpringConfig(record.spring, `${path}.spring`);
  if (record.stagger !== undefined) item.stagger = parseStaggerConfig(record.stagger, `${path}.stagger`);
  if (record.morph !== undefined) item.morph = parseMorphOptions(record.morph, `${path}.morph`);
  if (record.options !== undefined) item.options = parseAnimationOptions(record.options, `${path}.options`);

  const strategy = expectOptionalEnum(record.strategyOverride, `${path}.strategyOverride`, STRATEGY_TYPE_LIST);
  if (strategy) item.strategyOverride = strategy;

  return item;
}

/**
 * Validates an unknown payload and returns a typed {@link AnimationPlan}.
 * Throws {@link InvalidAnimationPlanError} with a field path on any violation.
 */
export function parseAnimationPlan(value: unknown, path = 'animationPlan'): AnimationPlan {
  const record = expectRecord(value, path);
  const version = expectString(record.version, `${path}.version`);
  if (version !== '2.0') fail(`Unsupported DSL version "${version}"; expected "2.0"`, `${path}.version`);
  const animationsValue = record.animations;
  if (!Array.isArray(animationsValue)) fail('Expected an array of animations', `${path}.animations`);
  const plan: AnimationPlan = {
    slideId: expectNonEmptyString(record.slideId, `${path}.slideId`),
    version: '2.0',
    animations: animationsValue.map((item, i) => parseAnimationItem(item, `${path}.animations[${i}]`)),
  };
  if (record.metadata !== undefined) {
    const meta = expectRecord(record.metadata, `${path}.metadata`);
    const metadata: NonNullable<AnimationPlan['metadata']> = {};
    const intent = expectOptionalString(meta.intent, `${path}.metadata.intent`);
    if (intent !== undefined) metadata.intent = intent;
    const generatedBy = expectOptionalString(meta.generatedBy, `${path}.metadata.generatedBy`);
    if (generatedBy !== undefined) metadata.generatedBy = generatedBy;
    const notes = expectOptionalString(meta.notes, `${path}.metadata.notes`);
    if (notes !== undefined) metadata.notes = notes;
    plan.metadata = metadata;
  }
  return plan;
}