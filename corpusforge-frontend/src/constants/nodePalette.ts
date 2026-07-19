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
  work_order: '#5D5FCF',
  // NODE-5 — date/parameter/other intentionally share this quiet neutral color; they are
  // differentiated by shape, not color (parameter rising to critical on exceedance is a
  // separate, not-yet-implemented rule — see NODE-4 deferral note in NodeDetailPanel work).
  date: '#7C838C',
  parameter: '#7C838C',
  other: '#7C838C',
};
