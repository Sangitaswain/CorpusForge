import { Trash2 } from 'lucide-react';
import type { Document, DocumentType } from '../../types/document';
import { useDocumentStatus } from '../../hooks/useDocuments';
import StatusIndicator from './StatusIndicator';

const TYPE_PILL_CLASSES: Record<DocumentType, string> = {
  manual: 'bg-blue-900/40 text-blue-300',
  sop: 'bg-emerald-900/40 text-emerald-300',
  incident: 'bg-red-900/40 text-red-300',
  regulation: 'bg-violet-900/40 text-violet-300',
  work_order: 'bg-orange-900/40 text-orange-300',
  inspection: 'bg-amber-900/40 text-amber-300',
  image: 'bg-slate-800 text-slate-300',
  other: 'bg-slate-800 text-slate-300',
};

const TYPE_LABELS: Record<DocumentType, string> = {
  manual: 'Manual',
  sop: 'SOP',
  incident: 'Incident',
  regulation: 'Regulation',
  work_order: 'Work Order',
  inspection: 'Inspection',
  image: 'Image',
  other: 'Other',
};

interface DocumentRowProps {
  document: Document;
  onDelete: (doc: Document) => void;
}

export default function DocumentRow({ document, onDelete }: DocumentRowProps) {
  const { data: liveStatus } = useDocumentStatus(
    document.id,
    document.status === 'processing' || document.status === 'queued',
  );
  const status = liveStatus?.status ?? document.status;
  const entityCount = liveStatus?.entity_count ?? document.entity_count;
  const errorMsg = liveStatus?.error_msg ?? document.error_msg;
  const settled = status === 'done';

  return (
    <tr className="group bg-bg-surface border-b border-border-subtle hover:bg-bg-elevated transition-fast">
      <td className="px-4 py-3 text-sm text-text-primary max-w-[240px] truncate">{document.filename}</td>
      <td className="px-4 py-3">
        {document.doc_type ? (
          <span className={`inline-block text-xs font-medium px-2 py-0.5 rounded-sm ${TYPE_PILL_CLASSES[document.doc_type]}`}>
            {TYPE_LABELS[document.doc_type]}
          </span>
        ) : (
          <span className="text-sm text-text-muted">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <StatusIndicator status={status} errorMsg={errorMsg ?? undefined} />
        {status === 'failed' && errorMsg && (
          <div className="text-xs text-red-400/80 mt-1 max-w-[220px] truncate" title={errorMsg}>
            {errorMsg}
          </div>
        )}
      </td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{settled ? document.page_count : '—'}</td>
      <td className="px-4 py-3 font-mono text-xs text-text-secondary">{settled ? entityCount : '—'}</td>
      <td className="px-4 py-3 text-right">
        <button
          onClick={() => onDelete(document)}
          aria-label={`Delete ${document.filename}`}
          className="opacity-0 group-hover:opacity-100 focus:opacity-100 text-text-secondary hover:text-red-400 hover:bg-bg-elevated rounded-md min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-fast"
        >
          <Trash2 size={16} />
        </button>
      </td>
    </tr>
  );
}
