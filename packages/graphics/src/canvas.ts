/**
 * Canvas backend adapter for @napi-rs/canvas.
 *
 * All rasterization goes through this module so renderers stay backend-agnostic
 * (only this file imports the native canvas package).
 */
import { createCanvas, GlobalFonts } from '@napi-rs/canvas';
import type { Canvas, SKRSContext2D } from '@napi-rs/canvas';
import { existsSync } from 'node:fs';
import { CanvasRenderError } from './errors.js';

export interface CanvasSurface {
  canvas: Canvas;
  ctx: SKRSContext2D;
  width: number;
  height: number;
}

/** Creates an offscreen surface sized in px. */
export function createSurface(width: number, height: number): CanvasSurface {
  if (!Number.isFinite(width) || !Number.isFinite(height) || width <= 0 || height <= 0) {
    throw new CanvasRenderError(`Invalid canvas size: ${width}x${height}`);
  }
  const canvas = createCanvas(Math.round(width), Math.round(height));
  const ctx = canvas.getContext('2d');
  return { canvas, ctx, width: canvas.width, height: canvas.height };
}

/** Encodes a canvas as a PNG buffer. */
export function encodePng(canvas: Canvas): Buffer {
  return canvas.toBuffer('image/png');
}

/**
 * Converts an `RRGGBB` hex color (optionally `#`-prefixed) to a CSS color
 * string accepted by the canvas context.
 */
export function hexToColor(hex: string): string {
  const clean = hex.trim().replace(/^#/, '');
  if (!/^[0-9a-fA-F]{6}$/.test(clean)) {
    throw new CanvasRenderError(`Invalid hex color: "${hex}"`);
  }
  const n = parseInt(clean, 16);
  return `rgb(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255})`;
}

/** Clamps a value into [0, 1]. */
export function clamp01(value: number): number {
  return value < 0 ? 0 : value > 1 ? 1 : value;
}

// ---------------------------------------------------------------------------
// Fonts
//
// @napi-rs/canvas resolves system fonts on each platform; on Windows we
// additionally register a few common families so text renders deterministically
// even when the platform font lookup misses.
// ---------------------------------------------------------------------------

const WINDOWS_FONTS: ReadonlyArray<readonly [string, string]> = [
  ['C:\\Windows\\Fonts\\segoeui.ttf', 'Segoe UI'],
  ['C:\\Windows\\Fonts\\arial.ttf', 'Arial'],
  ['C:\\Windows\\Fonts\\calibri.ttf', 'Calibri'],
  ['C:\\Windows\\Fonts\\times.ttf', 'Times New Roman'],
];

let fontsRegistered = false;

/** Idempotent registration of common fallback fonts (no-op off Windows). */
export function registerFallbackFonts(): void {
  if (fontsRegistered) return;
  fontsRegistered = true;
  for (const [path, family] of WINDOWS_FONTS) {
    try {
      if (existsSync(path)) GlobalFonts.registerFromPath(path, family);
    } catch {
      // Font lookup may already be satisfied by the system; never fail rendering.
    }
  }
}
