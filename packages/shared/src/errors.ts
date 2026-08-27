/**
 * Options accepted by {@link MotionPptError}.
 */
export interface MotionPptErrorOptions {
  /** Machine-readable error code, e.g. `ELEMENT_NOT_FOUND`. */
  code?: string;
  /** Underlying error that caused this one, if any. */
  cause?: unknown;
}

/**
 * Base class for every domain error thrown by Motion PPT packages.
 *
 * All concrete errors extend this class so that callers can reliably catch
 * and introspect errors across package boundaries.
 */
export class MotionPptError extends Error {
  readonly code: string;
  readonly cause?: unknown;

  constructor(message: string, options: MotionPptErrorOptions = {}) {
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    this.name = new.target.name;
    this.code = options.code ?? 'MOTION_PPT_ERROR';
    this.cause = options.cause;
  }
}

/** Type guard: returns `true` when `value` is a {@link MotionPptError}. */
export function isMotionPptError(value: unknown): value is MotionPptError {
  return value instanceof MotionPptError;
}

/** Thrown when an API is called with invalid arguments (not a domain validation failure). */
export class InvalidArgumentError extends MotionPptError {
  constructor(message: string, options: MotionPptErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'INVALID_ARGUMENT' });
  }
}

/** Thrown when a requested feature is not (yet) implemented by a component. */
export class UnsupportedFeatureError extends MotionPptError {
  constructor(feature: string, options: MotionPptErrorOptions = {}) {
    super(`Unsupported feature: ${feature}`, { ...options, code: options.code ?? 'UNSUPPORTED_FEATURE' });
  }
}

/** Thrown when external data (files, payloads, archives) has an unexpected format. */
export class DataFormatError extends MotionPptError {
  constructor(message: string, options: MotionPptErrorOptions = {}) {
    super(message, { ...options, code: options.code ?? 'DATA_FORMAT' });
  }
}
