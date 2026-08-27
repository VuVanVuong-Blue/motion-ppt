---
name: strategy-selector
description: Determines the optimal animation rendering strategy (Native PPTX, Composite PPTX, Generated Asset, or Rendered Video) based on user prompt and visual intent.
category: orchestration
triggers:
  - choose animation strategy
  - determine renderer
  - select effect strategy
supported_strategies:
  - native
  - composite
  - generatedAsset
  - renderedAsset
---

# Strategy Selector Skill

## Purpose
Guide the Coding Agent to automatically choose the simplest, highest-fidelity, and most editable strategy for any requested visual effect.

## Decision Matrix

| Effect Type / Request | Editable Requirement | Recommended Strategy | Explanation |
|---|---|---|---|
| Basic Fade, Wipe, FlyIn, Zoom | Mandatory | `native` | PowerPoint handles these directly via OOXML ,p:anim` nodes. |
| Card Stagger, Multi-Axis Slide + Fade | Mandatory | `composite` | Synchronized multiple native nodes running in parallel/sequence. |
| Custom Vector Glow, Gradient Stroke, Card Drop-Shadow | High | `generatedAsset` | Procedurally generated layered vector shapes that stay editable. |
| 3D Mesh, Particle Explosion, WebGL Shader, Fluid Flow | Low (Visual FX only) | `renderedAsset` | Headless Three.js / Canvas rendering exported as transparent MP4 video overlay. |

## Strategy Selection Algorithm

```text
User Request
    │
    ▽
1. Can this effect be represented with standard PowerPoint transitions/animations?
   ├─► YES ──�� Select 'native'
   └‰⚻ NO
        │
       ▽
2. Can this effect be composed by combining 2 or more native primitives (e.g. translate + opacity)?
   ├─�� YES ─‰⚺ Select 'composite'
   └‸⚻ NO
       │
       ▽
3. Can this effect be achieved by generating an editable SVG or layered vector group?
   ├‰⚺ YES ──► Select 'generatedAsset'
   └‰⚻ NO
       │
       ▽
4. Does this effect strictly require 3D physics, particles, or complex custom shaders?
   ┏ ► YES ──�� Select 'renderedAsset' (Three.js -> video overlay)
```

## Rules & Constraints
- **Never default to Three.js**: If a user asks for "cards appearing", use `composite`, NOT `renderedAsset`.
- **Text Preservation**: Never rasterize text for basic animations.
