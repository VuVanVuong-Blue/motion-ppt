# OOXML Timing Engine (Tier 2)

Tier 2 of the hybrid PPTX engine (ADR 0002): compiles an AnimationPlan into a
native PowerPoint `<p:timing>` node graph and injects it into the slide XML of
a .pptx produced by the Tier 1 writer.

## Pipeline

```
AnimationPlan (DSL, per slide)
   │  computeTimeline()  [@motion-ppt/animation]
   ▼
ResolvedAnimation[]  (absolute start/end, easing, strategy)
   │  TimingInjector.inject(buffer, presentation, plans)
   ▼
slide XML + <p:timing> (p:animEffect / p:animMotion / p:animScale / p:animRot)
```

## Timing Tree Structure

```
<p:timing>
  <p:tnLst><p:par>
    <p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">
      <p:childTnLst><p:seq concurrent="1" nextAc="seek">
        <p:cTn id="2" dur="indefinite" nodeType="mainSeq">
          <p:childTnLst>
            <p:par><p:cTn id="N" fill="hold">
              <p:stCondLst><p:cond delay="{startMs}"/></p:stCondLst>
              <p:childTnLst><p:par><p:cTn id="N+1" fill="hold">
                <p:stCondLst><p:cond delay="0"/></p:stCondLst>
                <p:childTnLst>
                  { behavior: p:animEffect | p:animMotion | p:animScale | p:animRot }
                  <p:cBhvr><p:cTn id="N+2" dur="{durationMs}"/>
                    <p:tgtEl><p:spTgt spid="{shapeId}"/></p:tgtEl></p:cBhvr>
                </p:childTnLst>
              </p:cTn></p:par></p:childTnLst>
            </p:cTn></p:par>
          </p:childTnLst>
        </p:cTn>
        <p:prevCondLst>/<p:nextCondLst> (click navigation, fixed boilerplate)
      </p:seq></p:childTnLst>
    </p:cTn>
  </p:par></p:tnLst>
</p:timing>
```

Key semantics:

- **Absolute DSL start times map 1:1 to PowerPoint's cumulative "after
  previous" delays** (delay in milliseconds on the outer `stCondLst`). A
  staggered `targets: [a, b, c]` with `stagger.delay = 0.06` becomes three
  sequential native animations at 0 ms / 60 ms / 120 ms.
- Animations start automatically when the slide is displayed (first delay is
  the plan's absolute start; `0` = immediate). Click-triggered playback is a
  future extension (`delay="indefinite"`).
- `<p:spTgt spid>` is resolved **positionally**: the writer emits elements in
  flattened z-order (see `flattenSlideElements`), which matches the document
  order of `p:sp` / `p:pic` in the slide XML. If the counts diverge, the slide
  is skipped with a warning instead of emitting wrong targets.
- `cTn` ids are unique across the whole tree (1 = tmRoot, 2 = mainSeq, then
  3, 4, 5 … per animation).

## Effect Mapping

| DSL effect | OOXML behavior | Notes |
|---|---|---|
| `fadeIn` / `fadeOut` | `<p:animEffect transition="in\|out" filter="fade">` | |
| `flash` | `<p:animEffect transition="in" filter="flash">` | Emphasis flash |
| `slideIn` | `<p:animMotion origin="parent" pathEditMode="relative" path="M -dx -dy L 0 0">` | Direction from `options.direction`; path units are fractions of the shape size |
| `slideOut` | `<p:animMotion origin="parent" pathEditMode="relative" path="M 0 0 L -dx -dy">` | |
| `zoomIn` | `<p:animScale>` with `from 0%` → `to 100%` | Percentages in 1000ths of a percent (100% = 100000) |
| `zoomOut` | `<p:animScale>` with `from 100%` → `to 0%` | |
| `pulse` | `<p:animScale>` with `by` 15% | Single grow step (no return swing) |
| `spin` | `<p:animRot by="21600000">` | 360° in 60000ths of a degree |
| `movePath` | `<p:animMotion path="...">` | Path taken from `options.customProperties.path` |
| `staggerIn` | Orchestrated sequential `fadeIn` per target | One native entry per target |

Effects without a native mapping (`riseIn`, `wiggle`, `bounce`, `morph`) are
**skipped with a warning**; they remain available to the canvas/three renderers
in later milestones.

## Strategy Filtering

Only animations whose resolved strategy is `native` or `composite` are
injected. Plans requesting `generatedAsset` / `renderedAsset` are skipped with
a warning (they require the graphics/video milestones).

## Public API

- `new TimingInjector().inject(buffer, presentation, plans)` → `{ buffer,
  warnings, injectedSlides }` — post-processes a writer-produced .pptx.
- `writeAnimatedPresentation(presentation, plans, options?)` — facade that
  writes + injects in one call.
- `buildTimingXml(entries)` / `buildBehavior(effect, ctx)` /
  `hasNativeMapping(effect)` — low-level builders for custom pipelines.
- `flattenSlideElements(slide, assets, warnings)` — shared writer/injector
  emission order (also useful for agents inspecting z-order).

## Known Limitations (M3)

- **Not validated in real PowerPoint/LibreOffice yet**: structural and
  schema-order checks pass, and `demo-animated.pptx` re-reads cleanly, but a
  manual slide-show check on an installed PowerPoint is still recommended
  (see `docs/DEFINITION-OF-DONE.md`).
- Motion paths are **relative** (fractions of the shape size); pixel-exact
  `distance` values are not expressible in this mode.
- No click-triggered sequencing; the whole timeline auto-plays on slide entry.
- `pulse` is a one-directional scale; true pulse (scale up and back) needs a
  composite (multi-behavior) timeline — future work.
- Parallel ("with previous") groupings render as same-delay siblings; visually
  equivalent but not the canonical PowerPoint parallel container.