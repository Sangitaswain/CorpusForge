import type { NodeType } from '../../types/graph';
import { NODE_COLORS, NODE_TYPE_LABELS } from '../../utils/constants';

// NODE-4/PANEL-8 — `date` is deliberately absent: dates never render as canvas nodes (they
// surface only via the NodeDetailPanel Timeline/Coordinate Rail), so a filter chip for them
// would toggle a `hiddenTypes` entry that never hides anything.
const FILTERABLE: NodeType[] = [
  'equipment', 'incident', 'procedure', 'regulation', 'person', 'work_order', 'parameter', 'other',
];

interface GraphFiltersProps {
  hiddenTypes: Set<NodeType>;
  onToggle: (type: NodeType) => void;
}

export default function GraphFilters({ hiddenTypes, onToggle }: GraphFiltersProps) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {FILTERABLE.map((type) => {
        const active = !hiddenTypes.has(type);
        return (
          <button
            key={type}
            onClick={() => onToggle(type)}
            aria-pressed={active}
            className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition-fast min-h-[32px] max-sm:min-h-[44px] ${
              active
                ? 'border-border-strong text-text-primary bg-bg-elevated'
                : 'border-border-subtle text-text-muted bg-transparent opacity-60'
            }`}
          >
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: NODE_COLORS[type] }} />
            {NODE_TYPE_LABELS[type]}
          </button>
        );
      })}
    </div>
  );
}
