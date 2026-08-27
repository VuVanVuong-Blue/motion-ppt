# 🎬 Motion PPT

> **Editable-first · AI-native · renderer-independent** presentation animation engine.

[![CI](https://github.com/VuVanVuong-Blue/motion-ppt/actions/workflows/ci.yml/badge.svg)](https://github.com/VuVanVuong-Blue/motion-ppt/actions/workflows/ci.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](#license)
[![Version](https://img.shields.io/badge/version-0.1.0-blueviolet.svg)](package.json)
[![Node](https://img.shields.io/badge/node-%3E%3D20-339933.svg)](package.json)

Motion PPT lets AI coding agents inspect existing PowerPoint files, interpret
natural-language animation requests, plan declarative timelines, and emit
**native, editable `.pptx` files** — every animated element stays a real,
editable PowerPoint object instead of flattened video.

**Status:** Milestones 1–3 shipped · M4 (renderers + MCP server) planned.

---

## ✨ Highlights

- ✅ **Editable-first output** — animations are native PowerPoint timings
  (`<p:timing>` / OOXML), so recipients can still edit every element.
- 🧩 **Renderer-independent DSL** — one declarative, JSON-serializable
  `AnimationPlan` drives PPTX, Canvas, and Three.js renderers.
- 🔍 **Strict by construction** — `unknown`-typed parsers with path-aware
  errors; warnings are collected, never silently dropped.
- 🎯 **Rich animation math** — 14 named easings, closed-form spring physics,
  stagger offsets (forward / reverse / center-out), and a capability-aware
  effect registry with strategy resolution.
- 🧪 **162 unit tests** across 4 packages; `shared` and `core` carry zero
  runtime dependencies.
- 🤖 **Agent-ready** — standardized Skills (`skills/*/SKILL.md`), ADRs, and a
  documented MCP-server roadmap.

---

## 🏗 How It Works

```text
User prompt / existing .pptx
        │
        ▼
AI Coding Agent ── (Skills: presentation-design, text, image, card, cinematic, …)
        │
        ▼
Intent understanding & animation planner
        │
        ▼
Animation DSL ── declarative, JSON-serializable timeline (AnimationPlan)
        │
        ▼
Animation engine & effect registry ── strategy resolver
        │        (native > composite > generated asset > rendered asset)
        ▼
Renderers ── PptxRenderer (native OOXML timings) · CanvasRenderer · ThreeRenderer
        │
        ▼
Output: editable .pptx · MCP Server endpoints for agents
```

---

## 📦 Monorepo Layout

```text
motion-ppt/
├── packages/
│   ├── shared/      # Types, errors, math, unit conversions, type guards
│   ├── core/        # Pure scene graph: Presentation / Slide / SlideElement
│   ├── animation/   # Animation DSL, easing, springs, registry, timeline
│   └── pptx/        # PptxGenJS writer, OOXML reader, native timing injector
├── apps/            # (planned) web · mcp-server · worker
├── skills/          # Standardized agent skills (SKILL.md)
├── docs/            # Architecture specs, ADRs, workflow, CI/CD, DoD
└── AGENTS.md        # Master rules for AI agents
```

| Package                 | Purpose                                                                | Depends on                    |
| ----------------------- | ---------------------------------------------------------------------- | ----------------------------- |
| `@motion-ppt/shared`    | Types, errors, math, units, guards                                     | —                             |
| `@motion-ppt/core`      | Presentation / Slide / SlideElement scene graph, validation, mutations | `shared`                      |
| `@motion-ppt/animation` | Animation DSL, easing, springs, effect registry, `computeTimeline`     | `shared`, `core`              |
| `@motion-ppt/pptx`      | PptxGenJS writer, OOXML reader, native `<p:timing>` injection          | `shared`, `core`, `animation` |

---

## 🚀 Quick Start

**Prerequisites:** Node.js ≥ 20 · pnpm ≥ 9

```bash
pnpm install
pnpm build       # tsc -b across all packages
pnpm typecheck   # strict, including tests
pnpm test        # 162 unit tests (vitest)
```

### Generate the demo deck

```bash
pnpm --filter @motion-ppt/pptx demo
# -> scratch/demo.pptx          static deck (text, shapes, images, groups)
# -> scratch/demo-animated.pptx same deck with native PowerPoint timings injected
```

---

## 💻 Minimal Example

```ts
import {
  createPresentation,
  createSlide,
  createTextElement,
} from "@motion-ppt/core";
import type { AnimationPlan } from "@motion-ppt/animation";
import { writeAnimatedPresentation } from "@motion-ppt/pptx";

const deck = createPresentation({
  title: "Hello Motion PPT",
  slides: [
    createSlide({
      id: "slide-1",
      elements: [
        createTextElement({
          id: "hero-title",
          transform: { x: 80, y: 200, width: 1120, height: 120 },
          content: {
            text: "Editable animations",
            fontSize: 64,
            bold: true,
            color: "FFFFFF",
          },
        }),
      ],
    }),
  ],
});

const plan: AnimationPlan = {
  slideId: "slide-1",
  version: "2.0",
  animations: [
    {
      id: "title-in",
      target: "hero-title",
      effect: "fadeIn",
      start: 0,
      duration: 0.5,
    },
  ],
};

const { buffer, warnings } = await writeAnimatedPresentation(deck, [plan]);
// `buffer` is a .pptx whose text box animates natively in PowerPoint.
```

---

## 🤝 Team Workflow & CI/CD

- **Branches & PRs:** all PRs target `dev`; `main` receives code only via
  release PRs. Branches: `feature/*`, `fix/*`, `docs/*`, `hotfix/*` —
  see [docs/WORKFLOW.md](./docs/WORKFLOW.md).
- **CI/CD:** typecheck + build + test run on every push/PR to `main` and `dev`
  — see [docs/CI-CD.md](./docs/CI-CD.md) and
  [.github/workflows/ci.yml](./.github/workflows/ci.yml).

---

## 📖 Documentation

| Doc                                                        | Covers                                                 |
| ---------------------------------------------------------- | ------------------------------------------------------ |
| [AGENTS.md](./AGENTS.md)                                   | Master instructions for AI agents working in this repo |
| [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md)             | System design & pipeline specification                 |
| [docs/ANIMATION-DSL-SPEC.md](./docs/ANIMATION-DSL-SPEC.md) | Formal Animation DSL schema                            |
| [docs/TIMING-ENGINE.md](./docs/TIMING-ENGINE.md)           | OOXML timing injection (Tier 2) internals              |
| [docs/TESTING.md](./docs/TESTING.md)                       | Test strategy & coverage                               |
| [docs/WORKFLOW.md](./docs/WORKFLOW.md)                     | Git branching & PR process (target `dev`)              |
| [docs/CI-CD.md](./docs/CI-CD.md)                           | CI/CD & configuration setup                            |
| [docs/DEFINITION-OF-DONE.md](./docs/DEFINITION-OF-DONE.md) | Quality verification checklist                         |
| [docs/MILESTONES.md](./docs/MILESTONES.md)                 | Milestone scope, decisions & status                    |
| [docs/SECURITY.md](./docs/SECURITY.md)                     | Security policy                                        |
| [docs/ADR/](./docs/ADR/)                                   | Architecture Decision Records                          |
| [skills/](./skills/)                                       | Agent skill knowledge base                             |

---

## ⚖️ License

MIT
