# Testing Strategy — Motion PPT

## 1. Test Pyramid

`	ext
       ▲
      / \     E2E / PowerPoint Visual Validation (Manual & Snapshot)
     /   \    Integration Tests (PPTX Reader/Writer, OOXML Timing Injection)
    /     \   Unit Tests (Timeline math, Easing algorithms, Stagger logic, DSL validation)
   /_______`

---

## 2. Test Suites

### A. Unit Tests (packages/animation, packages/shared, packages/core)
- Easing functions: Verify boundary conditions (0) === 0, (1) === 1, monotonic behavior.
- Timeline & Stagger calculations: Ensure correct absolute start and duration offsets.
- Animation DSL Schema validation: Verify invalid payloads throw InvalidAnimationPlanError.

### B. Integration Tests (packages/pptx)
- PPTX Fixture roundtrip: Open .pptx, read elements, inject animations, save, re-read.
- OOXML XML Assertions: Validate <p:timing>, <p:anim>, and <p:cTn> node structure.

### C. MCP Integration Tests (pps/mcp-server)
- Tool invocation tests: Verify slide.get, element.list, and nimation.apply return valid responses.

---

## 3. Test Commands
`ash
# Run all tests in repository
pnpm test

# Run tests in watch mode for animation package
pnpm --filter @motion-ppt/animation test -- --watch
`
