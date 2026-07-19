import { useEffect, useMemo, useRef, useState } from 'react';
import type { MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import type { GraphData, GraphNode } from '../../types/graph';
import { NODE_COLORS, nodeTypeOf } from '../../utils/constants';
import { traceNodeShape } from './nodeShapes';
import { computeLensLayout, lensForType, type Lens } from './graphLens';
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
    if (!anchorId) return data.nodes.map((n) => ({ ...n }));
    const targets = computeLensLayout(lens, anchorId, data.nodes, data.links);
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
  useEffect(() => {
    const fg = graphRef.current;
    if (!fg || !width) return;
    const zoom = LENS_ZOOM[lens];
    const offsetX = (width * 0.1) / zoom;
    const timer = setTimeout(() => {
      fg.zoom(zoom, STRUCTURAL_SETTLE_MS);
      fg.centerAt(offsetX, 0, STRUCTURAL_SETTLE_MS);
    }, 20);
    return () => clearTimeout(timer);
  }, [lens, anchorId, width, graphRef]);

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

  return (
    <>
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
    </>
  );
}
