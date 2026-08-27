---
name: card-animation
description: Orchestrates animations for feature cards, pricing tiers, grid items, and metric dashboards with automatic stagger calculations.
category: animation
triggers:
  - animate cards
  - stagger cards
  - grid entrance
  - pricing table animation
  - metric cards reveal
---

# Card Animation Skill

## Purpose
Orchestrate clean, sequential reveals for multi-card layouts (e.g. 3-column features, metric KPIs, testimonials).

## Stagger Timing Formula
For a list of N cards with stagger delay d and card animation duration D:
- Card i Start Time: T_i = T_base + (i * d)
- Card i End Time: T_i + D
- Total Sequence Time: T_base + ((N - 1) * d) + B

Recommended values:
- d = 0.12s – 0.20s (fast, fluid progression)
- D = 0.50s – 0.70s

## Canonical DSL Example: 3 Feature Cards
```json
{
  "id": "feature-cards-stagger",
  "targets": ["card-analytics", "card-security", "card-integration"],
  "effect": "staggerIn",
  "start": 0.35,
  "duration": 0.6,
  "easing": "easeOutBack",
  "stagger": {
    "delay": 0.15,
    "mode": "forward"
  },
  "options": {
    "direction": "bottom",
    "distance": 70
  }
}
```

## Rules
- Group card background shape, icon, and card text into a logical target or composite container.
- If cards are in a grid (2x2), use stagger with forward mode (left-to-right, top-to-bottom).
