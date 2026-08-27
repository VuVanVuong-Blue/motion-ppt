import type { AnimationPlan } from '@motion-ppt/animation';
import type { Presentation } from '@motion-ppt/core';
import { PresentationReader } from './reader/reader.js';
import { TimingInjector } from './timing/injector.js';
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

export interface WriteAnimatedPresentationResult {
  /** The animated .pptx archive as a Node Buffer. */
  buffer: Buffer;
  /** Warnings from both the writer and the timing injector. */
  warnings: string[];
}

/**
 * Convenience facade: serializes a {@link Presentation} and injects native
 * PowerPoint timing (Tier 2) for the given per-slide AnimationPlans.
 */
export async function writeAnimatedPresentation(
  presentation: Presentation,
  plans: readonly AnimationPlan[],
  options?: WritePresentationOptions,
): Promise<WriteAnimatedPresentationResult> {
  const writer = new PresentationWriter();
  const written = await writer.write(presentation, options);
  const injector = new TimingInjector();
  const injected = await injector.inject(written.buffer, presentation, plans);
  return { buffer: injected.buffer, warnings: [...written.warnings, ...injected.warnings] };
}
