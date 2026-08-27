import { EffectNotSupportedError } from './errors.js';
import { STRATEGY_TYPE_LIST, type EffectCategory, type StrategyType } from './types.js';

export interface EffectCapabilities {
  /** Expressible as a single native OOXML <p:anim> node. */
  pptxNative: boolean;
  /** Expressible as synchronized multi-track native OOXML timings. */
  pptxComposite: boolean;
  /** Expressible by the Canvas renderer. */
  canvas: boolean;
  /** Expressible by the Three.js renderer (rendered asset). */
  three: boolean;
}

export interface EffectDefinition {
  id: string;
  category: EffectCategory;
  /** Fallback duration in seconds when the plan omits one. */
  defaultDuration: number;
  capabilities: EffectCapabilities;
  description?: string;
}

/** Editable-first strategy priority: native > composite > generated asset > rendered asset. */
export const STRATEGY_HIERARCHY: readonly StrategyType[] = STRATEGY_TYPE_LIST;

const CAPABILITY_BY_STRATEGY: Record<StrategyType, keyof EffectCapabilities> = {
  native: 'pptxNative',
  composite: 'pptxComposite',
  generatedAsset: 'canvas',
  renderedAsset: 'three',
};

/**
 * Registry of known effects with capability flags. The coding agent emits an
 * AnimationPlan in the DSL; the registry decides which renderer strategy each
 * effect supports.
 */
export class EffectRegistry {
  private readonly effects = new Map<string, EffectDefinition>();

  register(effect: EffectDefinition): this {
    this.effects.set(effect.id, effect);
    return this;
  }

  registerMany(effects: readonly EffectDefinition[]): this {
    for (const effect of effects) this.register(effect);
    return this;
  }

  has(id: string): boolean {
    return this.effects.has(id);
  }

  getEffect(id: string): EffectDefinition {
    const effect = this.effects.get(id);
    if (!effect) throw new EffectNotSupportedError(id);
    return effect;
  }

  list(): EffectDefinition[] {
    return [...this.effects.values()];
  }

  supportsStrategy(effect: EffectDefinition, strategy: StrategyType): boolean {
    return effect.capabilities[CAPABILITY_BY_STRATEGY[strategy]];
  }

  /**
   * Resolves the strategy for an effect: honors an explicit override when the
   * effect supports it, otherwise picks the highest-priority supported
   * capability (native > composite > generatedAsset > renderedAsset).
   */
  resolveStrategy(effect: EffectDefinition, override?: StrategyType): StrategyType {
    if (override !== undefined && this.supportsStrategy(effect, override)) return override;
    for (const strategy of STRATEGY_HIERARCHY) {
      if (this.supportsStrategy(effect, strategy)) return strategy;
    }
    return 'renderedAsset';
  }
}

const NATIVE_COMPOSITE_CANVAS: EffectCapabilities = { pptxNative: true, pptxComposite: true, canvas: true, three: false };
const COMPOSITE_CANVAS: EffectCapabilities = { pptxNative: false, pptxComposite: true, canvas: true, three: false };

/** Built-in effects curated for the editable-first strategy resolution. */
export const DEFAULT_EFFECTS: readonly EffectDefinition[] = [
  { id: 'fadeIn', category: 'entrance', defaultDuration: 0.5, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Fade opacity 0 -> 1' },
  { id: 'fadeOut', category: 'exit', defaultDuration: 0.35, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Fade opacity 1 -> 0' },
  { id: 'slideIn', category: 'entrance', defaultDuration: 0.6, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Slide in from an edge' },
  { id: 'slideOut', category: 'exit', defaultDuration: 0.45, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Slide out toward an edge' },
  { id: 'riseIn', category: 'entrance', defaultDuration: 0.5, capabilities: COMPOSITE_CANVAS, description: 'Translate up + fade (no single native PPTX primitive)' },
  { id: 'zoomIn', category: 'entrance', defaultDuration: 0.4, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Scale 0 -> 1' },
  { id: 'zoomOut', category: 'exit', defaultDuration: 0.35, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Scale 1 -> 0' },
  { id: 'pulse', category: 'emphasis', defaultDuration: 0.5, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Repeated scale emphasis' },
  { id: 'wiggle', category: 'emphasis', defaultDuration: 0.5, capabilities: COMPOSITE_CANVAS, description: 'Rotation oscillation' },
  { id: 'flash', category: 'emphasis', defaultDuration: 0.6, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Opacity blink' },
  { id: 'spin', category: 'emphasis', defaultDuration: 0.7, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Full rotation' },
  { id: 'bounce', category: 'motion_path', defaultDuration: 0.8, capabilities: COMPOSITE_CANVAS, description: 'Vertical bounce along a motion path' },
  { id: 'movePath', category: 'motion_path', defaultDuration: 1.0, capabilities: NATIVE_COMPOSITE_CANVAS, description: 'Custom motion path' },
  { id: 'staggerIn', category: 'composite', defaultDuration: 0.6, capabilities: COMPOSITE_CANVAS, description: 'Multi-target staggered entrance' },
  { id: 'morph', category: 'morph', defaultDuration: 0.45, capabilities: COMPOSITE_CANVAS, description: 'Shared-element morph between slides' },
];

/** Shared default registry used by timeline computations unless overridden. */
export const defaultRegistry = new EffectRegistry().registerMany(DEFAULT_EFFECTS);