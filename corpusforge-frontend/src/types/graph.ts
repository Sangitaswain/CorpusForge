export type NodeType = 'equipment' | 'procedure' | 'incident' | 'regulation' | 'person' | 'document' | 'work_order';

export interface GraphNode {
  id: string;
  name: string;
  type: string; // backend entity_type, e.g. 'equipment_tag' — map via nodeTypeOf()
  document_count: number;
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
