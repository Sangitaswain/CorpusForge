import { useEffect, useMemo, useRef } from 'react';
import type { MutableRefObject } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import type { GraphData, GraphNode } from '../../types/graph';
import { NODE_COLORS, nodeTypeOf } from '../../utils/constants';
import { useTheme } from '../../hooks/useTheme';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
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
  light: { background: '#FFFFFF', link: '#C5DDD7', label: '#0B1F1C' },
  dark: { background: '#070E0D', link: '#2D5248', label: '#E8F0EE' },
};

// Below this zoom level, node labels are hidden to keep an unfocused graph
// readable — only the selected node's label always shows.
const LABEL_ZOOM_THRESHOLD = 1.5;

export default function GraphCanvas({
  data,
  onNodeClick,
  focusNodeId,
  width,
  height,
  selectedNodeId,
  graphRef,
}: GraphCanvasProps) {
  const { theme } = useTheme();
  const palette = CANVAS_PALETTE[theme];

  const hasAutoFitted = useRef(false);
  const pinnedIdRef = useRef<string | undefined>(undefined);

  // Stable node/link objects across re-renders (e.g. a selection change) rather than fresh
  // copies every render — force-graph's graphData setter has no id-based merge, so handing it
  // a new object reference (as the previous per-render `.map()` did) pauses the simulation on
  // every render, and any x/y/fx/fy written onto those throwaway copies is lost immediately.
  // Only recreated when the underlying data itself changes.
  const graphNodes = useMemo(() => data.nodes.map((n) => ({ ...n })), [data]);
  const graphLinks = useMemo(() => data.links.map((l) => ({ ...l })), [data]);
  // react-kapsule (the wrapper underneath ForceGraph2D) diffs each prop by reference per
  // render and re-invokes the underlying setter whenever that reference changes — including
  // `graphData` itself, not just its nested arrays. An inline `{ nodes, links }` literal here
  // would still be a fresh object every render even with graphNodes/graphLinks memoized above,
  // re-pausing the simulation on every unrelated re-render (e.g. a selection change).
  const graphData = useMemo(() => ({ nodes: graphNodes, links: graphLinks }), [graphNodes, graphLinks]);

  useEffect(() => {
    hasAutoFitted.current = false;
    pinnedIdRef.current = undefined;
  }, [data]);

  useEffect(() => {
    // Spread nodes out more than the library default so labels stay legible
    const fg = graphRef.current;
    if (!fg) return;
    fg.d3Force('charge')?.strength(-140);
    fg.d3Force('link')?.distance(60);
  }, [data, graphRef]);

  useEffect(() => {
    if (!focusNodeId || !graphRef.current) return;
    const timer = setTimeout(() => {
      const node = (graphNodes as CanvasNode[]).find((n) => n.id === focusNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        graphRef.current?.centerAt(node.x, node.y, 1000);
        graphRef.current?.zoom(4, 1000);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [focusNodeId, graphNodes, graphRef]);

  // The Anvil Point (Visual_Identity.md, signature element 6) — the one fixed, heavier node
  // in the graph: the entity currently in focus. Force-directed layouts drift ambiently by
  // default, so the focused node is pinned (fx/fy) rather than left to settle wherever the
  // physics land it, and the previous anchor is unpinned so exactly one node is ever fixed.
  useEffect(() => {
    const anchorId = selectedNodeId ?? focusNodeId;
    if (!anchorId || !graphRef.current) return;
    const timer = setTimeout(() => {
      const nodes = graphNodes as CanvasNode[];
      if (pinnedIdRef.current && pinnedIdRef.current !== anchorId) {
        const prev = nodes.find((n) => n.id === pinnedIdRef.current);
        if (prev) {
          prev.fx = undefined;
          prev.fy = undefined;
        }
      }
      const anchor = nodes.find((n) => n.id === anchorId);
      if (anchor && anchor.x !== undefined && anchor.y !== undefined) {
        anchor.fx = anchor.x;
        anchor.fy = anchor.y;
        pinnedIdRef.current = anchorId;
        graphRef.current?.d3ReheatSimulation();
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [selectedNodeId, focusNodeId, graphNodes, graphRef]);

  return (
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
      onEngineStop={() => {
        if (!hasAutoFitted.current) {
          graphRef.current?.zoomToFit(400, 60);
          hasAutoFitted.current = true;
        }
      }}
      onNodeClick={(node) => onNodeClick(node as CanvasNode)}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as CanvasNode;
        const color = NODE_COLORS[nodeTypeOf(n.type)];
        const radius = Math.min(6 + n.document_count * 0.8, 16);
        const isSelected = selectedNodeId === n.id;

        if (isSelected) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, radius + 8, 0, 2 * Math.PI);
          ctx.fillStyle = `${color}4D`; // rgba(color, 0.3)
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();

        if (globalScale < LABEL_ZOOM_THRESHOLD && !isSelected) return;
        const fontSize = Math.max(10 / globalScale, 2.5);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = palette.label;
        const label = n.name.length > 14 ? `${n.name.slice(0, 14)}…` : n.name;
        ctx.fillText(label, n.x!, n.y! + radius + 2);
      }}
      enableZoomInteraction
      enablePanInteraction
    />
  );
}
