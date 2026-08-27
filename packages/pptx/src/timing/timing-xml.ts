/**
 * Tier 2 (ADR 0002): generation of the OOXML <p:timing> node graph.
 *
 * The DSL timeline is compiled into a PowerPoint-native timing tree:
 *
 *   p:timing > p:tnLst > p:par > cTn(tmRoot) > p:seq(mainSeq)
 *     > per-animation p:par (stCondLst delay = absolute start in ms)
 *       > p:par > behavior (p:animEffect / p:animMotion / p:animScale /
 *         p:animRot) targeting the shape via <p:spTgt spid="..."/>.
 *
 * Absolute start times map directly to the cumulative delays PowerPoint uses
 * for "after previous" sequencing, so staggered DSL timelines translate
 * 1:1 into native timings.
 */

export type TimingDirection = 'left' | 'right' | 'top' | 'bottom';

export interface TimingBehaviorContext {
  /** OOXML shape id (cNvPr id) of the target. */
  spid: number;
  /** Duration in milliseconds. */
  durationMs: number;
  /** cTn id for the behavior node (must be unique across the tree). */
  behaviorId: number;
  direction?: TimingDirection;
  /** Motion path override used by movePath. */
  customPath?: string;
}

export interface TimingNode {
  effect: string;
  spid: number;
  /** Absolute start delay in milliseconds. */
  delayMs: number;
  durationMs: number;
  direction?: TimingDirection;
  customPath?: string;
}

function esc(value: string | number): string {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

/** Relative offsets as fractions of the shape size (pathEditMode="relative"). */
const DIRECTION_OFFSET: Record<TimingDirection, { x: number; y: number }> = {
  left: { x: -1, y: 0 },
  right: { x: 1, y: 0 },
  top: { x: 0, y: -1 },
  bottom: { x: 0, y: 1 },
};

function cBhvr(ctx: TimingBehaviorContext): string {
  return (
    `<p:cBhvr><p:cTn id="${ctx.behaviorId}" dur="${ctx.durationMs}"/>` +
    `<p:tgtEl><p:spTgt spid="${ctx.spid}"/></p:tgtEl></p:cBhvr>`
  );
}

function animEffect(filter: string, transition: 'in' | 'out', ctx: TimingBehaviorContext): string {
  return `<p:animEffect transition="${transition}" filter="${esc(filter)}">${cBhvr(ctx)}</p:animEffect>`;
}

function animMotionPath(path: string, ctx: TimingBehaviorContext): string {
  return `<p:animMotion origin="parent" pathEditMode="relative" path="${esc(path)}">${cBhvr(ctx)}</p:animMotion>`;
}

function animScale(
  ctx: TimingBehaviorContext,
  from?: { x: number; y: number },
  to?: { x: number; y: number },
  by?: { x: number; y: number },
): string {
  const parts: string[] = [cBhvr(ctx)];
  if (by) parts.push(`<p:by x="${by.x}" y="${by.y}"/>`);
  if (from) parts.push(`<p:from x="${from.x}" y="${from.y}"/>`);
  if (to) parts.push(`<p:to x="${to.x}" y="${to.y}"/>`);
  return `<p:animScale>${parts.join('')}</p:animScale>`;
}

function animRot(by: number, ctx: TimingBehaviorContext): string {
  return `<p:animRot by="${by}">${cBhvr(ctx)}</p:animRot>`;
}

const BEHAVIOR_BUILDERS: Record<string, (ctx: TimingBehaviorContext) => string> = {
  fadeIn: (ctx) => animEffect('fade', 'in', ctx),
  fadeOut: (ctx) => animEffect('fade', 'out', ctx),
  flash: (ctx) => animEffect('flash', 'in', ctx),
  slideIn: (ctx) => {
    const o = DIRECTION_OFFSET[ctx.direction ?? 'bottom'];
    return animMotionPath(`M ${o.x} ${o.y} L 0 0`, ctx);
  },
  slideOut: (ctx) => {
    const o = DIRECTION_OFFSET[ctx.direction ?? 'bottom'];
    return animMotionPath(`M 0 0 L ${o.x} ${o.y}`, ctx);
  },
  zoomIn: (ctx) => animScale(ctx, { x: 0, y: 0 }, { x: 100000, y: 100000 }),
  zoomOut: (ctx) => animScale(ctx, { x: 100000, y: 100000 }, { x: 0, y: 0 }),
  pulse: (ctx) => animScale(ctx, undefined, undefined, { x: 15000, y: 15000 }),
  spin: (ctx) => animRot(21600000, ctx),
  movePath: (ctx) => (ctx.customPath ? animMotionPath(ctx.customPath, ctx) : ''),
  // staggerIn is orchestrated as sequential fade entrances in the timing tree.
  staggerIn: (ctx) => animEffect('fade', 'in', ctx),
};

/** Returns true when the effect has a native behavior mapping (possibly conditional). */
export function hasNativeMapping(effect: string): boolean {
  return Object.prototype.hasOwnProperty.call(BEHAVIOR_BUILDERS, effect);
}

/**
 * Builds the behavior node for an effect, or `undefined` when the effect has
 * no native representation in the M3 mapper.
 */
export function buildBehavior(effect: string, ctx: TimingBehaviorContext): string | undefined {
  const builder = BEHAVIOR_BUILDERS[effect];
  if (!builder) return undefined;
  const xml = builder(ctx);
  return xml.length > 0 ? xml : undefined;
}

/**
 * Builds a complete <p:timing> tree for animations already sorted by start
 * time. Returns an empty string when nothing can be emitted.
 */
export function buildTimingXml(animations: readonly TimingNode[]): string {
  let id = 3; // 1 = tmRoot, 2 = mainSeq
  const parts: string[] = [];
  for (const anim of animations) {
    const outerId = id++;
    const innerId = id++;
    const behaviorId = id++;
    const behavior = buildBehavior(anim.effect, {
      spid: anim.spid,
      durationMs: anim.durationMs,
      behaviorId,
      direction: anim.direction,
      customPath: anim.customPath,
    });
    if (!behavior) continue;
    parts.push(
      '<p:par><p:cTn id="' + outerId + '" fill="hold">' +
        '<p:stCondLst><p:cond delay="' + anim.delayMs + '"/></p:stCondLst>' +
        '<p:childTnLst><p:par><p:cTn id="' + innerId + '" fill="hold">' +
        '<p:stCondLst><p:cond delay="0"/></p:stCondLst>' +
        '<p:childTnLst>' + behavior + '</p:childTnLst>' +
        '</p:cTn></p:par></p:childTnLst></p:cTn></p:par>',
    );
  }
  if (parts.length === 0) return '';
  return (
    '<p:timing><p:tnLst><p:par><p:cTn id="1" dur="indefinite" restart="never" nodeType="tmRoot">' +
    '<p:childTnLst><p:seq concurrent="1" nextAc="seek">' +
    '<p:cTn id="2" dur="indefinite" nodeType="mainSeq">' +
    '<p:childTnLst>' + parts.join('') + '</p:childTnLst>' +
    '</p:cTn>' +
    '<p:prevCondLst><p:cond evt="onPrev" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:prevCondLst>' +
    '<p:nextCondLst><p:cond evt="onNext" delay="0"><p:tgtEl><p:sldTgt/></p:tgtEl></p:cond></p:nextCondLst>' +
    '</p:seq></p:childTnLst></p:cTn></p:par></p:tnLst></p:timing>'
  );
}