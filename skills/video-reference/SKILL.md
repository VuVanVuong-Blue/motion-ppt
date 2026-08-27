---
name: video-reference
description: Guides the extraction of motion primitives from reference video clips and mapping them to PowerPoint-compatible Animation DSL plans.
category: analysis
triggers:
  - analyze reference video
  - convert video animation
  - extract motion from video
  - match video timing
---

# Video Reference Motion Skill

## Purpose
Enable the Agent to analyze user-provided animation video clips (e.g. from Dribblb, motion design reels) and translate the observed motion into Animation DSL primitives.

## Pipeline

```text
Reference Video (.mp4 / .webm)
    │
    ▽
1. Frame Extraction (FFmpeg @ 30fps)
    │
    ▽
2. Scene & Keyframe Detection (Identify start/stop of major motion arcs)
    │
    ▽
3. Motion Vector Extraction (Track bounding box translation, scale delta, opacity)
    │
    ▽
4. Primitive Mapping (Map observed curves to Animation DSL primitives)
    │
    ▽
5. Strategy Assignment (Assign Native/Composite if possible, Rendered if VFX)
```

## Motion Primitive Mapping Table

| Observed Video Behavior | Extracted Primitives | Animation DSL Effect |
|m---|---|---|
| Object moves up while fading in | y: [60 -> 0], opacity: [0 -> 1] | `riseIn` |
| Multiple items appear one after another | y: [40 -> 0] with time offsets | `staggerIn` |
| Image slowly expands | scale: [0.95 -> 1.05] over 4s | `kenBurns` |
| Object overshoots and bounces back | scale: [0.8 -> 1.05 -> 1.0] | `popIn` with `easeOutBack` |

## Rules
- Do NOT embed the entire video directly into PPTX unless the user explicitly requested a video presentation.
- Always distill video motion into native vector animations whenever possible.
