export { PresentationWriter, type WritePresentationOptions, type WritePresentationResult } from './writer/writer.js';
export { PresentationReader, type ReadPresentationResult } from './reader/reader.js';
export { PptxFormatError } from './errors.js';
export { readPresentation, writeAnimatedPresentation, writePresentation } from './facade.js';

// Tier 2: OOXML timing injection (ADR 0002)
export {
  TimingInjector,
  type TimingInjectionResult,
} from './timing/injector.js';
export {
  buildBehavior,
  buildTimingXml,
  hasNativeMapping,
  type TimingDirection,
  type TimingNode,
} from './timing/timing-xml.js';
export { flattenSlideElements } from './writer/elements.js';