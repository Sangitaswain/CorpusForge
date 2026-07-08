import type { Pattern } from '../../types/intelligence';
import CitationChip from '../shared/CitationChip';

export default function PatternDetail({ pattern }: { pattern: Pattern }) {
  return (
    <div className="mt-4 pt-4 border-t border-border-subtle">
      <p className="text-sm text-text-secondary">{pattern.root_cause}</p>

      <p className="text-xs text-text-muted mt-3">
        Supporting incidents ({pattern.citations.length}):
      </p>
      <div className="flex flex-wrap gap-1.5 mt-1.5">
        {pattern.citations.map((citation) => (
          <CitationChip key={citation.document_id} citation={citation} />
        ))}
      </div>

      <p className="text-xs text-text-muted mt-3">
        Detected: {new Date(pattern.created_at).toLocaleString()}
      </p>
    </div>
  );
}
