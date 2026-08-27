# Milestones — Motion PPT

Tracked scope of the build-out. Milestone 1 is implemented; later milestones
extend the dependency graph defined in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## ✅ Milestone 1 — Packages, Domain Model & PPTX Tool (implemented)

### Scope

Create the monorepo package infrastructure, the pure core domain model, and a
Tier 1 PPTX writer/reader built on PptxGenJS.

### Decisions (confirmed with the project owner)

| Decision          | Choice                                                                                                                         |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------------ |
| Packages in scope | `@motion-ppt/shared`, `@motion-ppt/core`, `@motion-ppt/pptx` (animation/graphics/video deferred)                               |
| PPTX tool         | Tier 1 only — domain model ↔ PptxGenJS roundtrip; OOXML timing injection (Tier 2, ADR 0002) lands with the animation milestone |
| Reader scope      | Writer-subset roundtrip (text, image, shape, group flattening); unknown constructs skipped with warnings                       |
| Build tooling     | Plain `tsc -b` (composite, NodeNext, ESM), zero bundler dependencies                                                           |

### Deliverables

- **`packages/shared`** — `MotionPptError` hierarchy (typed errors with codes),
  unit conversions (px ↔ inch ↔ EMU ↔ pt), math helpers, id generation, and
  strict `unknown` type guards. Zero runtime dependencies.
- **`packages/core`** — the pure scene graph: `Presentation`, `Slide`,
  `SlideElement` (discriminated union: text / image / shape / group /
  asset_overlay), `Transform`, `AssetReference`, `SlideBackground`.
  Includes strict validation (`parsePresentation`/`parseSlide`/`parseSlideElement`
  consume `unknown` and throw `InvalidPresentationError` with field paths),
  typed errors (`SlideNotFoundError`, `ElementNotFoundError`, `AssetNotFoundError`,
  `DuplicateIdError`), immutable factories and mutations (`addSlide`,
  `removeElement` with nested-group search, …). Depends only on `@motion-ppt/shared`.
- **`packages/pptx`** — `PresentationWriter` (PptxGenJS: text, images, native
  shapes with fill/line/rotation, notes, background; groups flattened into
  positioned children) and `PresentationReader` (jszip + fast-xml-parser,
  `preserveOrder` parsing that keeps z-order; media imported as base64 assets;
  OOXML subset per the decision above). Warnings are collected instead of
  silently dropped.

### Verification (all green)

- `pnpm build` — 3/3 packages.
- `pnpm typecheck` — zero errors, including test files.
- `pnpm test` — 79 tests: shared 23, core 30, pptx 26 (writer, reader,
  roundtrip, zip-structure/relationship integrity).
- `pnpm --filter @motion-ppt/pptx demo` — writes `scratch/demo.pptx`
  (2 slides, text/shape/image/group), verified: required OOXML parts present,
  24 XML parts well-formed, every relationship target resolves, read-back
  yields 0 warnings, write→read→write is idempotent.

### Known limitations (by design, tracked for later milestones)

- **Groups** are flattened (translation + opacity); group rotation/scale
  produces a warning. Native OOXML groups (`p:grpSp`) are skipped on read.
- **Reader parses only the writer's subset**: tables (`p:graphicFrame`),
  connectors (`p:cxnSp`), native groups are skipped with warnings.
- **Shape opacity** maps to fill/line transparency with a warning (PptxGenJS
  has no element-level shape opacity). Text and image opacity roundtrip exactly.
- **`lineSpacing`**, **background images**, and **corner radius for non-roundRect**
  are writer warnings (unsupported in M1).
- **Image fit** `cover`/`contain` requires intrinsic asset size; otherwise falls
  back to `stretch` with a warning.
- A PPTX file has a single global slide size; mismatched slide sizes warn.
- `pptxgenjs` UMD declarations are unusable under NodeNext ESM; the package
  carries a minimal structural shim (`src/pptxgenjs-types.ts`) for the surface
  it uses.

---

## ✅ Milestone 2 — Animation Package (implemented)

### Scope

`@motion-ppt/animation` — the Animation DSL, timing math, easing/spring
physics and the effect registry that renderers (PPTX Tier 2, canvas, three)
will consume.

### Deliverables

- **DSL types** (`src/types.ts`) — `AnimationPlan`, `AnimationItem`, easing
  types, spring presets/config, stagger/morph/options and strategy enums per
  `docs/ANIMATION-DSL-SPEC.md`.
