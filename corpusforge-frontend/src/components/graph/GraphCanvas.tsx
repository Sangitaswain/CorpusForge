import { useEffect, useRef } from 'react';
import ForceGraph2D from 'react-force-graph-2d';
import type { ForceGraphMethods, NodeObject } from 'react-force-graph-2d';
import type { GraphData, GraphNode } from '../../types/graph';
import { NODE_COLORS, nodeTypeOf } from '../../utils/constants';

interface GraphCanvasProps {
  data: GraphData;
  onNodeClick: (node: GraphNode) => void;
  focusNodeId?: string;
  width: number;
  height: number;
  selectedNodeId?: string | null;
}

type CanvasNode = NodeObject & GraphNode;

export default function GraphCanvas({ data, onNodeClick, focusNodeId, width, height, selectedNodeId }: GraphCanvasProps) {
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);

  useEffect(() => {
    if (!focusNodeId || !graphRef.current) return;
    const timer = setTimeout(() => {
      const node = (data.nodes as CanvasNode[]).find((n) => n.id === focusNodeId);
      if (node && node.x !== undefined && node.y !== undefined) {
        graphRef.current?.centerAt(node.x, node.y, 1000);
        graphRef.current?.zoom(4, 1000);
      }
    }, 600);
    return () => clearTimeout(timer);
  }, [focusNodeId, data]);

  return (
    <ForceGraph2D
      ref={graphRef}
      width={width}
      height={height}
      graphData={{ nodes: data.nodes.map((n) => ({ ...n })), links: data.links.map((l) => ({ ...l })) }}
      backgroundColor="#070E0D"
      nodeLabel={(node) => `${(node as CanvasNode).name} (${nodeTypeOf((node as CanvasNode).type)})`}
      nodeRelSize={6}
      linkColor={() => '#2D5248'}
      linkWidth={1.5}
      onNodeClick={(node) => onNodeClick(node as CanvasNode)}
      nodeCanvasObject={(node, ctx, globalScale) => {
        const n = node as CanvasNode;
        const color = NODE_COLORS[nodeTypeOf(n.type)];
        const radius = Math.min(6 + n.document_count * 0.8, 16);
        if (selectedNodeId === n.id) {
          ctx.beginPath();
          ctx.arc(n.x!, n.y!, radius + 8, 0, 2 * Math.PI);
          ctx.fillStyle = `${color}4D`; // rgba(color, 0.3)
          ctx.fill();
        }
        ctx.beginPath();
        ctx.arc(n.x!, n.y!, radius, 0, 2 * Math.PI);
        ctx.fillStyle = color;
        ctx.fill();
        const fontSize = Math.max(10 / globalScale, 2.5);
        ctx.font = `${fontSize}px Inter, sans-serif`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillStyle = '#E8F0EE';
        const label = n.name.length > 14 ? `${n.name.slice(0, 14)}…` : n.name;
        ctx.fillText(label, n.x!, n.y! + radius + 2);
      }}
      enableZoomInteraction
      enablePanInteraction
    />
  );
}
