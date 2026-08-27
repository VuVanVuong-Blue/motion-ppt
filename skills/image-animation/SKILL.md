---
name: image-animation
description: Controls image animations such as Hero Zoom, Ken Burns subtle drift, Parallax depth layers, and Mask reveals.
category: animation
triggers:
  - animate image
  - hero zoom
  - ken burns
  - parallax image
  - image reveal
---

# Image Animation Skill

## Purpose
Bring presentation imagery and screenshots to life with smooth scaling, panning, and reveal effects while keeping image elements replaceable.

## Available Effects

| Effect Name | Strategy | Description | Typical Duration | Easing |
|---|---|---|---|---|
| `heroZoom` | `composite` | Subtle zoom (scale 0.94 -> 1.0) with gentle fade | 1.0s – 1.4s | `easeOutCubic` |
| `kenBurns` | `composite` | Slow cinematic pan + scale for background photos | 3.0s – 5.0s | `easeInout` |
| `parallax` | `composite` | Foreground and background move at differential speeds | 1.0s – 1.5s | `easeOutCubic` |
| `maskReveal` | `generatedAsset` | Shape clip path expands to reveal image | 0.8s – 1.0s | `easeInoutCubic` |
| `popIn` | `native` | Quick scale entrance with subtle overshoot | 0.6s | `easeOutBack` |

## Canonical DSL Example: Hero Image Zoom & Slide
```json
{
  "id": "hero-image-cinematic",
  "target": "product-mockup",
  "effect": "heroZoom",
  "start": 0.1,
  "duration": 1.2,
  "easing": "easeOutCubic",
  "options": {
    "fromScale": 0.92,
    "toScale": 1.0,
    "direction": "bottom",
    "distance": 30
  }
}
```

## Rules
- Keep zoom subtle (scale range should remain within 0.92 to 1.08).
- Always pair image motion with the surrounding card or layout container.
