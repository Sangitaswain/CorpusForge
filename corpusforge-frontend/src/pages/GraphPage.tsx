import { useEffect, useMemo, useRef, useState } from 'react';
import { Filter, Search, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import type { GraphNode, NodeType } from '../types/graph';
import { useGraph } from '../hooks/useGraph';
import { useRecentInvestigations } from '../hooks/useRecentInvestigations';
import GraphCanvas from '../components/graph/GraphCanvas';
import GraphControls from '../components/graph/GraphControls';
import GraphFilters from '../components/graph/GraphFilters';
import GraphLegend from '../components/graph/GraphLegend';
import GraphSearch from '../components/graph/GraphSearch';
import NodeDetailPanel from '../components/graph/NodeDetailPanel';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { nodeTypeOf } from '../utils/constants';

export default function GraphPage() {
  const [focus, setFocus] = useState('');
  // IA-3 — full-graph browsing stays available, but only as an explicit opt-in.
  const [browseAll, setBrowseAll] = useState(false);
  const [hiddenTypes, setHiddenTypes] = useState<Set<NodeType>>(new Set());
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);
  const { recent, record } = useRecentInvestigations();
  // IA-1 — never request the full graph by default. Only fetch once a focus exists or the
  // user has explicitly asked to browse everything.
  const shouldLoad = Boolean(focus) || browseAll;
  const { data, isLoading, error } = useGraph(focus || undefined, { enabled: shouldLoad });
  const navigate = useNavigate();
  const canvasWrapRef = useRef<HTMLDivElement>(null);
  const graphRef = useRef<ForceGraphMethods | undefined>(undefined);
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

  // IA-2 — a successful, focused investigation is worth remembering for next time.
  useEffect(() => {
    if (focus && data && data.node_count > 0) record(focus);
  }, [focus, data, record]);

  const handleRecentClick = (name: string) => setFocus(name);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold text-text-primary">Knowledge Graph</h1>
          {data && (
            <span className="font-mono text-xs text-text-secondary">
              Nodes: {data.node_count} · Edges: {data.edge_count}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted mt-1">
          Every entity extracted from your documents, connected by how they relate — trace a failure back to the work order and technician behind it.
        </p>
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <GraphSearch
            onSearch={(value) => {
              setBrowseAll(false);
              setFocus(value);
            }}
            activeFocus={focus}
          />
          {data && <GraphFilters hiddenTypes={hiddenTypes} onToggle={toggleType} />}
          {browseAll && !focus && (
            <button
              onClick={() => setBrowseAll(false)}
              className="text-xs text-accent-teal hover:underline min-h-[32px]"
            >
              ← Back to search
            </button>
          )}
        </div>
      </div>

      <div className="flex-1 flex min-h-0">
        {!shouldLoad ? (
          // IA-2 — the pre-search empty board. Never auto-populated with data (IA-1).
          <div className="flex-1 flex flex-col items-center justify-center py-16 px-4">
            <Search size={40} className="text-text-muted" />
            <h2 className="text-lg font-semibold text-text-secondary mt-4">Start an investigation</h2>
            <p className="text-sm text-text-muted text-center max-w-sm mt-2">
              Search an equipment tag, incident, work order, procedure, regulation, or technician to pin it as the
              focus of your board.
            </p>

            {recent.length > 0 && (
              <div className="mt-6 flex flex-col items-center gap-2">
                <span className="text-2xs font-medium text-text-muted uppercase tracking-wider">Recently investigated</span>
                <div className="flex flex-wrap justify-center gap-2 max-w-md">
                  {recent.map((name) => (
                    <button
                      key={name}
                      onClick={() => handleRecentClick(name)}
                      className="px-2.5 py-1 rounded-md text-xs font-medium border border-border-default text-text-secondary hover:border-accent-teal hover:text-accent-teal transition-fast min-h-[32px]"
                    >
                      {name}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              onClick={() => setBrowseAll(true)}
              className="mt-8 text-xs text-text-muted hover:text-accent-teal underline underline-offset-2 min-h-[32px]"
            >
              Browse the full corpus graph instead
            </button>
          </div>
        ) : isLoading ? (
          <div className="flex-1"><LoadingSpinner /></div>
        ) : error ? (
          <div className="flex-1 p-6"><ErrorBanner message={error.message} /></div>
        ) : !data || data.node_count === 0 ? (
          <div className="flex-1">
            <EmptyState
              icon={Share2}
              heading="Knowledge graph is empty"
              description="Upload and process documents to build the graph."
              actionLabel="Go to Documents"
              onAction={() => navigate('/documents')}
            />
          </div>
        ) : !filteredData || filteredData.nodes.length === 0 ? (
          <div className="flex-1">
            <EmptyState
              icon={Filter}
              heading="No nodes match the current filters"
              description="Every node type is currently hidden. Clear the filters to see the graph."
              actionLabel="Clear filters"
              onAction={() => setHiddenTypes(new Set())}
            />
          </div>
        ) : (
          <>
            <div ref={canvasWrapRef} className="graph-canvas-wrapper relative flex-1 min-w-0 bg-bg-void">
              <GraphCanvas
                data={filteredData}
                onNodeClick={handleNodeClick}
                focusNodeId={focusNodeId}
                selectedNodeId={selectedNodeId}
                width={canvasSize.width}
                height={canvasSize.height}
                graphRef={graphRef}
              />
              <GraphLegend />
              <GraphControls graphRef={graphRef} />
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
