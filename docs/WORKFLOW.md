# Git Branching & Pull Request Workflow

This document defines how the Motion PPT team delivers code. It is the
authoritative process: **all changes land on `dev` first; `main` only ever
receives code through a release PR from `dev`.**

---

## 1. Branch Model

```
main   (production)   <- stable, released, protected
  ▲
  │  release PR (dev -> main) + version tag
  │
dev    (integration)  <- all feature work merges here, protected
  ▲
  │  PR (feature/* -> dev), CI must pass
  │
feature/*  (short-lived branches for new code)
fix/*      (bug fixes)
docs/*     (documentation)
hotfix/*   (urgent production fixes, rare)
```

| Branch | Purpose | Who merges | Deleted after merge |
|---|---|---|---|
| `main` | Production / released code | Release manager via release PR | n/a |
| `dev` | Integration; every PR target | Maintainer (or CI bot) | n/a |
| `feature/*` | New code (milestones, features) | Author opens PR into `dev` | Yes |
| `fix/*` | Bug fixes | Author opens PR into `dev` | Yes |
| `docs/*` | Documentation only | Author opens PR into `dev` | Yes |
| `hotfix/*` | Urgent production fix | Directly to `main`, then cherry-pick to `dev` | Yes |

## 2. Golden Rule

> **Never push commits directly to `main` or `dev`. Never open a PR that
> targets `main` for regular work.** Pull requests target `dev`.

## 3. Standard Flow (feature work)

1. **Sync and branch** (from an up-to-date `dev`):
   ```bash
   git checkout dev
   git pull origin dev
   git checkout -b feature/<short-description>
   ```
2. **Commit often** with clear messages (Conventional Commits preferred):
   ```bash
   git commit -m "feat(animation): add spring easing resolution"
   ```
3. **Verify locally before pushing** (same gates as CI):
   ```bash
   pnpm typecheck && pnpm build && pnpm test
   ```
4. **Push and open a PR into `dev`**:
   ```bash
   git push -u origin feature/<short-description>
   ```
   - Base branch: `dev` (NOT `main`).
   - Title: `M2: <summary>` or `feat(scope): summary`.
   - Body: what/why, test results, any warnings/limitations.
5. **CI must pass** (see [CI-CD.md](./CI-CD.md)) — typecheck, build, and the
   full test suite.
6. **Review**: at least one maintainer approval. The author resolves comments
   with additional commits on the same branch.
7. **Merge into `dev`** with a merge commit (preserves history):
   ```bash
   git checkout dev && git pull origin dev
   git merge --no-ff feature/<short-description>
   git push origin dev
   ```
   Or merge via the GitHub "Merge pull request" button (no squash if history
   of the milestone is wanted; squash is acceptable for small fixes).
8. **Delete the feature branch** after merge.

## 4. Release Flow (`dev` -> `main`)

1. When `dev` is stable, a maintainer opens a **release PR** targeting `main`.
2. CI runs the same gates plus optional release checks.
3. After approval, merge `dev` into `main` (`--no-ff`) and tag the release:
   ```bash
   git checkout main && git pull origin main
   git merge --no-ff dev
   git tag -a v0.1.0 -m "v0.1.0"
   git push origin main --tags
   ```

## 5. Hotfix Flow (urgent production fix)

1. `git checkout -b hotfix/<id> main`
2. Fix, verify, then push the PR **targeting `main`** (the one exception).
3. After merge, sync the fix back into `dev`:
   ```bash
   git checkout dev && git merge main
   ```

## 6. Branch Protection (recommended settings)

- `main`: require PRs (target `dev` only via release PRs), require status
  checks (`typecheck`, `build`, `test`), no direct pushes, require linear
  history optional, require signed commits optional.
- `dev`: require PRs from `feature/*` branches, require status checks, no
  direct pushes.

## 7. Commit Message Conventions

Use [Conventional Commits](https://www.conventionalcommits.org/):

```
feat(animation): add timeline stagger resolution
fix(pptx): normalize text anchor for stable roundtrip
docs(workflow): define dev-branch PR process
chore(core): bump vitest
```

Scopes: `shared`, `core`, `animation`, `pptx`, `docs`, `ci`, `repo`.

## 8. Definition of Done (summary)

See [DEFINITION-OF-DONE.md](./DEFINITION-OF-DONE.md). Before any PR into
`dev`:

- [ ] `pnpm typecheck` passes (0 errors, incl. tests)
- [ ] `pnpm build` passes
- [ ] `pnpm test` passes (all packages)
- [ ] No architectural layer violations (see `AGENTS.md`)
- [ ] Documentation updated if behavior changed