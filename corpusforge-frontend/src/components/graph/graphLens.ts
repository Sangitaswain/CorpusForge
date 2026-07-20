import type { GraphLink, GraphNode, NodeType } from '../../types/graph';
import { nodeTypeOf } from '../../utils/constants';

// Knowledge_Graph_Design_Bible.md GB-1 — the canvas is polymorphic: one of four lenses,
// chosen automatically by the focused entity's type, never by a manual chart-picker.
// GB-3/NEVER-10 carve Work Order out entirely (see GraphPage's compact evidence panel —
// this module is never consulted for that focus type).
export type Lens = 'radial' | 'timeline' | 'dag' | 'root-cause';

const LENS_BY_TYPE: Partial<Record<NodeType, Lens>> = {
  equipment: 'radial',
  person: 'radial',
  incident: 'timeline',
  regulation: 'dag',
  procedure: 'dag',
  // AI Finding (NODE-3) is a legitimate future node type, Phase 3, not before — wiring its
  // lens now means routing doesn't need to change again once it exists.
  // ai_finding: 'root-cause',
};

export function lensForType(type: NodeType): Lens {
  return LENS_BY_TYPE[type] ?? 'radial';
}

export interface LensPosition {
  x: number;
  y: number;
}

const TAU = Math.PI * 2;
// Graph-space units (not pixels) — matches the link distance the canvas previously asked
// the physics engine for, so node spacing doesn't visually jump when lenses replace it.
const RING_RADIUS = 90;
const STRIP_SPACING = 70;
const LANE_SPACING = 46;
const DAG_LAYER_SPACING = 110;
const DAG_ROW_SPACING = 56;

// GB-1/GB-2 — every lens is computed here, in graph-space coordinates centered on the
// Anvil Point at (0, 0). Composition (VH-4's ~40%-from-left placement) is a camera offset
// applied by GraphCanvas, not baked into these coordinates, so layout math stays independent
// of canvas size and of whether the Investigation Panel is currently open beside it.
export function computeLensLayout(
  lens: Lens,
  focusId: string,
  nodes: GraphNode[],
  links: GraphLink[],
): Map<string, LensPosition> {
  switch (lens) {
    case 'timeline':
      return timelineLayout(focusId, nodes);
    case 'dag':
    case 'root-cause':
      return dagLayout(focusId, nodes, links);
    case 'radial':
    default:
      return radialLayout(focusId, nodes);
  }
}

function radialLayout(focusId: string, nodes: GraphNode[]): Map<string, LensPosition> {
  const positions = new Map<string, LensPosition>();
  positions.set(focusId, { x: 0, y: 0 });
  const others = nodes.filter((n) => n.id !== focusId);
  others.forEach((n, i) => {
    const angle = (TAU * i) / Math.max(others.length, 1) - Math.PI / 2;
    positions.set(n.id, {
      x: RING_RADIUS * Math.cos(angle),
      y: RING_RADIUS * Math.sin(angle),
    });
  });
  return positions;
}

const COMPONENT_GAP = 240;
const MAX_ROW_WIDTH = COMPONENT_GAP * 4;
// Isolated nodes (no co-occurrence edges — e.g. `parameter` entities, see COOCCURRENCE_RULES)
// carry none of a real cluster's visual weight and don't need cluster-sized breathing room;
// packing them densely keeps a corpus with many singletons from ballooning the bounding box
// zoomToFit has to fit everything into, which would zoom real clusters down to illegibility.
const SINGLETON_SPACING = 40;
const SINGLETON_ROW_WIDTH = MAX_ROW_WIDTH * 0.6;

function groupIntoComponents(nodes: GraphNode[], links: GraphLink[]) {
  const byId = new Map(nodes.map((n) => [n.id, n]));
  const neighborsOf = new Map<string, Set<string>>();
  const addEdge = (a: string, b: string) => {
    if (!neighborsOf.has(a)) neighborsOf.set(a, new Set());
    neighborsOf.get(a)!.add(b);
  };
  links.forEach((l) => {
    addEdge(l.source, l.target);
    addEdge(l.target, l.source);
  });

  const visited = new Set<string>();
  const components: GraphNode[][] = [];
  nodes.forEach((start) => {
    if (visited.has(start.id)) return;
    const component: GraphNode[] = [];
    const queue = [start.id];
    visited.add(start.id);
    while (queue.length) {
      const id = queue.shift()!;
      const node = byId.get(id);
      if (node) component.push(node);
      for (const next of neighborsOf.get(id) ?? []) {
        if (!visited.has(next)) {
          visited.add(next);
          queue.push(next);
        }
      }
    }
    components.push(component);
  });
  return { components, neighborsOf };
}

