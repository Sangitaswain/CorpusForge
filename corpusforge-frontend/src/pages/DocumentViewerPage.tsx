import { ArrowLeft } from 'lucide-react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { getDocumentFileUrl } from '../api/documents';
import { useDocuments } from '../hooks/useDocuments';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';

export default function DocumentViewerPage() {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const id = params.get('id');
  const rawPage = params.get('page');
  // Only a genuine positive integer is a valid page — anything else (non-numeric, 0,
  // negative) is treated as "no page" rather than forwarded as-is to the backend, which
  // would otherwise happily build a broken file URL like `?page=NaN`.
  const page = rawPage !== null && /^\d+$/.test(rawPage) && Number(rawPage) >= 1 ? Number(rawPage) : undefined;
  const { data: documents, isLoading } = useDocuments();

  if (!id) {
    return (
      <div className="pt-6 px-6 max-w-3xl mx-auto">
        <ErrorBanner message="No document selected." />
      </div>
    );
  }

  if (isLoading) {
    return <LoadingSpinner />;
  }

  const doc = documents?.find((d) => d.id === id);

  // A citation chip pointing at a document that's since been deleted must degrade to a
  // clear message, not an iframe silently rendering the backend's raw 404 JSON — the doc
  // list has already loaded at this point, so a missing id means genuinely gone, not
  // still-loading.
  if (!doc) {
    return (
      <div className="pt-6 px-6 max-w-3xl mx-auto">
        <button
          onClick={() => navigate(-1)}
          aria-label="Back"
          className="text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md min-h-[44px] min-w-[44px] inline-flex items-center justify-center transition-fast -ml-2 mb-3"
        >
          <ArrowLeft size={18} />
        </button>
        <ErrorBanner message="This document is no longer available — it may have been deleted." />
      </div>
    );
  }

  const fileUrl = getDocumentFileUrl(id, page);

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
        <span className="text-sm font-medium text-text-primary truncate">{doc.filename ?? 'Document'}</span>
        {page && <span className="text-xs text-text-muted">Page {page}</span>}
      </div>
      <iframe src={fileUrl} title={doc.filename ?? 'Document viewer'} className="flex-1 w-full bg-bg-base" />
    </div>
  );
}
