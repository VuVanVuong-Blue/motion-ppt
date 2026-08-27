# Graphics — @motion-ppt/graphics

## Role in the editable-first architecture

The 4-tier strategy resolution (see [ARCHITECTURE.md](./ARCHITECTURE.md)) falls
back to rasterization only when an effect cannot be expressed as native OOXML:

| Strategy           | Capability                     | Renderer                                           |
| ------------------ | ------------------------------ | -------------------------------------------------- |
| native / composite | `pptxNative` / `pptxComposite` | PPTX timing injector (M3)                          |
| **generatedAsset** | **`canvas`**                   | **`@motion-ppt/graphics` (this package)**          |
| renderedAsset      | `three`                        | Three.js (deferred; no default effect requests it) |

Every built-in effect in the registry carries `canvas: true`, so the Canvas
renderer can preview, rasterize, and (in a later milestone) produce generated
assets for the full default effect set. The Three.js renderer is intentionally
**not** part of M4: no default effect has `three: true`, and headless WebGL in
Node adds native-build risk for zero current consumers.

## Modules

| File              | Purpose                                                                                                      |
| ----------------- | ------------------------------------------------------------------------------------------------------------ |
| `src/canvas.ts`   | Backend adapter for `@napi-rs/canvas`: offscreen surface, PNG encode, hex colors, fallback font registration |
| `src/types.ts`    | `ElementVisualState`, `FrameResult`, `RenderOptions`                                                         |
| `src/errors.ts`   | `CanvasRenderError`, `AssetDecodeError`                                                                      |
| `src/effects.ts`  | Pure per-effect visual-state math (no canvas dependency)                                                     |
| `src/playback.ts` | Timeline playback: `frameStatesAt` maps `computeTimeline` output to per-frame states                         |
| `src/draw.ts`     | Element rasterization (text / shape / image / group)                                                         |
| `src/renderer.ts` | `SlideRenderer` facade: `renderStatic` / `renderFrame` → PNG buffers                                         |

The canvas backend is confined to `canvas.ts`; every other module types
against a minimal context interface so the backend could be swapped.

## Playback semantics (`src/playback.ts`)

- While an animation is active (`start <= t <= end`), its eased progress
  drives the effect's visual state.
- After the animation ends, its **settled** state applies: entrances stay
  fully visible, exits stay hidden (e.g. `fadeOut` keeps opacity 0).
- **Overlapping animations** on one target: the latest-ending one wins and a
  warning is emitted.
- **Morph** interpolates from a caller-provided source snapshot
  (`morphFrom` deltas, see `computeMorphDelta`); without one it degrades to a
  fade-in with a warning.

## Effect → visual state

| Effect                             | Visual state over eased progress `p`                                                                                                                                    |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `fadeIn` / `fadeOut` / `staggerIn` | opacity `p` / `1-p` / `p`                                                                                                                                               |
| `slideIn` / `slideOut`             | translate from/to an edge; direction via `options.direction` (default `bottom`, matching the PPTX timing engine); `options.distance` overrides the element-size default |
| `riseIn`                           | translate up 30% of height + fade-in                                                                                                                                    |
| `zoomIn` / `zoomOut`               | scale `p` / `1-p` around the element center                                                                                                                             |
| `pulse`                            | scale oscillation ±15%, 2 cycles                                                                                                                                        |
| `wiggle`                           | rotation oscillation ±8°, 3 cycles                                                                                                                                      |
| `flash`                            | two off-blinks (binary-exact square wave, ends visible)                                                                                                                 |
| `spin`                             | rotation 0 → 360°                                                                                                                                                       |
| `bounce`                           | vertical ease-out-bounce from above the element height                                                                                                                  |
| `movePath`                         | polyline path from `options.customProperties.path` — either `[{x,y}, …]` or an SVG `M`/`L` string                                                                       |
| `morph`                            | morphFrom delta interpolation (else fade-in)                                                                                                                            |

## API

```ts
const renderer = new SlideRenderer();

// Static raster of a slide.
const static = await renderer.renderStatic(presentation, slide, { scale: 1 });

// One animation frame: accepts a resolved Timeline or a raw AnimationPlan.
const frame = await renderer.renderFrame(presentation, slide, plan, t, {
  morphFrom: new Map([["hero", computeMorphDelta(fromTransform, toTransform)]]),
});
// -> { buffer: Buffer /* PNG */, width, height, warnings }

// Pure playback math (no canvas):
const states = frameStatesAt(timeline, t, {
  bounds: { el: { width: 100, height: 50 } },
});
```

## Rendering pipeline

1. Register fallback fonts (Windows: Segoe UI / Arial / Calibri; no-op elsewhere).
2. Create an offscreen surface at `slide.width × scale`.
3. Paint the background (solid color, image cover, or white default).
4. Preload image assets (`file` paths and `base64` data URIs; `url` and
   undecodable assets become warnings).
5. Draw elements in z-order, applying base transforms + visual states;
   **groups are flattened** exactly like the PPTX writer (translation +
   opacity, group-local child coordinates).
6. Encode to PNG.

## Demo & verification

- `pnpm --filter @motion-ppt/graphics demo` renders 12 PNGs to
  `scratch/graphics/`: static + 5 frames per slide (hero + staggered cards).
- 46 unit tests: effects 24, playback 10, renderer 12 (real pixel probes).
- Invariant checked by tests and demo: **the settled frame is byte-identical
  to the static render**.

## Limitations

- Text: one paragraph per box with basic word wrap; no rich runs.
- Shapes: `rect`, `roundRect`, `ellipse`, `triangle`, `diamond`, `chevron`;
  other OOXML presets render as `rect` with a warning.
- Images: `file` / `base64` only; `url` assets are skipped with a warning.
- Morph needs a caller-provided `morphFrom` snapshot; automatic cross-slide
  wiring (via the DSL `persistentId`) is future work.
- No Three.js renderer and no video/GIF encoding — output is PNG frames.