// GB-2/GB-4 — "no node on this canvas is ever undirected-force-placed" applies here too:
// IA-3's full-graph browse has no single Anvil Point to anchor a lens on, but every node
// still gets a deliberate, computed position, never left to the physics engine. Each
// connected component (size > 1) gets its own small radial layout (local anchor = its
// highest-degree member) and is packed into a grid; isolated nodes are packed separately,
// densely, below the real clusters (see SINGLETON_SPACING).
export function computeBrowseAllLayout(nodes: GraphNode[], links: GraphLink[]): Map<string, LensPosition> {
  const { components, neighborsOf } = groupIntoComponents(nodes, links);
  const clusters = components.filter((c) => c.length > 1).sort((a, b) => b.length - a.length);
  const singletons = components.filter((c) => c.length === 1).map((c) => c[0]);

  const positions = new Map<string, LensPosition>();
  let cursorX = 0;
  let cursorY = 0;
  let rowHeight = 0;
  clusters.forEach((component) => {
    const localAnchor = component.reduce((best, n) => {
      const degree = neighborsOf.get(n.id)?.size ?? 0;
      const bestDegree = neighborsOf.get(best.id)?.size ?? 0;
      return degree > bestDegree ? n : best;
    }, component[0]);
    const local = radialLayout(localAnchor.id, component);
    const span = RING_RADIUS * 2;

    if (cursorX + span > MAX_ROW_WIDTH) {
      cursorX = 0;
      cursorY += rowHeight + COMPONENT_GAP;
      rowHeight = 0;
    }
    const offsetX = cursorX + span / 2;
    const offsetY = cursorY;
    component.forEach((n) => {
      const p = local.get(n.id)!;
      positions.set(n.id, { x: p.x + offsetX, y: p.y + offsetY });
    });
    cursorX += span + COMPONENT_GAP;
    rowHeight = Math.max(rowHeight, span);
  });

  if (singletons.length > 0) {
    let singletonY = clusters.length > 0 ? cursorY + rowHeight + COMPONENT_GAP : 0;
    let singletonX = 0;
    let singletonRowHeight = 0;
    singletons.forEach((n) => {
      if (singletonX + SINGLETON_SPACING > SINGLETON_ROW_WIDTH) {
        singletonX = 0;
        singletonY += singletonRowHeight + SINGLETON_SPACING;
        singletonRowHeight = 0;
      }
      positions.set(n.id, { x: singletonX, y: singletonY });
      singletonX += SINGLETON_SPACING;
      singletonRowHeight = SINGLETON_SPACING;
    });
  }
  return positions;
}

// Chronological strip, most recent (or only known) first, focus anchored at the left edge.
// Honest limitation: co-occurrence edges today never connect a `date` entity to anything
// (NODE-4 — dates live in the Coordinate Rail, PANEL-8, not yet wired into edges), so there
// is no real timestamp on these neighbors to sort by yet. Ordering by document_count (most
// evidenced first) is a neutral, non-fabricated stand-in for true chronology — the layout
// SHAPE (a strip, not a ring) is what GB-1 requires now; refine the ordering itself once
// PANEL-8 exposes real co-occurring dates per neighbor.
function timelineLayout(focusId: string, nodes: GraphNode[]): Map<string, LensPosition> {
  const positions = new Map<string, LensPosition>();
  positions.set(focusId, { x: 0, y: 0 });
  const others = nodes
    .filter((n) => n.id !== focusId)
    .sort((a, b) => b.document_count - a.document_count || a.name.localeCompare(b.name));
  // Lane per node type keeps the strip from becoming one overlapping horizontal line.
  const lanes = new Map<NodeType, number>();
  others.forEach((n) => {
    const type = nodeTypeOf(n.type);
    if (!lanes.has(type)) lanes.set(type, lanes.size);
  });
  others.forEach((n, i) => {
    const lane = lanes.get(nodeTypeOf(n.type)) ?? 0;
    const laneCount = Math.max(lanes.size, 1);
    positions.set(n.id, {
      x: STRIP_SPACING * (i + 1),
      y: LANE_SPACING * (lane - (laneCount - 1) / 2),
    });
  });
  return positions;
}

// Layered by hop direction from the focus — predecessors (upstream) to the left, successors
// (downstream) to the right — reading like a P&ID dependency chain (IBP-4), not a tree grown
// from an arbitrary root.
function dagLayout(focusId: string, nodes: GraphNode[], links: GraphLink[]): Map<string, LensPosition> {
  const positions = new Map<string, LensPosition>();
  const layer = new Map<string, number>();
  layer.set(focusId, 0);

  const successors = new Map<string, string[]>();
  const predecessors = new Map<string, string[]>();
  links.forEach((l) => {
    (successors.get(l.source) ?? successors.set(l.source, []).get(l.source)!).push(l.target);
    (predecessors.get(l.target) ?? predecessors.set(l.target, []).get(l.target)!).push(l.source);
  });

  const queue = [focusId];
  while (queue.length) {
    const id = queue.shift()!;
    const depth = layer.get(id)!;
    for (const next of successors.get(id) ?? []) {
      if (!layer.has(next)) {
        layer.set(next, depth + 1);
        queue.push(next);
      }
    }
    for (const prev of predecessors.get(id) ?? []) {
      if (!layer.has(prev)) {
        layer.set(prev, depth - 1);
        queue.push(prev);
      }
    }
  }

  const byLayer = new Map<number, string[]>();
  nodes.forEach((n) => {
    const depth = layer.get(n.id) ?? 0; // unreached node (shouldn't happen in an ego graph) — center column
    if (!byLayer.has(depth)) byLayer.set(depth, []);
    byLayer.get(depth)!.push(n.id);
  });

  byLayer.forEach((ids, depth) => {
    ids.forEach((id, i) => {
      positions.set(id, {
        x: depth * DAG_LAYER_SPACING,
        y: DAG_ROW_SPACING * (i - (ids.length - 1) / 2),
      });
    });
  });
  return positions;
}
