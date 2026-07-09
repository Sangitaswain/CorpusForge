import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDocumentFileUrl } from '../api/documents';
import { useDocuments } from '../hooks/useDocuments';
import ErrorBanner from '../components/shared/ErrorBanner';

export default function DocumentViewerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id');
  const page = params.get('page');
  const { data: documents } = useDocuments();

  if (!id) {
    return (
      <div className="pt-6 px-6 max-w-3xl mx-auto">
        <ErrorBanner message="No document selected." />
      </div>
    );
  }

  const doc = documents?.find((d) => d.id === id);
  const fileUrl = getDocumentFileUrl(id, page ? Number(page) : undefined);

  return (
    <div className="h-full flex flex-col">
      <div className="flex items-center gap-3 bg-bg-void border-b border-border-default px-4 sm:px-6 py-2">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-fast"
        >
          <ArrowLeft size={18} />
        </button>
        <span className="text-sm font-medium text-text-primary truncate">{doc?.filename ?? 'Document'}</span>
        {page && <span className="text-xs text-text-muted">Page {page}</span>}
      </div>
      <iframe src={fileUrl} title={doc?.filename ?? 'Document viewer'} className="flex-1 w-full bg-bg-base" />
    </div>
  );
}
