import { describe, expect, it } from 'vitest';
import {
  EMU_PER_INCH,
  EMU_PER_PX,
  PX_PER_INCH,
  emuToPx,
  inchToPx,
  ptToPx,
  pxToEmu,
  pxToInch,
  pxToPt,
} from '@motion-ppt/shared';

describe('unit conversions', () => {
  it('exposes canonical constants', () => {
    expect(PX_PER_INCH).toBe(96);
    expect(EMU_PER_INCH).toBe(914400);
    expect(EMU_PER_PX).toBe(9525);
  });

  it('converts px <-> inch', () => {
    expect(pxToInch(96)).toBe(1);
    expect(inchToPx(1)).toBe(96);
    expect(inchToPx(13.333333333333334)).toBeCloseTo(1280, 5);
  });

  it('converts px <-> EMU', () => {
    expect(pxToEmu(1)).toBe(9525);
    expect(emuToPx(9525)).toBe(1);
    expect(pxToEmu(100)).toBe(952500);
    expect(pxToEmu(0.5)).toBe(4763); // rounds to nearest EMU
  });

  it('converts px <-> points', () => {
    expect(pxToPt(96)).toBe(72);
    expect(ptToPx(72)).toBe(96);
    expect(pxToPt(128)).toBe(96);
  });
});
