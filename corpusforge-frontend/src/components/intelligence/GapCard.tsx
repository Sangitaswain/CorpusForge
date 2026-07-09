import type { ComplianceGap } from '../../types/intelligence';
import SeverityBadge from '../shared/SeverityBadge';
import VerdictBadge from '../shared/VerdictBadge';
import CitationChip from '../shared/CitationChip';

export default function GapCard({ gap }: { gap: ComplianceGap }) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <div className="flex flex-wrap items-center gap-2">
        <SeverityBadge severity={gap.severity} />
        <VerdictBadge verdict={gap.verdict} />
        <span className="text-sm font-semibold text-text-primary">
          {gap.regulation_ref} · Clause {gap.clause_number}
        </span>
      </div>

      <p className="text-sm text-text-secondary mt-3">{gap.explanation}</p>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mt-4">
        <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-3">
          <p className="text-2xs font-medium text-text-muted uppercase tracking-wider">Regulation requires</p>
          <p className="text-sm text-text-primary mt-1.5">{gap.clause_text}</p>
          {gap.regulation_citation && (
            <div className="mt-2">
              <CitationChip citation={gap.regulation_citation} />
            </div>
          )}
        </div>

        <div className="bg-bg-elevated rounded-lg p-3">
          <p className="text-2xs font-medium text-text-muted uppercase tracking-wider">Procedure says</p>
          {gap.procedure_text ? (
            <p className="text-sm text-text-primary mt-1.5">{gap.procedure_text}</p>
          ) : (
            <p className="text-sm text-text-muted italic mt-1.5">No matching procedure found.</p>
          )}
          {gap.procedure_citation && (
            <div className="mt-2">
              <CitationChip citation={gap.procedure_citation} />
            </div>
          )}
        </div>
      </div>

      {gap.recommendation && (
        <div className="bg-accent-teal-wash border-l-2 border-accent-teal p-3 text-xs text-text-secondary mt-4 rounded">
          <span className="font-medium text-text-primary">Recommendation: </span>
          {gap.recommendation}
        </div>
      )}
    </div>
  );
}
