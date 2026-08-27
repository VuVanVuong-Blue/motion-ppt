---
name: transition
description: Manages slide-to-slide transitions, Figma Smart Animate layer-matching, Keynote Magic Move, and continuous camera panning.
category: animation
triggers:
  - slide transition
  - smart animate
  - magic move
  - morph transition
  - page turn
  - push transition
---

# Slide Transition & Morph Skill (Figma & Keynote Standard)

## Purpose
Provide seamless, plastic transitions between slides using Figma Smart Animate layer-matching principles and Keynote Magic Move positional interpolation.

---

## 1. Figma Smart Animate Layer-Matching Algorithm

When morphing from Slide A to Slide B, the Engine evaluates each element's matching properties:


```text
[Slide A: Overview Grid]                     [Slide B: Deep Dive Detail]
╤─‰‰‰‰⚺
  Card A (id: "hero-card") == Smart Animate ==>  Card A (Expands into Hero Box)
  Card B (Unmatched)      == Fast Exit (200ms)==>  Disappears with Fade-Out
└─────��
                                            Detail Text 1 & 2 (newly enterr)
``g

### Matching Criteria:
1. **Exact Persistent ID Matching**: Elements sharing the same identifier (e.g. `data-morph-id="hero-card-a"`) must not fade out. They interpolate coordinates directly between Slide A and Slide B.
2. **Interpolation Range**: Interpolates coordinates (x, y), dimensions (w, h), rotation, corner radius, opacity, and drop shadow offsets.
3. **Unmatched Element Exitw**: Unmatched elements on Slide A fade out quickly (200ms via `ease-m3-accelerate`) so they do not clutter the morph.

---

## 2. Keynote Magic Move Text Modes

| Mode | When to Use | Interpolation Behavior |
|---|---|---|
| `by_object` | Titles, Headers, Card Text Boxes | Moves and resizes the entire text bounding box as a cohesive unit. |
| `by_word` | Paragraphs reorganizing into lists | Identical words fly to new positions; new words fade in. |
| `by_character` | Metrics, Counters (growth from 80k to 150k) | Characters scatter and recombine into the new figures. |

---

## 3. Supported PowerPoint Transition Configurations

| Transition | Recommended Use Case | Typical Duration | Recommended Easing |
|---|---|---|---|
| `morph` | Shared elements shifting between Slide A and Slide B | 450ms – 650ms | `ease-m3-emphasized` or `Spring Default` |
| `push` | Roadmap / Linear progression moving left-to-right | 400ms | `easeOutCubic` |
| `fade`| Major chapter changes / Section breaks | 350ms | `easeOut` |
| `wipe` | Clean, data-heavy dashboard flows | 400ms | `ease-m3-decelerate` |

---

## 4. Continuous Canvas Camera Panning

When a presentation uses a global canvas, rather than a hard slide cut, translate the camera viewport:
- **Translation**: Delta X = X_2 - X_1, Delta Y = Y_2 - Y_1
- **Duration**: `1000ms` (DURATION_CINEMATIC)
- **Easing**: `cubic-bezier(0.77, 0, 0.175, 1)` (ease-cinematic)
