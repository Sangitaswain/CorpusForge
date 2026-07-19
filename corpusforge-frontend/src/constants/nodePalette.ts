import type { NodeType } from '../types/graph';

// Knowledge_Graph_Design_Bible.md IDENT-4 — fixed across both light and dark themes by
// design (not a light/dark CSS-variable pair), chosen so no node hue collides with the
// app's semantic critical/warning colors. NODE-6: this is the single source of truth —
// both tailwind.config.ts's `node-*` keys and utils/constants.ts's NODE_COLORS derive
// from this object. Do not hardcode these hex values anywhere else.
export const NODE_PALETTE: Record<NodeType, string> = {
  equipment: '#3E6FD9',
  incident: '#C24B87',
  procedure: '#1D8A8A',
  regulation: '#7A5FC7',
  person: '#2394B0',
  document: '#7C838C',
  work_order: '#5D5FCF',
};
