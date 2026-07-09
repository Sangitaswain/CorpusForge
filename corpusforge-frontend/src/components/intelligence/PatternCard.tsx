import { useState } from 'react';
import type { Pattern, Severity } from '../../types/intelligence';
import SeverityBadge from '../shared/SeverityBadge';
import CitationChip from '../shared/CitationChip';
import PatternDetail from './PatternDetail';

const ACCENT_BORDER: Record<Severity, string> = {
  'Audit-Critical': 'border-l-red-400',
  Critical: 'border-l-red-400',
  High: 'border-l-orange-400',
  Medium: 'border-l-amber-400',
  Low: 'border-l-green-400',
};

export default function PatternCard({ pattern }: { pattern: Pattern }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className={`bg-bg-surface border border-border-default border-l-4 ${ACCENT_BORDER[pattern.severity]} rounded-lg p-5`}>
      <div className="flex items-start gap-3">
        <SeverityBadge severity={pattern.severity} />
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-base text-text-primary">{pattern.title}</h3>
          <p className="text-xs text-text-muted mt-0.5">{pattern.incident_count} incidents detected</p>
        </div>
      </div>

      <p className="text-sm text-text-secondary mt-4">
        <span className="font-medium text-text-primary">Root cause: </span>
        {pattern.root_cause}
      </p>

      {pattern.equipment_tags.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-text-muted">Equipment:</span>
          {pattern.equipment_tags.map((tag) => (
            <span key={tag} className="text-xs bg-bg-elevated rounded-full px-2 py-0.5 text-text-secondary">
              {tag}
            </span>
          ))}
        </div>
      )}

      {pattern.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          <span className="text-xs text-text-muted">Evidence:</span>
          {pattern.citations.map((citation) => (
            <CitationChip key={citation.document_id} citation={citation} />
          ))}
        </div>
      )}

      <div className="bg-[#0F2822] border-l-2 border-accent-teal p-3 text-xs text-text-secondary mt-4 rounded">
        <span className="font-medium text-text-primary">Recommendation: </span>
        {pattern.recommendation}
      </div>

      <div className="flex justify-end mt-3">
        <button
          onClick={() => setExpanded((v) => !v)}
          className="text-xs text-accent-teal hover:underline cursor-pointer"
        >
          {expanded ? 'Details ▴' : 'Details ▾'}
        </button>
      </div>

      {expanded && <PatternDetail pattern={pattern} />}
    </div>
  );
}
