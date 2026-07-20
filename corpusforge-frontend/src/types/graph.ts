// Knowledge_Graph_Design_Bible.md NODE-4 — 'date' and 'parameter' are their own honest
// types, not merged into a generic catch-all. 'other' is a defensive fallback for an
// unexpected entity_type value, not a real category — the eight real backend entity types
// (NODE-1) each map onto a distinct NodeType here.
export type NodeType =
  | 'equipment'
  | 'procedure'
  | 'incident'
  | 'regulation'
  | 'person'
  | 'work_order'
  | 'date'
  | 'parameter'
  | 'other';

export interface GraphNode {
  id: string;
  name: string;
  type: string; // backend entity_type, e.g. 'equipment_tag' — map via nodeTypeOf()
  document_count: number;
  // IA-4/IA-5 — total real connections this entity has in the full graph, which may exceed
  // how many are actually drawn in the current (possibly ego-limited) response.
  degree: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
  document_id: string | null;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  node_count: number;
  edge_count: number;
}

export interface ConnectedEntity {
  id: string;
  entity: string;
  type: string;
  relationship: string;
  source_document: string | null;
  source_document_id: string | null;
}

// PANEL-8 — a Coordinate Rail entry: a `date` entity co-occurring with the focus (sharing a
// source document), never a floating canvas node (NODE-4). `sort_date` is null when the
// backend couldn't parse the raw label into a real date — those sort last, not first.
export interface TimelineEntry {
  id: string;
  label: string;
  sort_date: string | null;
  source_document: string | null;
  source_document_id: string | null;
}

export interface NodeDetail {
  entity: GraphNode;
  connected: ConnectedEntity[];
  timeline: TimelineEntry[];
}

// PANEL-9 — synthesis, not evidence; no confidence number is computed for this endpoint
// (unlike Ask Forge answers), so the panel must not fabricate a Temper Arc for it (PANEL-7).
export interface NodeSummary {
  summary: string;
  recommended_next_step: string;
}

// SEARCH-2 — one autocomplete match; type is the raw backend entity_type, map via nodeTypeOf().
export interface NodeSearchResult {
  id: string;
  name: string;
  type: string;
}
