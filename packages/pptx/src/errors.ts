import { DataFormatError } from '@motion-ppt/shared';

/** Thrown when a .pptx archive or its OOXML content cannot be parsed. */
export class PptxFormatError extends DataFormatError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { ...options, code: 'PPTX_FORMAT' });
  }
}
