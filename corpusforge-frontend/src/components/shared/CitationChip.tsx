import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Citation } from '../../types/query';

function truncate(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

export default function CitationChip({ citation }: { citation: Citation }) {
  const navigate = useNavigate();
  return (
    <button
      title={citation.filename}
      onClick={() => navigate(`/document-viewer?id=${citation.document_id}&page=${citation.page_number}`)}
      className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-bg-elevated border border-border-default hover:border-accent-teal-bright text-xs font-medium text-text-secondary hover:text-accent-teal-bright cursor-pointer transition-all duration-100 min-h-[28px] sm:min-h-[28px] max-sm:min-h-[44px]"
    >
      <FileText size={10} />
      {truncate(citation.filename)} p.{citation.page_number}
    </button>
  );
}
