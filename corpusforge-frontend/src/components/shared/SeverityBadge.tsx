import type { Severity } from '../../types/intelligence';

const STYLES: Record<Severity, { pill: string; dot: string }> = {
  Critical: { pill: 'bg-red-900/50 text-red-400', dot: 'bg-red-400' },
  High: { pill: 'bg-orange-900/50 text-orange-400', dot: 'bg-orange-400' },
  Medium: { pill: 'bg-amber-900/50 text-amber-400', dot: 'bg-amber-400' },
  Low: { pill: 'bg-green-900/50 text-green-400', dot: 'bg-green-400' },
};

export default function SeverityBadge({ severity }: { severity: Severity }) {
  const style = STYLES[severity];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {severity}
    </span>
  );
}