- **Validation** (`src/validate.ts`) — `parseAnimationPlan` consumes `unknown`
  and throws path-aware `InvalidAnimationPlanError` (version, targets, timing,
  easing, bezier, spring, stagger, morph, strategy checks).
- **Easing** (`src/easing.ts`) — 14 named easings (linear, quad/cubic,
  back overshoot, Material 3 emphasized/decelerate, Apple fluid, cinematic)
  plus `resolveEasing('spring')`; boundaries f(0)=0, f(1)=1 verified by tests.
- **Spring physics** (`src/spring.ts`) — closed-form damped oscillator with
  presets (snappy/default/gentle/bouncy/cinematicHeavy), config merging,
  settle time and displacement functions.
- **Effect registry** (`src/registry.ts`) — `EffectDefinition` with
  capability flags (pptxNative / pptxComposite / canvas / three) and
  editable-first strategy resolution (native > composite > generatedAsset >
  renderedAsset); 15 built-in effects.
- **Timeline** (`src/timeline.ts`) — `computeTimeline` resolves per-target
  absolute start/end with stagger offsets (forward/reverse/center_out),
  default easing `easeOutCubic`, strategy, and optional slide target
  validation via `@motion-ppt/core`.

### Verification

- `pnpm typecheck` — zero errors (incl. tests).
- `pnpm test` — 72 tests: easing 26, spring 9, validation 15, timeline 15,
  registry 7. Spring easings verified for settle bounds and overshoot;
  stagger offsets verified for all three modes.

---

## ✅ Milestone 3 — PPTX Tier 2: Native OOXML Timing Injection (implemented)

### Scope

Inject native PowerPoint `<p:timing>` node graphs into .pptx output for
effects expressible in OOXML, consuming the Animation DSL from M2.

### Deliverables

- **`packages/pptx/src/timing/timing-xml.ts`** — builds the `<p:timing>` tree
  (`tmRoot` → `mainSeq` → per-animation `p:par` with absolute-ms delays) and
  maps effects to native behaviors: `p:animEffect` (fade/flash),
  `p:animMotion` (slideIn/slideOut/movePath), `p:animScale` (zoom/pulse),
  `p:animRot` (spin).
- **`packages/pptx/src/timing/injector.ts`** — `TimingInjector` post-processes
  the writer's .pptx via jszip; resolves element ids → `p:spTgt spid`
  positionally (writer emission order == XML document order); skips
  unsupported effects/strategies with warnings.
- **`packages/pptx/src/writer/elements.ts`** — extracted `flattenSlideElements`
  as the single shared emission order between writer and injector.
- **`packages/pptx/src/facade.ts`** — `writeAnimatedPresentation()` one-call
  facade returning `{ buffer, warnings }`.

### Verification

- `pnpm test` — 37 pptx tests including 11 timing tests.
- `scratch/demo-animated.pptx` — 44 parts intact, all XML well-formed,
  relationships resolve, read-back 0 warnings, native timings on both slides.

### Known limitations

- Auto-play sequencing only (no click triggers); parallel groups render as
  same-delay siblings; `pulse` is one-directional.
- Motion paths are relative (fractions of shape size).
- Structural/schema validation only — a real PowerPoint slide-show check is
  still recommended before production use.

---

## 🚧 Milestone 4 — Rendered Assets (in progress)

- **✅ `@motion-ppt/graphics` (implemented)** — Canvas renderer and frame
  playback for the `generatedAsset` strategy: pure per-effect visual-state
  math, `frameStatesAt` timeline playback (active/settled/overlap/morph),
  `SlideRenderer` (`renderStatic` / `renderFrame` → PNG), pixel-probe tests
  (46 tests), and a frame demo. See [docs/GRAPHICS.md](./GRAPHICS.md).
- **⏳ Planned** — `@motion-ppt/video` (frame → H.264/transparent video),
  `apps/mcp-server` tool endpoints, `apps/web` / `apps/worker`.

---

## 🛠 Repo process (added with M2)

- Branching & PRs: `docs/WORKFLOW.md` — all PRs target `dev`; `main` receives
  code only via release PRs from `dev`.
- CI/CD & configuration: `docs/CI-CD.md` + `.github/workflows/ci.yml` — the
  same gates CI enforces (typecheck, build, test).
