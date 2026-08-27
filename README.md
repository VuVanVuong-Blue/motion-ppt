# Motion PPT — AI Presentation Animation Engine

> **Editable-first, AI-native, renderer-independent presentation animation engine.**

Motion PPT empowers AI Coding Agents to inspect existing PowerPoint presentations, interpret natural language animation instructions, devise optimal animation plans via specialized Skills, and produce native, editable .pptx files with smooth visual effects.

---

## 🏗 Architecture Overview

` ext
User Prompt
 ↓
AI Coding Agent (Antigravity, Claude Code, Cursor, Windsurf)
 ↓
Skills (Presentation Design, Text, Image, Card, Cinematic)
 ↓
Intent Understanding & Animation Planner
 ↓
Animation DSL (JSON-serializable, declarative timeline)
 ↓
Animation Engine & Effect Registry (Strategy Resolver)
 ↓
┌────────────────────────────────────────────────────────┐
│ Renderers │
│ ├─ PptxRenderer (Native / Composite OOXML Timings) │
│ ├─ CanvasRenderer (2D Filtered Assets) │
│ └─ ThreeRenderer (3D / Particles / Shaders → Video) │
└────────────────────────────────────────────────────────┘
 ↓
MCP Server (High-level tool interface for Agents)
 ↓
Output (.pptx presentation with fully editable elements)
`

---

## 📦 Monorepo Structure

` ext
motion-ppt/
├── apps/
│ ├── web/ # Next.js UI for preview and prompt interaction
│ ├── mcp-server/ # Model Context Protocol (MCP) server for Agents
│ └── worker/ # Background worker for heavy rendering & video jobs
│
├── packages/
│ ├── shared/ # Common types, errors, math & constants
│ ├── core/ # Scene graph, Presentation, Slide & Element domain models
│ ├── animation/ # Animation DSL, Timeline, Easing, Effect Registry
│ ├── pptx/ # PptxGenJS reader/writer & OOXML Timing Patch Engine
│ ├── graphics/ # Canvas & Three.js visual effect renderers
│ └── video/ # FFmpeg frame extraction & scene motion analyzer
│
├── skills/ # Standardized Agent Skills (SKILL.md)
├── docs/ # Architecture specs, DSL schemas, ADRs & DoD
└── AGENTS.md # Master rules for AI Agents
`

---

## 🚀 Quick Start

### Prerequisites
- Node.js >= 20.0.0
- pnpm >= 9.0.0

### Installation
```bash
pnpm install
```

### Build & Test
```bash
pnpm build
pnpm test
pnpm typecheck
```

### Generate the demo deck
```bash
pnpm --filter @motion-ppt/pptx demo
# -> writes scratch/demo.pptx (open it in PowerPoint)
```

---

## 📈 Milestone Status

- **M1 (done)** — Monorepo packages (`@motion-ppt/shared`, `@motion-ppt/core`,
  `@motion-ppt/pptx`), pure domain model (Presentation/Slide/SlideElement),
  Tier 1 PPTX writer & reader (PptxGenJS roundtrip). See
  [docs/MILESTONES.md](./docs/MILESTONES.md) for scope, decisions and known
  limitations.
- **M2 (done)** — `@motion-ppt/animation`: Animation DSL validation, easing &
  spring physics, effect registry with capability flags, timeline & stagger
  math (72 tests).
- **M3+ (planned)** — PPTX OOXML timing injection (native animations),
  graphics/video renderers, MCP server.

## 🛠 Team Process

- **Git workflow**: all PRs target the `dev` branch; `main` only receives
  code via release PRs — see [docs/WORKFLOW.md](./docs/WORKFLOW.md).
- **CI/CD**: typecheck + build + test gates on every PR/push —
  see [docs/CI-CD.md](./docs/CI-CD.md) and `.github/workflows/ci.yml`.

---

## 📖 Key Documentation
- [AGENTS.md](./AGENTS.md) — Master instructions for AI Agents
- [docs/ARCHITECTURE.md](./docs/ARCHITECTURE.md) — System design & pipeline specification
- [docs/ANIMATION-DSL-SPEC.md](./docs/ANIMATION-DSL-SPEC.md) — Formal Animation DSL schema
- [docs/DEFINITION-OF-DONE.md](./docs/DEFINITION-OF-DONE.md) — Quality verification checklist
- [docs/WORKFLOW.md](./docs/WORKFLOW.md) — Git branching & PR process (target `dev`)
- [docs/CI-CD.md](./docs/CI-CD.md) — CI/CD & configuration setup
- [docs/TIMING-ENGINE.md](./docs/TIMING-ENGINE.md) — OOXML timing injection (Tier 2)
- [docs/MILESTONES.md](./docs/MILESTONES.md) — Milestone scope & status
- [skills/](./skills/) — Skill knowledge base for Agents

---

## ⚖️ License
MIT
