import type { ComplianceSummary as ComplianceSummaryData, ComplianceVerdict } from '../../types/intelligence';

interface StatBox {
  key: 'all' | ComplianceVerdict;
  label: string;
  value: number;
  colorClass: string;
}

interface ComplianceSummaryProps {
  summary: ComplianceSummaryData;
  activeVerdict: 'all' | ComplianceVerdict;
  onSelectVerdict: (verdict: 'all' | ComplianceVerdict) => void;
}

export default function ComplianceSummaryBoxes({ summary, activeVerdict, onSelectVerdict }: ComplianceSummaryProps) {
  const boxes: StatBox[] = [
    { key: 'all', label: 'Total', value: summary.total_clauses, colorClass: 'text-text-primary' },
    { key: 'compliant', label: 'Compliant', value: summary.compliant, colorClass: 'text-green-400' },
    { key: 'gap', label: 'Gap', value: summary.gap, colorClass: 'text-red-400' },
    { key: 'outdated', label: 'Outdated', value: summary.outdated, colorClass: 'text-amber-400' },
    { key: 'undetermined', label: 'Undetermined', value: summary.undetermined, colorClass: 'text-slate-400' },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
      {boxes.map((box) => (
        <button
          key={box.key}
          onClick={() => onSelectVerdict(box.key)}
          className={`bg-bg-surface border rounded-lg p-4 text-left transition-fast min-h-[44px] ${
            activeVerdict === box.key ? 'border-accent-teal bg-bg-elevated' : 'border-border-default'
          }`}
        >
          <p className={`text-[32px] font-bold leading-tight ${box.colorClass}`}>{box.value}</p>
          <p className="text-xs font-medium text-text-muted uppercase mt-1">{box.label}</p>
        </button>
      ))}
    </div>
  );
}
