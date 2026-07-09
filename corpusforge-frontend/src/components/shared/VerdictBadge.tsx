import type { ComplianceVerdict } from '../../types/intelligence';

const STYLES: Record<ComplianceVerdict, string> = {
  gap: 'border-red-500 text-red-400 bg-red-900/20',
  compliant: 'border-green-500 text-green-400 bg-green-900/20',
  outdated: 'border-amber-500 text-amber-400 bg-amber-900/20',
  undetermined: 'border-slate-500 text-slate-400 bg-slate-800/20',
};

export default function VerdictBadge({ verdict }: { verdict: ComplianceVerdict }) {
  return (
    <span className={`px-2 py-0.5 rounded text-xs font-semibold border ${STYLES[verdict]}`}>
      {verdict.toUpperCase()}
    </span>
  );
}
