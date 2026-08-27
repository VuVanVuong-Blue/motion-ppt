# Milestones — Motion PPT

Tracked scope of the build-out. Milestone 1 is implemented; later milestones
extend the dependency graph defined in [ARCHITECTURE.md](./ARCHITECTURE.md).

---

## ✅ Milestone 1 — Packages, Domain Model & PPTX Tool (implemented)

### Scope
Create the monorepo package infrastructure, the pure core domain model, and a
Tier 1 PPTX writer/reader built on PptxGenJS.

### Decisions (confirmed with the project owner)
| Decision | Choice |
|---|---|
| Packages in scope | `@motion-ppt/shared`, `@motion-ppt/core`, `@motion-ppt/pptx` (animation/graphics/video deferred) |
| PPTX tool | Tier 1 only — domain model ↔ PptxGenJS roundtrip; OOXML timing injection (Tier 2, ADR 0002) lands with the animation milestone |
| Reader scope | Writer-subset roundtrip (text, image, shape, group flattening); unknown constructs skipped with warnings |
| Build tooling | Plain `tsc -b` (composite, NodeNext, ESM), zero bundler dependencies |

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

## ⏳ Later milestones (not started)

- **M2 — Animation package**: Animation DSL (per `docs/ANIMATION-DSL-SPEC.md`),
  Timeline/Easing math, EffectRegistry with capability flags.
- **M3 — PPTX Tier 2**: OOXML `<p:timing>` injection (jszip + XML patching)
  consuming the DSL; PowerPoint-native animations.
- **M4 — Rendered assets & MCP server**: `@motion-ppt/graphics`, `@motion-ppt/video`,
  `apps/mcp-server` tool endpoints, `apps/web`/`apps/worker`.
