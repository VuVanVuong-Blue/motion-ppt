---
name: presentation-design
description: Defines professional slide design, typography hierarchy, visual balance, Figma/Apple motion design tokens, and choreography rules.
category: aesthetic
triggers:
  - design presentation
  - layout slide
  - visual balance
  - animation pacing
  - motion tokens
---

# Presentation Design & Motion Tokens Skill

## Purpose
Ensure all animated slides adhere to world-class presentation aesthetics, clean typography hierarchy, and precise Figma/Apple motion tokens.

---

## 1. Standard Motion Design Tokens

### A. Duration Token Hierarchy
- `DURATION_MICROX (`180ms`): Micro-elements, icon state swaps, badge reveals.
- `DURATION_SHORT` (`280ms`): Fast dismissals, collapsing panels, element exits.
- `DURATION_MEDIUM` (`420ms`): Standard slide layout reorganizations, card entrances.
- `DURATION_MACRO` (`650ms`): Complex multi-element hero transitions, full slide morphs.
-  `DURATION_CINEMATIC` (`1100ms`): 3D camera sweeps, narrative keynote moments.

### B. Standard Stagger Tokens
- `STAGGER_FAST` (`30ms`): Large lists (> 6 items).
-  `STAGGER_STANDARD` (`60ms`): Standard 3–5 card grids (recommended default).
-  `STAGGER_SLOW` (`100ms`): Heavy hero headlines or metric callouts.

---

## 2. Core Choreography Rules

### The 3-Tier Motion Priority Hierarchy
1. **Tier 1 (Primary / Hero)**: The focal element (Chart, Hero Visual, Main Headline) moves first (t = 0.0s) with emphasized easing (`DURATION_MEDIUM` = `420ms`).
2. **Tier 2 (Secondary / Supporting)**: Supporting cards, feature descriptions follow with a 60ms stagger delay (t = 0.12s).
3. **Tier 3 (Tertiary / Ambient)**: Background decorations, subtle badges, and footers enter last with a gentle fade (`DURATION_SHORT` = `280ms`).

### Asymmetric In/Out Principle
- **Entrances (In)**: Slower, expressive, deceleration-heavy (`DURATION_MEDIUM` = `420ms`, `ease-m3-decelerate` or Spring).
- **Exits (Out)**: Faster, discreet, acceleration-heavy (`DURATION_SHORT` = `200ms`, `ease-m3-accelerate`).

---

## 3. Typography & Spacing Hierarchy
- Title: 36pt – 48pt, Bold, High contrast against background.
- Subtitle / Section Lead: 20pt – 24pt, Medium weight.
- Body / Card Content: 14pt – 18pt, Regular weight, high readability.
- Margins: Maintain at least **80px safe margins** around the slide borders (1920x1080 canvas).
