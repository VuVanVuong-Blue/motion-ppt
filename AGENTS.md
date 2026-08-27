# AGENTS.md — Master Operating Guide for AI Agents

Welcome to **Motion PPT**. This document defines the strict rules, architectural boundaries, decision trees, and operating procedures that every AI Coding Agent (Antigravity, Claude Code, Cursor, Windsurf, Copilot, MCP agents) MUST adhere to when contributing to this codebase.

---

## 1. The Golden Rule

> **Simple > Reusable > Editable > Composable > Renderer-Independent > Advanced**

Do NOT build complex systems simply because Three.js or AI makes it possible. The primary objective is to produce **clean, editable Microsoft PowerPoint presentations with native animations**.

---

## 2. Editable-First Hierarchy

When fulfilling any animation request, evaluate the implementation strategy in this exact priority order:

` ext
1. Native PowerPoint (p:anim, p:animMotion, p:animScale via OOXML)
 ↓
2. Composite PowerPoint (Multi-track native elements coordinated in timeline)
 ↓
3. Generated Editable Assets (Vector SVGs, layered shape patches, shape grouping)
 ↓
4. Rendered Asset (Canvas / Three.js exported as transparent video / image overlay)
`

### Preservation Rules
- **Titles & Subtitles**: MUST remain editable text in PowerPoint. NEVER rasterize text to an image for basic fade/slide.
- **Card Containers & Backgrounds**: MUST remain native vector shapes.
- **Hero & Content Images**: MUST remain replaceable image elements.
- **Particle Simulations & 3D Shaders**: MAY be rendered to transparent video overlay when native PPTX is technically impossible.

---

## 3. Strict Architectural Boundaries

` ext
@motion-ppt/shared (Pure types, errors, utils)
 ↑
@motion-ppt/core (Pure domain model: Presentation, Slide, SlideElement)
 ↑
@motion-ppt/animation (DSL, Timeline, Easing, EffectRegistry)
 ↑
@motion-ppt/pptx (PptxGenJS + OOXML Timing Patch Engine)
 ↑
apps/mcp-server (High-level tool endpoints for Agents)
`

### Prohibited Cross-Layer Imports
- @motion-ppt/core MUST NEVER import hree, 
eact, 
ext, pptxgenjs, or @modelcontextprotocol/sdk.
- @motion-ppt/animation MUST NEVER manipulate PowerPoint XML directly.
- The Coding Agent MUST NOT inject raw XML in tool calls. Always generate an AnimationPlan in the Animation DSL.
- Infrastructure and renderer details must remain isolated inside @motion-ppt/pptx, @motion-ppt/graphics, and @motion-ppt/video.

---

## 4. Animation DSL Paradigm

The Animation DSL is the single source of truth between Agent intent and renderers.

` ext
User Prompt
 ↓
Agent
 ↓
Load Skills (skills/<name>/SKILL.md)
 ↓
Inspect Slide Elements (element.list)
 ↓
Emit AnimationPlan (Adhering to docs/ANIMATION-DSL-SPEC.md)
 ↓
AnimationEngine.apply(plan)
 ↓
PptxRenderer / ThreeRenderer
`

### Canonical Animation DSL Example
`json
{
 slideId: slide-1,
 animations: [
 {
 id: hero-title-entrance,
 target: title-box,
 effect: slideIn,
 start: 0.0,
 duration: 0.8,
 easing: easeOutCubic,
 options: {
 direction: left,
 distance: 120
 }
 },
 {
 id: cards-stagger,
 targets: [card-1, card-2, card-3],
 effect: staggerIn,
 start: 0.4,
 duration: 0.6,
 easing: easeOutBack,
 stagger: {
 delay: 0.15,
 mode: forward
 },
 options: {
 direction: bottom,
 distance: 80
 }
 }
 ]
}
`

---

## 5. Skills Knowledge Base

Before planning or executing animations for specific elements, read the relevant skill file:

| Skill | Path | Focus Area |
|---|---|---|
| Strategy Selector | skills/strategy-selector/SKILL.md | Deciding native vs composite vs rendered |
| Presentation Design | skills/presentation-design/SKILL.md | Visual hierarchy, spacing, contrast, max duration |
| Text Animation | skills/text-animation/SKILL.md | Kinetic typography, typewriter, slide/fade reveals |
| Image Animation | skills/image-animation/SKILL.md | Hero zoom, Ken Burns, parallax, masks |
| Card Animation | skills/card-animation/SKILL.md | Grid stagger, cascading reveals, pop-in |
| Cinematic | skills/cinematic/SKILL.md | Multi-element choreography, spring physics |
| Transition | skills/transition/SKILL.md | Slide-to-slide morphs, pushes, wipes |
| Video Reference | skills/video-reference/SKILL.md | Mapping motion primitives from reference video |

---

## 6. TypeScript & Code Standards

- **Strict Typing**: Enable all strict checks. Never use ny. Use unknown with type guards when consuming external data.
- **Typed Errors**: Always throw domain-specific errors extending MotionPptError (e.g., SlideNotFoundError, EffectNotSupportedError, InvalidAnimationPlanError).
- **Immutability**: Prefer pure functions for timeline calculations and transformation math.
- **Small Interfaces**: Keep interfaces concise and focused on single responsibilities.

---

## 7. Step-by-Step Feature Implementation Protocol

When instructed to add a new feature or effect:

1. **Check Existing Primitives**: Can the effect be composed from ranslate, scale, 
otate, and opacity?
2. **Define Effect in Registry**: Add definition with capability flags (pptxNative, pptxComposite, canvas, hree).
3. **Implement Strategy**: Write the renderer transformation in @motion-ppt/pptx or @motion-ppt/graphics.
4. **Write Unit Tests**: Add test cases verifying timeline calculation and output properties.
5. **Verify PPTX Output**: Ensure the generated .pptx opens without repair warnings in PowerPoint.
6. **Register MCP Tool**: Expose high-level parameters if required.

---

## 8. Definition of Done Checklist

A pull request or task is complete ONLY when:
- [ ] TypeScript compiles cleanly with pnpm typecheck (zero errors).
- [ ] Vitest unit & integration tests pass with pnpm test.
- [ ] PPTX files remain editable in Microsoft PowerPoint / LibreOffice.
- [ ] Relevant SKILL.md documentation is updated if new animation primitives are added.
- [ ] No architectural layer violations exist.
