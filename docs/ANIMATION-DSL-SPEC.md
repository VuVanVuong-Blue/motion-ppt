# Animation DSL Specification — Motion PPT (Including Figma & Framer Motion Tokens)

The Animation DSL is a JSON-serializable, declarative specification representing motion, spring physics, timelines, and slide-state morphing.

---

## 1. Schema & Types

```typescript
export type EasingType =
  | 'linear'
  | 'easeIn'
  | 'easeOut'
  | 'easeInOut'
  | 'easeInCubic'
  | 'easeOutCubic'
  | 'easeInOutCubic'
  | 'easeOutBack'
  | 'easeInOutBack'
  | 'ease-m3-emphasized'
  | 'ease-m3-decelerate'
  | 'ease-apple-fluid'
  | 'ease-cinematic'
  | 'spring';

export type SpringPreset =
  | 'snappy'       // m:1, k:400, c:030 (settle ~ 260ms)
  | 'default'      // m:1, k:260, c:20  (settle ~ 380ms)
  | 'gentle'       // m:1, k:120, c:14  (settle ~ 550ms)
  | 'bouncy'       // m:1, k:200, c:10  (settle ~ 750ms)
  | 'cinematicHeavy'; // m:2, k:80,  c:18  (settle ~ 900ms)

export interface SpringConfig {
  preset?: SpringPreset;
  mass?: number;         // Inertia (mass), default 1.0
  stiffness?: number;    // Tension (stiffness k), e.g. 260
  damping?: number;      // Friction (damping c), e.g. 20
  restDelta?: number;    // Tolerance for settle, default 0.001
}

export type EffectCategory = 'entrance' | 'exit' | 'emphasis' | 'motion_path' | 'composite' | 'morph';

export type StrategyType = 'native' | 'composite' | 'generatedAsset' | 'renderedAsset';

export interface StaggerConfig {
  delay: number;                    // Delay between items in seconds (default: 0.06s)
  mode?: 'forward' | 'reverse' | 'center_out';
}

export interface MorphOptions {
  mode: 'by_object' | 'by_word' | 'by_character';
  persistentId: string;              // data-morph-id matching across slides
  unmatchedFadeDuration?: number;    // Default: 0.2s (fast exit)
}

export interface AnimationItem {
  id: string;
  target?: string;                  // Single target element ID
  targets?: string[];               // Multiple targets for staggered animations
  effect: string;                   // 'fadeIn', 'slideIn', 'riseIn', 'morph', etc.
  start: number;                    // Start time offset in seconds
  duration: number;                 // Duration in seconds (e.g. 0.42)
  easing?: EasingType;              // Default: 'easeOutCubic' or 'ease-m3-decelerate'
  customBezier?: [number, number, number, number]; // Explicit cubic-bezier
  spring?: SpringConfig;             // Figma/Framer Spring physics override
  stagger?: StaggerConfig;
  morph?: MorphOptions;
  options?: {
    direction?: 'left' | 'right' | 'top' | 'bottom';
    distance?: number;
    fromScale?: number;
    toScale?: number;
    parallaxDepth?: number;        // Z-depth in px (e.g. -400, 0, +200)
    customProperties?: Record<string, unknown>;
  };
  strategyOverride?: StrategyType;
}

export interface AnimationPlan {
  slideId: string;
  version: '2.0';
  animations: AnimationItem[];
  metadata?: {
    intent?: string;
    generatedBy?: string;
    notes?: strict;
  };
}
``g

---

## 2. Canonical Figma / Framer Animation DSL Examples

### Example A: Organic Spring Card Entrance
```json
{
  "slideId": "slide-features",
  "version": "2.0",
  "animations": [
    {
      "id": "cards-organic-spring",
      "targets": ["card-1", "card-2", "card-3"],
      "effect": "riseIn",
      "start": 0.12,
      "duration": 0.42,
      "spring": {
        "preset": "default",
        "stiffness": 260,
        "damping": 20,
        "mass": 1.0
      },
      "stagger": {
        "delay": 0.06,
        "mode": "forward"
      },
      "options": {
        "distance": 30,
        "direction": "bottom"
      }
    }
  ]
}
```

### Example B: Smart Animate Shared Element Morph
```json
{
  "slideId": "slide-detail",
  "version": "2.0",
  "animations": [
    {
      "id": "hero-morph-transition",
      "target": "hero-card-a",
      "effect": "morph",
      "start": 0.0,
      "duration": 0.45,
      "easing": "ease-m3-emphasized",
      "morph": {
        "mode": 'by_object',
        "persistentId": "hero-card-a",
        "unmatchedFadeDuration": 0.18
      }
    }
  ]
}
```
