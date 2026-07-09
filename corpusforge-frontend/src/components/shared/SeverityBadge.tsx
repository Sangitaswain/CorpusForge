import type { Severity } from '../../types/intelligence';

// Tailwind pairs per UI_Design_System.md §2.3 Severity Scale (dual-theme spec)
const STYLES: Record<Severity, { pill: string; dot: string }> = {
  'Audit-Critical': { pill: 'bg-red-100 text-red-900 font-bold dark:bg-red-950 dark:text-red-300', dot: 'bg-red-500' },
  Critical: { pill: 'bg-red-50 text-red-800 dark:bg-red-900 dark:text-red-300', dot: 'bg-red-400' },
  High: { pill: 'bg-orange-50 text-orange-800 dark:bg-orange-900 dark:text-orange-300', dot: 'bg-orange-400' },
  Medium: { pill: 'bg-amber-50 text-amber-800 dark:bg-amber-900 dark:text-amber-300', dot: 'bg-amber-400' },
  Low: { pill: 'bg-green-50 text-green-800 dark:bg-green-900 dark:text-green-300', dot: 'bg-green-400' },
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
