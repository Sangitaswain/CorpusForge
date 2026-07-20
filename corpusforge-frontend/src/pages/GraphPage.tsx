import { useEffect, useMemo, useRef, useState } from 'react';
import { ChevronRight, Filter, Search, Share2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import type { GraphData, GraphNode, NodeType } from '../types/graph';
import { getGraph } from '../api/graph';
import { useGraph, useNodeDetail } from '../hooks/useGraph';
import { useInvestigationTrail } from '../hooks/useInvestigationTrail';
import { useRecentInvestigations } from '../hooks/useRecentInvestigations';
import GraphCanvas from '../components/graph/GraphCanvas';
import GraphControls from '../components/graph/GraphControls';
import GraphFilters from '../components/graph/GraphFilters';
import GraphLegend from '../components/graph/GraphLegend';
import GraphSearch from '../components/graph/GraphSearch';
import NodeDetailPanel from '../components/graph/NodeDetailPanel';
import WorkOrderEvidencePanel from '../components/graph/WorkOrderEvidencePanel';
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
  // IA-5 — expand pulls a node's own further neighbors into the current view without
  // recentering or replacing the board's focus (distinct from selecting a new focus, which
  // replaces `data` outright via a fresh `useGraph` fetch below).
  const [expansions, setExpansions] = useState<Record<string, GraphData>>({});
  const { recent, record } = useRecentInvestigations();
  const { trail, pushEntity } = useInvestigationTrail();
  // IA-1 — never request the full graph by default. Only fetch once a focus exists or the
  // user has explicitly asked to browse everything.
  const shouldLoad = Boolean(focus) || browseAll;
  const { data, isLoading, error } = useGraph(focus || undefined, { enabled: shouldLoad });
  const navigate = useNavigate();

  useEffect(() => {
    setExpansions({});
  }, [focus, browseAll]);
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

  // IA-5 — merge any expanded ego-networks into the base board. Node/link identity is
  // deduped by id so expanding two neighbors that share a further connection doesn't draw it
  // twice; the base focus and its direct neighbors are never removed, only added to.
  const mergedData = useMemo(() => {
    if (!data) return data;
    const nodeById = new Map(data.nodes.map((n) => [n.id, n]));
    const linkKeys = new Set(data.links.map((l) => `${l.source}->${l.target}->${l.type}`));
    const links = [...data.links];
    Object.values(expansions).forEach((expansion) => {
      expansion.nodes.forEach((n) => {
        if (!nodeById.has(n.id)) nodeById.set(n.id, n);
      });
      expansion.links.forEach((l) => {
        const key = `${l.source}->${l.target}->${l.type}`;
        if (!linkKeys.has(key)) {
          linkKeys.add(key);
          links.push(l);
        }
      });
    });
    const nodes = [...nodeById.values()];
    return { ...data, nodes, links, node_count: nodes.length, edge_count: links.length };
  }, [data, expansions]);

  const filteredData = useMemo(() => {
    if (!mergedData) return null;
    const visible = new Set(
      mergedData.nodes.filter((n) => !hiddenTypes.has(nodeTypeOf(n.type))).map((n) => n.id),
    );
    return {
      ...mergedData,
      nodes: mergedData.nodes.filter((n) => visible.has(n.id)),
      links: mergedData.links.filter((l) => visible.has(l.source) && visible.has(l.target)),
    };
  }, [mergedData, hiddenTypes]);

  const toggleType = (type: NodeType) => {
    setHiddenTypes((prev) => {
      const next = new Set(prev);
      if (next.has(type)) next.delete(type);
      else next.add(type);
      return next;
    });
  };

  // A genuinely new search focus (typed, autocompleted, or a recent chip) starts a new
  // investigation — any node selected on the *previous* board is no longer meaningful and
  // must not linger as the GB-1 lens anchor or leave a stale panel open (see handleSelectNode,
  // which sets focus and selectedNodeId together for exactly the case where it should).
  const handleSearchFocus = (value: string) => {
    setBrowseAll(false);
    setFocus(value);
    setSelectedNodeId(null);
  };

  // IA-5 — select is synonymous with "new focus": it replaces the board's search focus,
  // triggering a fresh ego-network fetch centered on this entity, distinct from expand below.
  const handleSelectNode = (node: GraphNode) => {
    setBrowseAll(false);
    setFocus(node.name);
    setSelectedNodeId(node.id);
  };

  // IA-5/IA-4 — expand pulls this node's own further neighbors into the current view without
  // touching `focus`, so the board doesn't recenter or replace what's already pinned.
  // `pendingExpansions` guards against two rapid triggers for the same node both firing:
  // `expansions[node.id]` alone only dedupes after the first request resolves, so a second
  // click within that window would start a duplicate fetch.
  const pendingExpansions = useRef<Set<string>>(new Set());
  const handleExpandNode = async (node: GraphNode) => {
    if (expansions[node.id] || pendingExpansions.current.has(node.id)) return;
    pendingExpansions.current.add(node.id);
    try {
      const expansion = await getGraph(node.name);
      setExpansions((prev) => ({ ...prev, [node.id]: expansion }));
    } catch {
      // Best-effort — the "+N more" badge simply stays put for a retry; no error surface
      // needed for a supplementary reveal action.
    } finally {
      pendingExpansions.current.delete(node.id);
    }
  };

  const focusNode = focus && data ? data.nodes.find((n) => n.name.toLowerCase() === focus.toLowerCase()) : undefined;
  const focusNodeId = focusNode?.id;
  const focusIsWorkOrder = Boolean(focusNode && nodeTypeOf(focusNode.type) === 'work_order');
  const { data: workOrderDetail } = useNodeDetail(focusIsWorkOrder ? focusNodeId ?? null : null);

  // IA-2 — a successful, focused investigation is worth remembering for next time.
  // IA-6 — and it's the next step in this session's investigation trail, regardless of
  // whether the user gets there again later (persists across lens switches/navigation,
  // never reset just because the board re-fetched for the same focus).
  useEffect(() => {
    if (focus && data && data.node_count > 0) {
      record(focus);
      pushEntity(focus);
    }
  }, [focus, data, record, pushEntity]);

  const handleRecentClick = (name: string) => handleSearchFocus(name);

  return (
    <div className="h-full flex flex-col">
      <div className="px-4 sm:px-6 py-3 border-b border-border-subtle">
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <h1 className="text-2xl font-semibold text-text-primary">Knowledge Graph</h1>
          {mergedData && (
            <span className="font-mono text-xs text-text-secondary">
              Nodes: {mergedData.node_count} · Edges: {mergedData.edge_count}
            </span>
          )}
        </div>
        <p className="text-sm text-text-muted mt-1">
          Every entity extracted from your documents, connected by how they relate — trace a failure back to the work order and technician behind it.
        </p>
        {/* IA-6 — the investigation trail: every entity that's been the Anvil Point this
            session, in order. Persists across lens switches and navigating away and back
            (sessionStorage in useInvestigationTrail), so it only shows once there's a real
            trail to walk back through, not on the very first focus. */}
        {trail.length > 1 && (
          <div className="flex items-center gap-1 mt-2 overflow-x-auto">
            {trail.map((name, i) => {
              const isCurrent = i === trail.length - 1;
              return (
                <div key={`${name}-${i}`} className="flex items-center gap-1 shrink-0">
                  {i > 0 && <ChevronRight size={12} className="text-text-muted shrink-0" aria-hidden="true" />}
                  {isCurrent ? (
                    <span className="text-xs font-medium text-text-primary whitespace-nowrap">{name}</span>
                  ) : (
                    <button
                      onClick={() => handleSearchFocus(name)}
                      className="text-xs text-text-muted hover:text-accent-teal whitespace-nowrap min-h-[24px]"
                    >
                      {name}
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}
        <div className="flex flex-wrap items-center gap-3 mt-3">
          <GraphSearch onSearch={handleSearchFocus} activeFocus={focus} />
          {data && !focusIsWorkOrder && <GraphFilters hiddenTypes={hiddenTypes} onToggle={toggleType} />}
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
        ) : focusIsWorkOrder ? (
          // GB-3/NEVER-10 — a Work Order never gets a canvas visualization, regardless of
          // what the graph library could technically render for it. Checked ahead of the
          // node-filter empty state below since hiddenTypes is a canvas-only concern.
          workOrderDetail ? (
            <WorkOrderEvidencePanel detail={workOrderDetail} />
          ) : (
            <div className="flex-1"><LoadingSpinner /></div>
          )
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
                onSelectNode={handleSelectNode}
                onExpandNode={handleExpandNode}
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
              // key forces a remount on node switch so per-node local state (e.g. the
              // PANEL-9 AI Summary mutation) never leaks the previous entity's result.
              <NodeDetailPanel key={selectedNodeId} entityId={selectedNodeId} onClose={() => setSelectedNodeId(null)} />
            )}
          </>
        )}
      </div>
    </div>
  );
}
