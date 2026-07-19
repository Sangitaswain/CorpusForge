import type { NodeType } from '../../types/graph';

// Knowledge_Graph_Design_Bible.md NODE-5 / A11Y-1 — every node type is distinguishable by
// shape, not color alone. Geometric shapes only (no icons) since a crisp icon glyph doesn't
// render cleanly at the 6-16px radius these nodes draw at on canvas; icons are reserved for
// DOM chips/badges (COMP-5, a separate, not-yet-implemented Component Rules item).

function roundedRectPath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.lineTo(x + w - r, y);
  ctx.arcTo(x + w, y, x + w, y + r, r);
  ctx.lineTo(x + w, y + h - r);
  ctx.arcTo(x + w, y + h, x + w - r, y + h, r);
  ctx.lineTo(x + r, y + h);
  ctx.arcTo(x, y + h, x, y + h - r, r);
  ctx.lineTo(x, y + r);
  ctx.arcTo(x, y, x + r, y, r);
  ctx.closePath();
}

function diamondPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  ctx.moveTo(cx, cy - r);
  ctx.lineTo(cx + r, cy);
  ctx.lineTo(cx, cy + r);
  ctx.lineTo(cx - r, cy);
  ctx.closePath();
}

function hexagonPath(ctx: CanvasRenderingContext2D, cx: number, cy: number, r: number) {
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const angle = (Math.PI / 3) * i - Math.PI / 2;
    const px = cx + r * Math.cos(angle);
    const py = cy + r * Math.sin(angle);
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}

// One clipped corner (top-right) — echoes the Heat Stamp's own notched shape (IDENT-1/2),
// since a work order is exactly the kind of record that identity element models.
function notchedSquarePath(ctx: CanvasRenderingContext2D, x: number, y: number, w: number, h: number, notch: number) {
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.lineTo(x + w - notch, y);
  ctx.lineTo(x + w, y + notch);
  ctx.lineTo(x + w, y + h);
  ctx.lineTo(x, y + h);
  ctx.closePath();
}

type ShapeTracer = (ctx: CanvasRenderingContext2D, x: number, y: number, r: number) => void;

const TRACERS: Record<NodeType, ShapeTracer> = {
  // Person — the one organic shape; every other type reads as asset/document/record, not social.
  person: (ctx, x, y, r) => {
    ctx.beginPath();
    ctx.arc(x, y, r, 0, 2 * Math.PI);
  },
  // Equipment — a fixed physical asset. Rounded square.
  equipment: (ctx, x, y, r) => {
    const s = r * 1.7;
    roundedRectPath(ctx, x - s / 2, y - s / 2, s, s, s * 0.28);
  },
  // Incident — the hazard-placard diamond, already legible industrial vocabulary.
  incident: (ctx, x, y, r) => diamondPath(ctx, x, y, r * 1.15),
  // Procedure — an SOP binder tab: a wide, low rounded rectangle.
  procedure: (ctx, x, y, r) => {
    const w = r * 2.2;
    const h = r * 1.3;
    roundedRectPath(ctx, x - w / 2, y - h / 2, w, h, h * 0.45);
  },
  // Regulation — reads as seal/standard without a cliché gavel icon.
  regulation: (ctx, x, y, r) => hexagonPath(ctx, x, y, r * 1.05),
  // Work Order — a notched tab, echoing the Heat Stamp corner.
  work_order: (ctx, x, y, r) => {
    const s = r * 1.7;
    notchedSquarePath(ctx, x - s / 2, y - s / 2, s, s, s * 0.32);
  },
  // Date — a small mono tick, rarely a node worth lingering on (Coordinate Rail is its real home).
  date: (ctx, x, y, r) => {
    const w = Math.max(r * 0.5, 2);
    const h = r * 1.5;
    ctx.beginPath();
    ctx.rect(x - w / 2, y - h / 2, w, h);
  },
  // Parameter — a small diamond-tick, distinct from both Date and the larger Incident diamond.
  parameter: (ctx, x, y, r) => diamondPath(ctx, x, y, r * 0.75),
  // Other — a defensive fallback for an unexpected entity_type, not a real category. Plain
  // square (sharp corners), deliberately undecorated.
  other: (ctx, x, y, r) => {
    const s = r * 1.5;
    ctx.beginPath();
    ctx.rect(x - s / 2, y - s / 2, s, s);
  },
};

export function traceNodeShape(ctx: CanvasRenderingContext2D, type: NodeType, x: number, y: number, radius: number) {
  (TRACERS[type] ?? TRACERS.other)(ctx, x, y, radius);
}
