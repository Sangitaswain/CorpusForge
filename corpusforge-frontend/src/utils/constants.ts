import type { NodeType } from '../types/graph';

// UI Design System 2.4 — the only colours allowed on the graph canvas
export const NODE_COLORS: Record<NodeType, string> = {
  equipment: '#3B82F6',
  incident: '#EF4444',
  procedure: '#10B981',
  regulation: '#8B5CF6',
  person: '#F59E0B',
  document: '#6B7280',
  work_order: '#F97316',
};

// Backend entity_type values → canvas node types
export const ENTITY_TYPE_TO_NODE_TYPE: Record<string, NodeType> = {
  equipment_tag: 'equipment',
  incident_id: 'incident',
  procedure_code: 'procedure',
  regulation_ref: 'regulation',
  person: 'person',
  work_order_id: 'work_order',
  date: 'document',
  parameter: 'document',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  equipment: 'Equipment',
  incident: 'Incident',
  procedure: 'Procedure',
  regulation: 'Regulation',
  person: 'Person',
  document: 'Other',
  work_order: 'Work Order',
};

export function nodeTypeOf(entityType: string): NodeType {
  return ENTITY_TYPE_TO_NODE_TYPE[entityType] ?? 'document';
}
