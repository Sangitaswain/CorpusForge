import { useEffect, useMemo, useRef, useState } from 'react';
import type { KeyboardEvent as ReactKeyboardEvent, MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import type { GraphData, GraphLink, GraphNode } from '../../types/graph';
import { NODE_COLORS, nodeTypeOf } from '../../utils/constants';
import { traceNodeShape } from './nodeShapes';
import { computeBrowseAllLayout, computeLensLayout, lensForType, type Lens } from './graphLens';
import NodeContextCard from './NodeContextCard';
import { useTheme } from '../../hooks/useTheme';

interface GraphCanvasProps {
  data: GraphData;
  onSelectNode: (node: GraphNode) => void;
  onExpandNode: (node: GraphNode) => void;
  focusNodeId?: string;
  width: number;
  height: number;
  selectedNodeId?: string | null;
  graphRef: MutableRefObject<ForceGraphMethods | undefined>;
}

type CanvasNode = NodeObject & GraphNode;

// Mirrors the light/dark tokens in index.css — canvas drawing needs actual
// color values, not Tailwind classes, so these can't be theme-reactive via CSS.
const CANVAS_PALETTE = {
  light: { background: '#FFFFFF', link: '#C5DDD7', label: '#0B1F1C', interactive: '#2159A6' },
  dark: { background: '#070E0D', link: '#2D5248', label: '#E8F0EE', interactive: '#6CA0E0' },
};

// Below this zoom level, node labels are hidden to keep an unfocused graph
// readable — only the selected node's label always shows.
const LABEL_ZOOM_THRESHOLD = 1.5;

// COMP-11 — replaces the library-default `zoomToFit` composition strategy with a
// deliberate, fixed zoom per lens (VH-4): framing is a design decision, not a function of
// whatever bounding box this particular ego-network happens to produce.
const LENS_ZOOM: Record<Lens, number> = { radial: 3.1, timeline: 2.4, dag: 2.2, 'root-cause': 2.2 };

// MOTION-1 — structural change (new focus, lens switch, expand) is one eased settle, the
// app's "Deliberate" tier, ~300ms.
const STRUCTURAL_SETTLE_MS = 300;

function easeOutCubic(t: number) {
  return 1 - Math.pow(1 - t, 3);
}

export default function GraphCanvas({
  data,
  onSelectNode,
  onExpandNode,
  focusNodeId,
  width,
  height,
  selectedNodeId,
  graphRef,
}: GraphCanvasProps) {
  const { theme } = useTheme();
  const palette = CANVAS_PALETTE[theme];

  const [contextTarget, setContextTarget] = useState<{ node: CanvasNode; x: number; y: number } | null>(null);

  // A11Y-2/COMP-3 — a roving-tabindex model: the canvas is a single tab stop, and once
  // focused, arrow keys move a keyboard focus ring between nodes (independent of mouse
  // selection). Cleared on blur so the ring never lingers after focus moves elsewhere.
  const [focusedNodeId, setFocusedNodeId] = useState<string | null>(null);

  // GB-1 — the lens is chosen by the anchor entity's type (the currently-selected node if
  // one is pinned as the Anvil Point this session, else the search focus). Never a manual
  // chart-picker (GB-1).
  const anchorId = selectedNodeId ?? focusNodeId;
  const anchorNode = data.nodes.find((n) => n.id === anchorId);
  const lens = anchorNode ? lensForType(nodeTypeOf(anchorNode.type)) : 'radial';

  // NODE-7 — canvas text can't inherit CSS font-family, and a browser doesn't repaint an
  // already-drawn canvas once a lazy-loaded @font-face finishes fetching (unlike DOM text,
  // which reflows on its own). Explicitly request the real face and force one repaint once
  // it's actually available — `fontReady` flipping gives nodeCanvasObject a new closure,
  // which is enough to get force-graph to redraw even if its own render loop had gone idle.
  const [fontReady, setFontReady] = useState(false);
  useEffect(() => {
    let cancelled = false;
    document.fonts.load('12px "IBM Plex Sans"').then(() => {
      if (!cancelled) setFontReady(true);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  // Previous frame's resting positions, kept across data/lens changes so a structural change
  // can tween from where things were rather than snapping (MOTION-1). A node with no prior
  // entry (brand new to the view) tweens outward from the Anvil Point at (0,0) — visibly
  // "radiating outward" from the focus, the Investigation Board's own mental model (IBP-1).
  const restingPositions = useRef<Map<string, { x: number; y: number }>>(new Map());

  // Stable node/link objects across re-renders (e.g. a selection change) rather than fresh
  // copies every render — force-graph's graphData setter has no id-based merge, so handing it
  // a new object reference (as a fresh `.map()` on every render would) pauses the simulation
  // on every render, and any x/y/fx/fy written onto those throwaway copies is lost immediately.
  // Only recreated when the underlying data or lens itself changes.
  const graphNodes = useMemo(() => {
    // IA-3 — "browse all" (no focus/Anvil Point) still gets a deliberate layout, never free
    // physics: computeBrowseAllLayout groups nodes into connected components and grids them.
    // Bug fix: this branch previously returned nodes with no x/y/fx/fy/__target at all, which
    // (a) violated GB-2/GB-4's own "never force-placed" rule by leaving the d3 force
    // simulation to scatter disconnected components arbitrarily, and (b) crashed the settle
    // tween effect below every time it ran (`n.__target.x` on an undefined `__target`),
    // silently killing the animation loop after one broken frame.
    const targets = anchorId
      ? computeLensLayout(lens, anchorId, data.nodes, data.links)
      : computeBrowseAllLayout(data.nodes, data.links);
    return data.nodes.map((n) => {
      const target = targets.get(n.id) ?? { x: 0, y: 0 };
      const start = restingPositions.current.get(n.id) ?? { x: 0, y: 0 };
      // GB-2/GB-1 — every lens here replaces free force-directed placement outright; nodes
      // are pinned (fx/fy) from the moment they exist rather than left to settle wherever
      // physics lands them (GB-4's pinning principle, generalized from the Anvil Point alone
      // to every node, since no node on this canvas is ever undirected-force-placed).
      return { ...n, x: start.x, y: start.y, fx: start.x, fy: start.y, __target: target } as CanvasNode & {
        __target: { x: number; y: number };
      };
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data, lens, anchorId]);
  const graphLinks = useMemo(() => data.links.map((l) => ({ ...l })), [data]);
  // react-kapsule (the wrapper underneath ForceGraph2D) diffs each prop by reference per
  // render and re-invokes the underlying setter whenever that reference changes — including
  // `graphData` itself, not just its nested arrays. An inline `{ nodes, links }` literal here
  // would still be a fresh object every render even with graphNodes/graphLinks memoized above,
  // re-pausing the simulation on every unrelated re-render (e.g. a selection change).
  const graphData = useMemo(() => ({ nodes: graphNodes, links: graphLinks }), [graphNodes, graphLinks]);

  // One eased settle per structural change (MOTION-1/MOTION-3): tween every node from its
  // previous resting position to its new lens target, then hold still — GB-6, no drift after.
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg) return;
    const nodes = graphNodes as (CanvasNode & { __target: { x: number; y: number } })[];
    const start = performance.now();
    let raf = 0;
    const tick = () => {
      const t = Math.min((performance.now() - start) / STRUCTURAL_SETTLE_MS, 1);
      const eased = easeOutCubic(t);
      nodes.forEach((n) => {
        const sx = restingPositions.current.get(n.id)?.x ?? 0;
        const sy = restingPositions.current.get(n.id)?.y ?? 0;
        const x = sx + (n.__target.x - sx) * eased;
        const y = sy + (n.__target.y - sy) * eased;
        n.x = x;
        n.y = y;
        n.fx = x;
        n.fy = y;
      });
      fg.d3ReheatSimulation();
      if (t < 1) {
        raf = requestAnimationFrame(tick);
      } else {
        const snapshot = new Map<string, { x: number; y: number }>();
        nodes.forEach((n) => snapshot.set(n.id, { x: n.__target.x, y: n.__target.y }));
        restingPositions.current = snapshot;
      }
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [graphNodes, graphRef]);

  // VH-4 — the Anvil Point sits ~40% from the left of the effective canvas, never
  // mathematically centered; COMP-11 — replaces `zoomToFit` as the composition strategy.
  // Lens layouts are centered on the anchor at graph-space (0,0); `centerAt` always puts a
  // point at screen-center, so the camera target is offset by the 50%→40% delta instead.
  // Deliberately NOT keyed on `data`/`graphNodes` — IA-5's expand pulls further neighbors
  // into an already-focused board without recentering or rezooming what's pinned (see
  // handleExpandNode in GraphPage.tsx).
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !width || !anchorId) return;
    const zoom = LENS_ZOOM[lens];
    const offsetX = (width * 0.1) / zoom;
    const timer = setTimeout(() => {
      fg.zoom(zoom, STRUCTURAL_SETTLE_MS);
      fg.centerAt(offsetX, 0, STRUCTURAL_SETTLE_MS);
    }, 20);
    return () => clearTimeout(timer);
  }, [lens, anchorId, width, graphRef]);

  // IA-3 — "browse all" has no single Anvil Point to offset from and no fixed extent (the
  // component grid grows with corpus size, and shrinks as type filters hide nodes), so it
  // uses the library's own zoomToFit against whatever computeBrowseAllLayout currently laid
  // out, rather than a fixed per-lens zoom tuned for a single ego-network. Keyed on
  // `graphNodes` (unlike the effect above) specifically so toggling a GraphFilters chip
  // re-fits the camera to the now-smaller drawn set instead of leaving it framed for nodes
  // that are no longer on screen.
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !width || anchorId) return;
    // Wait out the settle tween (below) first — zoomToFit reads current node positions
    // once, so firing it before nodes reach their grid targets fits the wrong bounds.
    const timer = setTimeout(() => fg.zoomToFit(STRUCTURAL_SETTLE_MS, 60), STRUCTURAL_SETTLE_MS + 20);
    return () => clearTimeout(timer);
  }, [anchorId, width, graphRef, graphNodes]);

  // IA-4 — a node's total real connections (`degree`) vs. how many are actually drawn in
  // this view. A gap means "+N more" is honest, not a per-node extra fetch.
  const renderedDegreeById = useMemo(() => {
    const m = new Map<string, number>();
    data.links.forEach((l) => {
      m.set(l.source, (m.get(l.source) ?? 0) + 1);
      m.set(l.target, (m.get(l.target) ?? 0) + 1);
    });
    return m;
  }, [data]);

  const focusedNode = graphNodes.find((n) => n.id === focusedNodeId) as CanvasNode | undefined;

  // A11Y-2 — Tab into the canvas picks up the current Anvil Point (or the first node); arrow
  // keys then rove between nodes in the currently-drawn set; Enter/Space activates the same
  // gesture as a click (IA-5's "select" meaning, never "expand" — that stays a distinct,
  // deliberate secondary gesture).
  const handleCanvasFocus = () => {
    if (focusedNodeId && graphNodes.some((n) => n.id === focusedNodeId)) return;
    setFocusedNodeId(anchorId ?? (graphNodes[0] as CanvasNode | undefined)?.id ?? null);
  };
  const handleCanvasBlur = () => setFocusedNodeId(null);
  const handleCanvasKeyDown = (event: ReactKeyboardEvent) => {
    if (graphNodes.length === 0) return;
    const currentIndex = graphNodes.findIndex((n) => n.id === focusedNodeId);
    const advance = (delta: number) => {
      const from = currentIndex === -1 ? 0 : currentIndex;
      const next = (from + delta + graphNodes.length) % graphNodes.length;
      setFocusedNodeId((graphNodes[next] as CanvasNode).id);
    };
    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        event.preventDefault();
        advance(1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        event.preventDefault();
        advance(-1);
        break;
      case 'Enter':
      case ' ':
        if (focusedNode) {
          event.preventDefault();
          onSelectNode(focusedNode);
        }
        break;
      default:
        break;
    }
  };

  return (
    <div
      tabIndex={0}
      role="application"
      aria-label={`Knowledge graph canvas. ${
        focusedNode ? `Focused on ${focusedNode.name}.` : ''
      } Use arrow keys to move between nodes, Enter to select.`}
      onFocus={handleCanvasFocus}
      onBlur={handleCanvasBlur}
      onKeyDown={handleCanvasKeyDown}
      className="outline-none focus-visible:outline-none"
      style={{ width, height }}
    >
      {/* A11Y-2 — the visible focus indicator lives on the canvas itself (drawn as a dashed
          ring in nodeCanvasObject, COMP-3), so the wrapper's own outline is suppressed above
          rather than doubling up with a generic box outline around the whole widget. */}
      <span className="sr-only" aria-live="polite">
        {focusedNode ? `${focusedNode.name}, ${nodeTypeOf(focusedNode.type)}` : ''}
      </span>
      <ForceGraph2D
        ref={graphRef}
        width={width}
        height={height}
        graphData={graphData}
        backgroundColor={palette.background}
        nodeLabel={(node) => `${(node as CanvasNode).name} (${nodeTypeOf((node as CanvasNode).type)})`}
        nodeRelSize={6}
        linkColor={() => palette.link}
        linkWidth={1.5}
        // EDGE-1/NEVER-3 — every edge states its real relationship verb, directly on the
        // line, in Plex Mono, source→target. There is no generic-fallback path here (EDGE-2)
        // since `type` is always one of the real co-occurrence verbs (MAINTAINED_BY, INVOLVES,
        // GOVERNED_BY, PERFORMED_BY) — an edge with nothing to say is simply never created
        // (see COOCCURRENCE_RULES on the backend).
        linkCanvasObjectMode={() => 'after'}
        linkCanvasObject={(link, ctx, globalScale) => {
          const l = link as GraphLink & { source: CanvasNode | string; target: CanvasNode | string };
          const src = l.source;
          const tgt = l.target;
          if (typeof src !== 'object' || typeof tgt !== 'object' || src.x == null || tgt.x == null) return;
          if (globalScale < LABEL_ZOOM_THRESHOLD) return;

          const midX = (src.x + tgt.x) / 2;
          const midY = (src.y! + tgt.y!) / 2;
          let angle = Math.atan2(tgt.y! - src.y!, tgt.x - src.x);
          // Keep the verb upright and readable source→target regardless of which way the
          // line happens to point on screen — never upside down.
          if (angle > Math.PI / 2 || angle < -Math.PI / 2) angle += Math.PI;

          const fontSize = Math.max(9 / globalScale, 2.2);
          ctx.save();
          ctx.translate(midX, midY);
          ctx.rotate(angle);
          ctx.font = fontReady ? `${fontSize}px "IBM Plex Mono", monospace` : `${fontSize}px monospace`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'middle';
          const label = l.type;
          const padding = fontSize * 0.4;
          const width = ctx.measureText(label).width + padding * 2;
          ctx.fillStyle = palette.background;
          ctx.fillRect(-width / 2, -fontSize * 0.7, width, fontSize * 1.4);
          ctx.fillStyle = palette.label;
          ctx.fillText(label, 0, 0);
          ctx.restore();
        }}
        // IA-5 — selecting a node (new focus) and expanding it (pulling in its own further
        // neighbors without recentering) are two distinct gestures with two distinct click
        // targets: the node body (primary click) vs. the stamped context card (COMP-10),
        // opened by a secondary click/long-press — never the same handler for both meanings.
        onNodeClick={(node) => onSelectNode(node as CanvasNode)}
        onNodeRightClick={(node, event) => {
          event.preventDefault();
          setContextTarget({ node: node as CanvasNode, x: event.clientX, y: event.clientY });
        }}
        nodeCanvasObject={(node, ctx, globalScale) => {
          const n = node as CanvasNode;
          const type = nodeTypeOf(n.type);
          const color = NODE_COLORS[type];
          const radius = Math.min(6 + n.document_count * 0.8, 16);
          const isSelected = selectedNodeId === n.id || (!selectedNodeId && anchorId === n.id);

          if (isSelected) {
            traceNodeShape(ctx, type, n.x!, n.y!, radius + 8);
            ctx.fillStyle = `${color}4D`; // rgba(color, 0.3)
            ctx.fill();
          }
          traceNodeShape(ctx, type, n.x!, n.y!, radius);
          ctx.fillStyle = color;
          ctx.fill();

          // A11Y-2/COMP-3 — the roving-tabindex keyboard focus ring: same halo geometry as
          // the mouse-selection ring above, but a dashed stroke instead of a solid fill so
          // the two are never visually confused (a node can carry both at once).
          if (n.id === focusedNodeId) {
            traceNodeShape(ctx, type, n.x!, n.y!, radius + 8);
            ctx.save();
            ctx.setLineDash([4 / globalScale, 3 / globalScale]);
            ctx.lineWidth = 2 / globalScale;
            ctx.strokeStyle = palette.interactive;
            ctx.stroke();
            ctx.restore();
          }

          // IA-4 — the "+N more" affordance: further unexpanded neighbors exist beyond what
          // this ego-network drew. Visual only; the click target that acts on it lives in
          // the context card, not this badge (IA-5 — distinct gestures, distinct targets).
          const rendered = renderedDegreeById.get(n.id) ?? 0;
          const more = n.degree - rendered;
          if (more > 0) {
            const bx = n.x! + radius * 0.72;
            const by = n.y! - radius * 0.72;
            ctx.beginPath();
            ctx.arc(bx, by, 4.5, 0, 2 * Math.PI);
            ctx.fillStyle = palette.interactive;
            ctx.fill();
            if (globalScale > 1) {
              ctx.font = '6px "IBM Plex Mono", monospace';
              ctx.textAlign = 'center';
              ctx.textBaseline = 'middle';
              ctx.fillStyle = palette.background;
              ctx.fillText(more > 9 ? '9+' : String(more), bx, by + 0.5);
            }
          }

          if (globalScale < LABEL_ZOOM_THRESHOLD && !isSelected) return;
          const fontSize = Math.max(10 / globalScale, 2.5);
          ctx.font = fontReady ? `${fontSize}px "IBM Plex Sans", sans-serif` : `${fontSize}px sans-serif`;
          ctx.textAlign = 'center';
          ctx.textBaseline = 'top';
          ctx.fillStyle = palette.label;
          const label = n.name.length > 14 ? `${n.name.slice(0, 14)}…` : n.name;
          ctx.fillText(label, n.x!, n.y! + radius + 2);
        }}
        cooldownTime={STRUCTURAL_SETTLE_MS + 200}
        enableZoomInteraction
        enablePanInteraction
      />
      {contextTarget && (
        <NodeContextCard
          node={contextTarget.node}
          renderedDegree={renderedDegreeById.get(contextTarget.node.id) ?? 0}
          x={contextTarget.x}
          y={contextTarget.y}
          onSetFocus={() => onSelectNode(contextTarget.node)}
          onExpand={() => onExpandNode(contextTarget.node)}
          onClose={() => setContextTarget(null)}
        />
      )}
    </div>
  );
}
