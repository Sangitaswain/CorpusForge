import type { NodeType } from '../types/graph';
import type { DocumentType } from '../types/document';
import { NODE_PALETTE } from '../constants/nodePalette';

// Knowledge_Graph_Design_Bible.md NODE-6 — sourced from NODE_PALETTE, the single
// source of truth also consumed by tailwind.config.ts. Do not hardcode these values here.
export const NODE_COLORS: Record<NodeType, string> = NODE_PALETTE;

// Backend entity_type values → canvas node types.
// Knowledge_Graph_Design_Bible.md NODE-4 — date and parameter get their own honest
// mapping, not folded into a generic bucket.
export const ENTITY_TYPE_TO_NODE_TYPE: Record<string, NodeType> = {
  equipment_tag: 'equipment',
  incident_id: 'incident',
  procedure_code: 'procedure',
  regulation_ref: 'regulation',
  person: 'person',
  work_order_id: 'work_order',
  date: 'date',
  parameter: 'parameter',
};

export const NODE_TYPE_LABELS: Record<NodeType, string> = {
  equipment: 'Equipment',
  incident: 'Incident',
  procedure: 'Procedure',
  regulation: 'Regulation',
  person: 'Person',
  work_order: 'Work Order',
  date: 'Date',
  parameter: 'Parameter',
  other: 'Other',
};

export function nodeTypeOf(entityType: string): NodeType {
  return ENTITY_TYPE_TO_NODE_TYPE[entityType] ?? 'other';
}

export const DOC_TYPE_LABELS: Record<DocumentType, string> = {
  manual: 'Manual',
  sop: 'SOP',
  incident: 'Incident',
  regulation: 'Regulation',
  work_order: 'Work Order',
  inspection: 'Inspection',
  image: 'Image',
  other: 'Other',
};

export const DOC_TYPE_PILL_CLASSES: Record<DocumentType, string> = {
  manual: 'bg-blue-100 text-blue-700 dark:bg-blue-900/40 dark:text-blue-300',
  sop: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300',
  incident: 'bg-red-100 text-red-700 dark:bg-red-900/40 dark:text-red-300',
  regulation: 'bg-violet-100 text-violet-700 dark:bg-violet-900/40 dark:text-violet-300',
  work_order: 'bg-orange-100 text-orange-700 dark:bg-orange-900/40 dark:text-orange-300',
  inspection: 'bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-300',
  image: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
  other: 'bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};
