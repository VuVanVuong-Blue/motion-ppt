---
name: text-animation
description: Generates professional text animations including kinetic typography, typewriter, title reveals, and bullet point cascades.
category: animation
triggers:
  - animate title
  - text reveal
  - kinetic typography
  - typewriter effect
  - bullet points animation
---

# Text Animation Skill

## Purpose
Create engaging, readable, and elegant text animations while preserving 100% editable typography in Microsoft PowerPoint.

## Available Effects

| Effect Name | Strategy | Description | Typical Duration | Recommended Easing |
|---|---|---|---|---|
| `fadeIn` | `native` | Clean opacity transition | 0.5s – 0.7s | `easeOut` |
| `slideIn` | `native` | Translates from left/bottom with fade | 0.6s – 0.8s | `easeOutCubic` |
| `riseIn` | `composite` | Subtle vertical rise (30px up) with fade | 0.6s | `easeOutCubic` |
| `typewriter` | `composite` | Sequential letter/word reveal | 1.0s – 1.5s | `linear` |
| `wordReveal` | `composite` | Words appear smoothly one by one | 0.8s – 1.2s | `easeOut` |
| `kineticText` | `composite` | Dynamic scale + position emphasis | 0.7s | `easeOutBack` |

## Canonical DSL Examples

### Title Rise & Fade Entrance
```json
{
  "id": "title-rise-in",
  "target": "hero-title",
  "effect": "riseIn",
  "start": 0.0,
  "duration": 0.7,
  "easing": "easeOutCubic",
  "options": {
    "distance": 35,
    "direction": "bottom"
  }
}
```

### Bullet Points Stagger
```json
{
  "id": "bullets-stagger",
  "targets": ["bullet-1", "bullet-2", "bullet-3", "bullet-4"],
  "effect": "slideIn",
  "start": 0.3,
  "duration": 0.5,
  "easing": "easeOutCubic",
  "stagger": {
    "delay": 0.18,
    "mode": "forward"
  },
  "options": {
    "direction": "left",
    "distance": 50
  }
}
```

## Rules
- Titles should lead the motion hierarchy.
- For long paragraphs, use subtle `fadeIn` ↓ displacement animations can feel cluttered.
