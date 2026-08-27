# ADR 0002: Hybrid PPTX Engine (PptxGenJS + OOXML Timing Patch Engine)

## Status
Accepted

## Context
- PptxGenJS is a mature, reliable TypeScript library for generating presentations, shapes, tables, and images. However, it lacks support for complex animation timelines, staggers, multi-track motion, and custom easing.
- Writing a full PPTX layout engine from scratch is overly complex and error-prone.

## Decision
We implement a **Hybrid 2-Tier PPTX Engine** inside @motion-ppt/pptx:
1. **Tier 1 (Authoring & Layout)**: Use PptxGenJS for slide composition, typography, image placement, and vector drawing.
2. **Tier 2 (Timing Injection)**: Use jszip and XML parsing to inspect the generated ZIP archive and inject <p:timing> node graphs (Entrance, Exit, Motion Paths, Scales, and Staggers) directly into the slide XML.

## Consequences
- **Positive**: Clean separation of layout concerns from animation timing.
- **Positive**: Produces genuine PowerPoint animation timelines that work seamlessly on Windows, macOS, and PowerPoint Online.
- **Positive**: Retains type-safe TypeScript models throughout the pipeline.
