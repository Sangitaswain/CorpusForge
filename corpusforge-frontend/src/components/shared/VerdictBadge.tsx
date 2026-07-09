import type { ComplianceVerdict } from '../../types/intelligence';

const STYLES: Record<ComplianceVerdict, string> = {
  gap: 'border-red-500 text-red-700 bg-red-50 dark:text-red-400 dark:bg-red-900/20',
  compliant: 'border-green-500 text-green-700 bg-green-50 dark:text-green-400 dark:bg-green-900/20',
  outdated: 'border-amber-500 text-amber-700 bg-amber-50 dark:text-amber-400 dark:bg-amber-900/20',
  undetermined: 'border-slate-500 text-slate-700 bg-slate-100 dark:text-slate-400 dark:bg-slate-800/20',
};

export default function VerdictBadge({ verdict }: { verdict: ComplianceVerdict }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${STYLES[verdict]}`}>
      {verdict.toUpperCase()}
    </span>
  );
}
