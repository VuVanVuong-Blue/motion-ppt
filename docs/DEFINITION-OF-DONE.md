# Definition of Done (DoD) — Motion PPT

A feature, bug fix, or pull request in Motion PPT is considered **DONE** only when all criteria below are fulfilled and verified.

---

## 1. Code Quality & Type Safety
- [ ] Strict TypeScript compiles with 0 errors (pnpm typecheck).
- [ ] No ny types used (unless narrowed with explicit type guards).
- [ ] Package boundary rules strictly respected (e.g. @motion-ppt/core has no Three.js or PPTX dependencies).
- [ ] Errors are strongly typed and inherit from MotionPptError.

## 2. Testing & Verification
- [ ] Unit tests pass for timeline math, easing functions, and effect creators (pnpm test).
- [ ] Integration tests verify PPTX reader/writer roundtrips.
- [ ] Fixture presentation tests exist under examples/ or 	est/fixtures/.

## 3. Editable PowerPoint Validation
- [ ] Generated .pptx file opens cleanly in Microsoft PowerPoint and LibreOffice without repair dialogs.
- [ ] Text elements remain editable text (never rasterized without explicit 3D intent).
- [ ] Shape geometry and card containers remain vector shapes.
- [ ] Native animations trigger properly in PowerPoint Slide Show mode.

## 4. Agent & MCP Integration
- [ ] If a new domain operation was added, it is exposed as an MCP tool with clear JSON schema.
- [ ] Relevant skills/<name>/SKILL.md is updated if new effects or rules were introduced.
