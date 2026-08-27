# CI/CD & Configuration Setup

Continuous integration for Motion PPT runs the same quality gates the team
runs locally. This document describes the toolchain, the CI pipeline, and the
repository configuration files.

---

## 1. Toolchain & Versions

| Tool | Version | Where pinned |
|---|---|---|
| Node.js | >= 20 (CI uses 20.x LTS) | `package.json` `engines` |
| pnpm | 9.15.0 | `package.json` `packageManager` + `pnpm/action-setup` |
| TypeScript | 5.x (strict) | root `devDependencies`, `tsconfig.base.json` |
| Turbo | 2.x | root `devDependencies`, `turbo.json` |
| Vitest | 3.x | per-package `devDependencies` |
| PptxGenJS / jszip / fast-xml-parser | pinned ranges | `packages/pptx` |

## 2. Repository Configuration Files

| File | Role |
|---|---|
| `package.json` (root) | Workspace scripts (`build`, `typecheck`, `test`, `clean`) delegating to turbo |
| `pnpm-workspace.yaml` | Workspace membership: `apps/*`, `packages/*` |
| `pnpm-lock.yaml` | Lockfile — CI installs with `--frozen-lockfile` |
| `turbo.json` | Task graph: `build` before `typecheck`/`test`; caching outputs |
| `tsconfig.base.json` | Strict compiler defaults shared by every package |
| `packages/*/tsconfig.json` | Per-package composite build config (NodeNext ESM) |
| `packages/*/tsconfig.test.json` | Typecheck of test files (`tsc --noEmit`) |
| `.github/workflows/ci.yml` | CI pipeline (below) |
| `.gitattributes` | LF line endings, binary detection |

## 3. Local Commands (identical to CI gates)

```bash
pnpm install                 # install all workspace packages
pnpm typecheck               # strict typecheck incl. test files (turbo)
pnpm build                   # tsc -b composite builds, ordered by deps
pnpm test                    # vitest run in every package (turbo)
pnpm --filter @motion-ppt/pptx demo   # generate scratch/demo.pptx
```

## 4. CI Pipeline (`.github/workflows/ci.yml`)

Triggered on:
- pushes to `main` and `dev`,
- pull requests **targeting `main` or `dev`** (i.e., all feature PRs).

Job `build-test` (ubuntu-latest):
1. `actions/checkout@v4`
2. `pnpm/action-setup@v4` — installs the pinned pnpm from `packageManager`
3. `actions/setup-node@v4` — Node 20, `cache: pnpm`
4. `pnpm install --frozen-lockfile`
5. `pnpm typecheck` — 0 errors
6. `pnpm build` — all packages compile
7. `pnpm test` — all test suites pass

The pipeline fails the PR if any step fails, so a green check on `dev` means
the Definition of Done gates passed.

## 5. Quality Gates

| Gate | Command | Fails on |
|---|---|---|
| Type safety | `pnpm typecheck` | any TS error, incl. test files, no `any` leaks |
| Compilation | `pnpm build` | any package failing to emit |
| Tests | `pnpm test` | any failing unit/integration test |
| Lockfile | `pnpm install --frozen-lockfile` | lockfile out of date with `package.json` |

## 6. Extending CI

- **Add a lint step** (optional): add a `lint` script per package and register
  the task in `turbo.json`, then add `pnpm lint` to the workflow.
- **Add release automation**: extend the workflow with a `release` job
  triggered on tags (`v*`) that runs `pnpm build` and attaches
  `scratch/demo.pptx` or publishes packages to a registry.
- **Add a PowerPoint smoke check** (recommended later): run the roundtrip +
  zip-validity tests on generated artifacts before merging to `main`.

## 7. Local Environment Notes

- The repository must be checked out on a filesystem that supports junctions
  (pnpm on Windows needs them for workspace linking). The team workspace uses
  the `V:` volume; builds on sandboxed drives (e.g. `D:` overlay) fail with
  `ENOENT` during `pnpm install`.
- PowerShell 5.1 `Set-Content` writes UTF-8 **with BOM** and reads files with
  the ANSI codepage by default; prefer `.NET` file APIs or an editor that
  writes UTF-8 without BOM when editing source files.