import { useState } from 'react';
import { FolderOpen } from 'lucide-react';
import type { Document, DocumentStatus } from '../types/document';
import { useDeleteDocument, useDocuments, useUploadDocument } from '../hooks/useDocuments';
import DocumentTable from '../components/documents/DocumentTable';
import UploadZone from '../components/documents/UploadZone';
import StatusTabs from '../components/documents/StatusTabs';
import DocumentTypeBreakdown from '../components/dashboard/DocumentTypeBreakdown';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import { groupByDocType } from '../utils/dashboardStats';

export default function DocumentsPage() {
  const { data: documents, isLoading, error } = useDocuments();
  const upload = useUploadDocument();
  const remove = useDeleteDocument();
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [pendingDelete, setPendingDelete] = useState<Document | null>(null);
  const [statusFilter, setStatusFilter] = useState<DocumentStatus | 'all'>('all');

  const filteredDocuments = (documents ?? []).filter(
    (doc) =>
      statusFilter === 'all' ||
      doc.status === statusFilter ||
      (statusFilter === 'processing' && doc.status === 'queued'),
  );
  const docTypeCounts = groupByDocType(documents ?? []);

  const handleFiles = (files: File[]) => {
    setUploadError(null);
    files.forEach((file) =>
      upload.mutate(file, {
        onError: (err) => setUploadError(err.message),
      }),
    );
  };

  const confirmDelete = () => {
    if (!pendingDelete) return;
    remove.mutate(pendingDelete.id, {
      onError: (err) => setUploadError(err.message),
    });
    setPendingDelete(null);
  };

  return (
    <div className="pt-6 px-4 sm:px-6 pb-10 max-w-[1280px] mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Documents</h1>

      <div className="mt-6">
        <UploadZone onFiles={handleFiles} />
      </div>

      <div className="mt-6 flex flex-col gap-3">
        <StatusTabs active={statusFilter} onChange={setStatusFilter} />
        <DocumentTypeBreakdown counts={docTypeCounts} />
      </div>

      {uploadError && (
        <div className="mt-4">
          <ErrorBanner message={uploadError} onDismiss={() => setUploadError(null)} />
        </div>
      )}

      <div className="mt-6">
        {isLoading ? (
          <LoadingSpinner />
        ) : error ? (
          <ErrorBanner message={error.message} />
        ) : !documents || documents.length === 0 ? (
          <EmptyState
            icon={FolderOpen}
            heading="No documents yet"
            description="Upload your first document to get started."
          />
        ) : (
          <DocumentTable documents={filteredDocuments} onDelete={setPendingDelete} />
        )}
      </div>

      {pendingDelete && (
        <div className="fixed inset-0 z-50 bg-bg-void/80 flex items-center justify-center p-4">
          <div className="bg-bg-surface border border-border-default rounded-xl p-6 max-w-sm w-full">
            <h2 className="text-lg font-semibold text-text-primary">Delete document?</h2>
            <p className="text-sm text-text-secondary mt-2">
              This will remove &ldquo;{pendingDelete.filename}&rdquo; and update the Knowledge Graph, patterns, and
              compliance results.
            </p>
            <div className="flex justify-end gap-2 mt-6">
              <button
                onClick={() => setPendingDelete(null)}
                className="text-text-secondary hover:text-text-primary hover:bg-bg-elevated px-3 py-1.5 rounded-md transition-fast min-h-[44px]"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="bg-red-100 border border-red-600 text-red-700 hover:bg-red-200 dark:bg-red-900/50 dark:text-red-400 dark:hover:bg-red-900 px-4 py-2 rounded-md transition-fast min-h-[44px]"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
