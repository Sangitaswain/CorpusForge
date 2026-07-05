import { useEffect, useMemo, useRef, useState } from 'react';
import { Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { GraphNode, NodeType } from '../types/graph';
import { useGraph } from '../hooks/useGraph';
import GraphCanvas from '../components/graph/GraphCanvas';
import GraphFilters from '../components/graph/GraphFilters';
import GraphSearch from '../components/graph/GraphSearch';
import NodeDetailPanel from '../components/graph/NodeDetailPanel';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { nodeTypeOf } from '../utils/constants';

export default function GraphPage() {
  const [focus, setFocus] = useState('');
  const [hiddenTypes, setHiddenTypes] = useState<Set<NodeType>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { data, isLoading, error } = useGraph(focus || undefined);
  const navigate = useNavigate();
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const [canvasSize, setCanvasSize] = useState({ width: 800, height: 600 });

  useEffect(() => {
    const measure = () => {
      const el = canvasWrapRef.current;
      if (el) setCanvasSize({ width: el.clientWidth, height: el.clientHeight });
    };
    measure();
    window.addEventListener('resize', measure);
    return () => window.removeEventListener('resize', measure);
  }, [selectedNodeId, isLoading]);

  const filteredData = useMemo(() => {
    if (!data) return null;
    const visible = new Set(
      data.nodes.filter((n) => !hiddenTypes.has(nodeTypeOf(n.type))).map((n) => n.id),
    );
    return {
      ...data,
      nodes: data.nodes.filter((n) => visible.has(n.id)),
      links: data.links.filter((l) => visible.has(l.source) && visible.has(l.target)),
    };
  }, [data, hiddenTypes]);

  const toggleType = (type: NodeType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  const handleNodeClick = (node: GraphNode) => setSelectedNodeId(node.id);
  const focusNodeId = focus && data ? data.nodes.find((n) => n.name.toLowerCase() === focus.toLowerCase())?.id : undefined;

  return (
    <div className="pt-14 h-dvh flex flex-col">
      <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold text-text-primary">Knowledge Graph</h1>
          {data && (
            <span className="font-mono text-xs text-text-secondary">
              Nodes: {data.node_count} · Edges: {data.edge_count}
            </span>
          )}
        </div>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <GraphSearch onSearch={setFocus} activeFocus={focus} />
          <GraphFilters hiddenTypes={hiddenTypes} onToggle={toggleType} />
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {isLoading ? (
          <div className="flex-1"><LoadingSpinner /></div>
        ) : error ? (
          <div className="flex-1 p-6"><ErrorBanner message={error.message} /></div>
        ) : !filteredData || filteredData.node_count === 0 ? (
          <div className="flex-1">
            <EmptyState
              icon={Share2}
              heading="Knowledge graph is empty"
              description="Upload and process documents to build the graph."
              actionLabel="Go to Documents"
              onAction={() => navigate('/documents')}
            />
          </div>
        ) : (
          <>
            <div ref={canvasWrapRef} className="flex-1 min-w-0 bg-bg-void">
              <GraphCanvas
                data={filteredData}
                onNodeClick={handleNodeClick}
                focusNodeId={focusNodeId}
                selectedNodeId={selectedNodeId}
                width={canvasSize.width}
                height={canvasSize.height}
              />
            </div>
            {selectedNodeId && (
              <NodeDetailPanel entityId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
