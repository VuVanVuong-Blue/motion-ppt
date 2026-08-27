# Architecture Specification — Motion PPT

## 1. System Overview & Core Philosophy

Motion PPT is an AI-native presentation animation engine designed to inspect existing presentations, understand user animation intent, compile declarative animation plans into an intermediate Animation DSL, and render smooth, editable presentations.

### Core Philosophy
1. **Editable-First**: PowerPoint elements (text boxes, cards, shapes, images) must remain native vector objects whenever possible.
2. **AI-Native**: The architecture is optimized for AI Coding Agents to reason, plan, validate, and repair animations.
3. **Renderer-Independent**: Animation DSL decouples user intent and timeline math from renderer-specific XML or WebGL rendering logic.

---

## 2. End-to-End Pipeline

`	ext
User Prompt ( Slide in title from left stagger 3 cards from bottom)
   │
   ▼
AI Coding Agent
   │ (reads skills/presentation-design, skills/text-animation, skills/card-animation)
   ▼
Intent Understanding & Scene Inspection (via MCP slide.get, element.list)
   │
   ▼
Animation Planner
   │ (computes start times, durations, easing, stagger offsets)
   ▼
Animation DSL (JSON-serializable declarative AnimationPlan)
   │
   ▼
Animation Engine & Effect Registry
   │ (evaluates capabilities & resolves optimal strategy)
   ├────────────────────────┬────────────────────────┬────────────────────────┐
   ▼                        ▼                        ▼                        ▼
[Native PPTX Strategy]   [Composite PPTX]         [Generated Asset]        [Rendered Asset]
(p:anim in OOXML)        (Multi-node sync)        (SVG / shape patch)      (Three.js/Canvas -> MP4)
   │                        │                        │                        │
   └────────────────────────┴────────────────────────┴────────────────────────┘
                            │
                            ▼
                     PptxRenderer / Patch Engine
                            │
                            ▼
              Output (.pptx with native timings)
`

---

## 3. Scene Graph Domain Model

The Presentation Domain Model lives exclusively inside @motion-ppt/core and is completely decoupled from PowerPoint OOXML or Three.js abstractions.

`	ext
Presentation
  └── Slide (width, height, background, layout)
       └── Scene
            ├── Element: Text (content, font, fontSize, color, align, transform)
            ├── Element: Image (sourceId, crop, transform, fit)
            ├── Element: Shape (shapeType, fill, stroke, transform)
            ├── Element: Group (children: SlideElement[], transform)
            └── Element: AssetOverlay (renderedAssetId, opacity, transform)
`

### TypeScript Domain Definitions

`	ypescript
export type ElementType = 'text' | 'image' | 'shape' | 'group' | 'asset_overlay';

export interface Transform {
  x: number;
  y: number;
  width: number;
  height: number;
  rotation?: number;
  scaleX?: number;
  scaleY?: number;
  opacity?: number;
  zIndex?: number;
}

export interface SlideElement {
  id: string;
  name?: string;
  type: ElementType;
  transform: Transform;
  content?: Record<string, unknown>;
  style?: Record<string, unknown>;
  locked?: boolean;
}

export interface Slide {
  id: string;
  index: number;
  width: number;
  height: number;
  elements: SlideElement[];
  notes?: string;
}

export interface Presentation {
  id: string;
  title: string;
  slides: Slide[];
  assets: Map<string, AssetReference>;
}
`

---

## 4. The 4-Tier Strategy Resolution

The EffectRegistry evaluates every requested effect against element requirements and available capabilities:

| Strategy | When Used | Mechanism | PowerPoint Result |
|---|---|---|---|
| **1. Native** | Basic entrance/exit (Fade, Fly In, Zoom, Wipe) | Native <p:anim> nodes injected into Slide OOXML | 100% native PowerPoint animation |
| **2. Composite** | Coordinated multi-axis motion, card staggers | Synchronized parallel/sequential <p:timing> node trees | Native shapes animated simultaneously |
| **3. Generated Asset** | Complex vector glows, gradient strokes, masked cards | Procedural SVG/PNG patch injected as editable shape group | Editable group with native fade/slide |
| **4. Rendered Asset** | 3D particle bursts, fluid simulations, custom WebGL shaders | Three.js headless frame rendering $ightarrow$ H.264 transparent video | Video overlay on top of editable background |

---

## 5. Monorepo Package Boundaries & Dependency Graph

`	ext
@motion-ppt/shared
   ▲           ▲
   │           │
@motion-ppt/core   @motion-ppt/graphics   @motion-ppt/video
   ▲
   │
@motion-ppt/animation
   ▲
   │
@motion-ppt/pptx
   ▲
   │
apps/mcp-server & apps/web & apps/worker
`

### Dependency Invariants
1. @motion-ppt/core has ZERO dependencies on UI libraries (
eact, 
ext), 3D engines (	hree), or presentation writers (pptxgenjs).
2. @motion-ppt/animation depends only on @motion-ppt/core and @motion-ppt/shared.
3. @motion-ppt/pptx handles serialization, deserialization, and OOXML patching.
4. pps/mcp-server translates agent tool invocations into domain service operations.
