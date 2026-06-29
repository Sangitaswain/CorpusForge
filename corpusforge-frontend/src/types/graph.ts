export type NodeType = 'equipment' | 'procedure' | 'incident' | 'regulation' | 'person' | 'document' | 'work_order';

export interface GraphNode {
  id: string;
  name: string;
  type: NodeType;
  document_count: number;
}

export interface GraphLink {
  source: string;
  target: string;
  type: string;
}

export interface GraphData {
  nodes: GraphNode[];
  links: GraphLink[];
  node_count: number;
  edge_count: number;
}

export interface ConnectedEntity {
  entity: string;
  type: NodeType;
  relationship: string;
  source_document: string | null;
}

export interface NodeDetail {
  entity: GraphNode;
  connected: ConnectedEntity[];
}
