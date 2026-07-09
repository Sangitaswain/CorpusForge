import type { DocTypeCount } from '../../utils/dashboardStats';

export default function DocumentTypeBreakdown({ counts }: { counts: DocTypeCount[] }) {
  if (counts.length === 0) {
    return <p className="text-sm text-text-muted">No documents yet.</p>;
  }
  return (
    <div className="flex flex-wrap gap-2">
      {counts.map((c) => (
        <span
          key={c.docType}
          className="inline-flex items-center gap-1.5 text-xs font-medium px-2.5 py-1 rounded-full bg-bg-elevated text-text-secondary"
        >
          {c.label}
          <span className="font-mono text-text-muted">{c.count}</span>
        </span>
      ))}
    </div>
  );
}
