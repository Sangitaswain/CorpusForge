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

export interface NodeDetail {
  entity: GraphNode;
  connected: ConnectedEntity[];
}

// SEARCH-2 — one autocomplete match; type is the raw backend entity_type, map via nodeTypeOf().
export interface NodeSearchResult {
  id: string;
  name: string;
  type: string;
}
