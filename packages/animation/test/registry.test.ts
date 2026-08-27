import { describe, expect, it } from 'vitest';
import { EffectRegistry, STRATEGY_HIERARCHY, defaultRegistry } from '@motion-ppt/animation';
import { EffectNotSupportedError } from '@motion-ppt/animation';

const CUSTOM: Parameters<EffectRegistry['register']>[0] = {
  id: 'custom',
  category: 'entrance',
  defaultDuration: 0.3,
  capabilities: { pptxNative: false, pptxComposite: true, canvas: true, three: false },
};

describe('EffectRegistry', () => {
  it('registers and looks up effects', () => {
    const registry = new EffectRegistry().register(CUSTOM);
    expect(registry.has('custom')).toBe(true);
    expect(registry.getEffect('custom').category).toBe('entrance');
    expect(registry.list().map((e) => e.id)).toEqual(['custom']);
    expect(() => registry.getEffect('nope')).toThrow(EffectNotSupportedError);
  });

  it('registerMany registers a batch', () => {
    const registry = new EffectRegistry().registerMany([CUSTOM, { ...CUSTOM, id: 'other' }]);
    expect(registry.has('custom')).toBe(true);
    expect(registry.has('other')).toBe(true);
  });

  it('resolves strategies by editable-first hierarchy', () => {
    const registry = new EffectRegistry().register(CUSTOM);
    const effect = registry.getEffect('custom');
    expect(registry.resolveStrategy(effect)).toBe('composite');
    expect(registry.resolveStrategy(effect, 'generatedAsset')).toBe('generatedAsset');
    // unsupported override falls back to the best supported strategy
    expect(registry.resolveStrategy(effect, 'native')).toBe('composite');
  });

  it('exposes the strategy hierarchy in priority order', () => {
    expect(STRATEGY_HIERARCHY).toEqual(['native', 'composite', 'generatedAsset', 'renderedAsset']);
  });
});

describe('defaultRegistry', () => {
  it('contains the core effects', () => {
    for (const id of ['fadeIn', 'fadeOut', 'slideIn', 'slideOut', 'riseIn', 'zoomIn', 'zoomOut', 'pulse', 'wiggle', 'flash', 'spin', 'bounce', 'movePath', 'staggerIn', 'morph']) {
      expect(defaultRegistry.has(id), id).toBe(true);
    }
  });

  it('assigns categories and native capability correctly', () => {
    expect(defaultRegistry.getEffect('fadeIn').category).toBe('entrance');
    expect(defaultRegistry.getEffect('morph').category).toBe('morph');
    expect(defaultRegistry.supportsStrategy(defaultRegistry.getEffect('fadeIn'), 'native')).toBe(true);
    expect(defaultRegistry.supportsStrategy(defaultRegistry.getEffect('riseIn'), 'native')).toBe(false);
    expect(defaultRegistry.supportsStrategy(defaultRegistry.getEffect('riseIn'), 'composite')).toBe(true);
  });

  it('resolves the default strategy for a native-capable effect', () => {
    expect(defaultRegistry.resolveStrategy(defaultRegistry.getEffect('slideIn'))).toBe('native');
    expect(defaultRegistry.resolveStrategy(defaultRegistry.getEffect('staggerIn'))).toBe('composite');
  });
});