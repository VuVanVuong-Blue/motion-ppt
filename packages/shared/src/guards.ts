/** Returns `true` when `value` is a non-null object (arrays included). */
export function isObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null;
}

/** Returns `true` when `value` is a plain record with string keys (arrays excluded). */
export function isRecord(value: unknown): value is Record<string, unknown> {
  return isObject(value) && !Array.isArray(value);
}

/** Returns `true` when `value` is a string. */
export function isString(value: unknown): value is string {
  return typeof value === 'string';
}

/** Returns `true` when `value` is a finite number. */
export function isFiniteNumber(value: unknown): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

/** Returns `true` when `value` is a boolean. */
export function isBoolean(value: unknown): value is boolean {
  return typeof value === 'boolean';
}

/** Returns `true` when `value` is a non-empty string. */
export function isNonEmptyString(value: unknown): value is string {
  return isString(value) && value.length > 0;
}

/** Returns `true` when `value` is an array. */
export function isArray(value: unknown): value is unknown[] {
  return Array.isArray(value);
}

/** Reads an optional string property; `undefined` when absent or not a string. */
export function optionalString(record: Record<string, unknown>, key: string): string | undefined {
  const value = record[key];
  return isString(value) ? value : undefined;
}

/** Reads an optional finite-number property; `undefined` when absent or not a finite number. */
export function optionalNumber(record: Record<string, unknown>, key: string): number | undefined {
  const value = record[key];
  return isFiniteNumber(value) ? value : undefined;
}

/** Reads an optional boolean property; `undefined` when absent or not a boolean. */
export function optionalBoolean(record: Record<string, unknown>, key: string): boolean | undefined {
  const value = record[key];
  return isBoolean(value) ? value : undefined;
}
