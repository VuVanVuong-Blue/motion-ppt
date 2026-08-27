import { randomUUID } from 'node:crypto';

/**
 * Generates a collision-resistant id with an optional human-readable prefix,
 * e.g. `createId('slide')` -> `slide-<uuid>`.
 */
export function createId(prefix = 'id'): string {
  return `${prefix}-${randomUUID()}`;
}
