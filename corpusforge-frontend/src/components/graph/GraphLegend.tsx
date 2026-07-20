import type { NodeType } from '../../types/graph';
import { NODE_COLORS, NODE_TYPE_LABELS } from '../../utils/constants';

// NODE-4/PANEL-8 — `date` is deliberately absent: dates never render as canvas nodes (they
// surface only via the NodeDetailPanel Timeline/Coordinate Rail), so a legend swatch for
// them would misleadingly imply otherwise.
const LEGEND_TYPES: NodeType[] = [
  'equipment', 'incident', 'procedure', 'regulation', 'person', 'work_order', 'parameter', 'other',
];

export default function GraphLegend() {
  return (
    <div className="absolute bottom-4 left-4 flex flex-col gap-1.5 bg-bg-surface/90 backdrop-blur border border-border-default rounded-lg p-3">
      {LEGEND_TYPES.map((type) => (
        <div key={type} className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: NODE_COLORS[type] }} />
          <span className="text-xs text-text-secondary">{NODE_TYPE_LABELS[type]}</span>
        </div>
      ))}
    </div>
  );
}
