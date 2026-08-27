# ADR 0001: Editable-First Architecture

## Status
Accepted

## Context
Many existing presentation tools rasterize slides into images or render entire presentations into static videos. This destroys user editability in Microsoft PowerPoint, making small copy tweaks, font adjustments, or image swaps impossible after generation.

## Decision
Motion PPT adopts an **Editable-First Principle**:
1. All typography, shapes, and layout elements must remain native PowerPoint vector objects.
2. Motion must be compiled into native PowerPoint animation tags (<p:anim>, <p:animMotion>, <p:animScale>) whenever possible.
3. Canvas and Three.js are reserved strictly for 3D/particle/shader effects that cannot be expressed natively in OOXML.
    
## Consequences
- **Positive**: Users can open, customize, and continue editing the resulting .pptx in Microsoft PowerPoint.
- **Positive**: Tiny file sizes compared to full-video presentations.
- **Negative**: Requires maintaining an OOXML timing injection layer to support advanced PowerPoint animations not exposed by basic generation libraries.
