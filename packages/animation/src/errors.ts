import { MotionPptError } from '@motion-ppt/shared';

/** Thrown when an AnimationPlan payload fails structural validation. */
export class InvalidAnimationPlanError extends MotionPptError {
  constructor(message: string, options: { path?: string; cause?: unknown } = {}) {
    const prefix = options.path ? `[${options.path}] ` : '';
    super(`${prefix}${message}`, { ...options, code: 'INVALID_ANIMATION_PLAN' });
  }
}

/** Thrown when an effect id is not registered in the effect registry. */
export class EffectNotSupportedError extends MotionPptError {
  constructor(effectId: string, options: { cause?: unknown } = {}) {
    super(`Effect is not registered: ${effectId}`, { ...options, code: 'EFFECT_NOT_SUPPORTED' });
  }
}

/** Thrown when an easing identifier is unknown. */
export class UnknownEasingError extends MotionPptError {
  constructor(easing: string, options: { cause?: unknown } = {}) {
    super(`Unknown easing: ${easing}`, { ...options, code: 'UNKNOWN_EASING' });
  }
}