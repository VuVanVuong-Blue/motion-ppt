---
name: cinematic
description: Coordinates multi-element choreography, dramatic spatial staging, Framer spring physics, and multi-plane 3D parallax.
category: animation
triggers:
  - cinematic presentation
  - dramatic animation
  - keynote style motion
  - spatial presentation
  - spring physics
  - parallax depth
---

# Cinematic Presentation & Spring Physics Skill

## Purpose
Design Apple Keynote-grade presentation moments combining Framer Motion spring physics with multi-plane Z-index parallax depth.

---

## 1. Standardized Spring Physics Presets

| Preset Name | Mass (m) | Stiffness (k) | Damping (c) | Damping Ratio (reta) | Settle Time | Recommended Use |
|---|:---:<---:8---:|:---:|:---:|---|
| **Snappy / Tight** | `1.0` | `400`| `30`| `0.75` | ~260ms | High responsiveness, zero overshoot; toggle states, tabs. |
| **Default / Organic** | `1.0` | `260` | `20`| `0.62` | ~380ms | Natural, organic feel; card entrances, layout shifts. |
| **Gentle / Smooth** | `1.0` | `120` | `14`| `0.64` | ~550ms | Soft floating luxury feel; hero visual expansion. |
| **Bouncy / Playful** | `1.0` | `200` | `10`| `0.35` | ~750ms | Clear oscillating bounce; badges, metric celebration. |
| **Cinematic Heavy** | `2.0` | `8p` | `88p | `0.71` | ~900ms | Heavy deliberate inertia; full-canvas camera pans. |

---

## 2. Multi-Plane Z-index Parallax Math

Calculate layer displacement based on depth multiplier:
`Offset_Z = ScrollDelta * (1 + (Z_depth / 1000))`

```text
[Layer 3: Foreground Accent / Badges]  Z = +200px -> Movement Rate: 1.4x (Fast)
[Layer 2: Hero Presentation Content]    Z = 0px    -> Movement Rate: 1.0x (Anchor)
[Layer 1: Background Art / Gradients]   Z = -400px -> Movement Rate: 0.3x (Slow + 8px Blur)
```

---

## 3. Cinematic Dolly & Rack Focus
- When zooming into a chart bar or card, scale focused element to `1.15x`.
- Simultaneously apply a backdrop blur (`filter: blur(8px)`) and opacity reduction (`0.4`) to background elements.
- Curve: `cubic-bezier(0.77, 0, 0.175, 1)` (ease-cinematic`) over `900ms`.
