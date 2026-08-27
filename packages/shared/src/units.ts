/** Pixels per inch assumed by the Motion PPT coordinate model (CSS / 96 dpi convention). */
export const PX_PER_INCH = 96;

/** English Metric Units (OOXML drawing coordinate space) per inch. */
export const EMU_PER_INCH = 914400;

/** EMU per pixel at 96 dpi. */
export const EMU_PER_PX = EMU_PER_INCH / PX_PER_INCH;

/** Typography points per inch. */
export const PT_PER_INCH = 72;

/** Converts pixels to inches (96 dpi). */
export function pxToInch(px: number): number {
  return px / PX_PER_INCH;
}

/** Converts inches to pixels (96 dpi). */
export function inchToPx(inch: number): number {
  return inch * PX_PER_INCH;
}

/** Converts pixels to EMU, rounded to the nearest integer EMU. */
export function pxToEmu(px: number): number {
  return Math.round(px * EMU_PER_PX);
}

/** Converts EMU to pixels. */
export function emuToPx(emu: number): number {
  return emu / EMU_PER_PX;
}

/** Converts pixels to typography points (72 per inch). */
export function pxToPt(px: number): number {
  return (px / PX_PER_INCH) * PT_PER_INCH;
}

/** Converts typography points to pixels. */
export function ptToPx(pt: number): number {
  return (pt / PT_PER_INCH) * PX_PER_INCH;
}
