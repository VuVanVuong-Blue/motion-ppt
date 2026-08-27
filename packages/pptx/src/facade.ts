import type { Presentation } from '@motion-ppt/core';
import { PresentationReader } from './reader/reader.js';
import { PresentationWriter, type WritePresentationOptions } from './writer/writer.js';

/**
 * Convenience facade: serializes a {@link Presentation} into a .pptx Buffer.
 * Warnings are dropped; use {@link PresentationWriter} to collect them.
 */
export async function writePresentation(
  presentation: Presentation,
  options?: WritePresentationOptions,
): Promise<Buffer> {
  const writer = new PresentationWriter();
  return (await writer.write(presentation, options)).buffer;
}

/**
 * Convenience facade: parses a .pptx Buffer into a {@link Presentation}.
 * Warnings are dropped; use {@link PresentationReader} to collect them.
 */
export async function readPresentation(input: Uint8Array): Promise<Presentation> {
  const reader = new PresentationReader();
  return (await reader.read(input)).presentation;
}
