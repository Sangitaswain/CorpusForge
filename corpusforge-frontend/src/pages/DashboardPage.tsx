import { useNavigate } from 'react-router-dom';
import { Bell, FileText, FolderOpen, ShieldCheck, Tags } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useCompliance, usePatterns } from '../hooks/useIntelligence';
import { groupByDocType } from '../utils/dashboardStats';
import KPICard from '../components/dashboard/KPICard';
import GettingStartedChecklist from '../components/dashboard/GettingStartedChecklist';
import QuickActions from '../components/dashboard/QuickActions';
import DocumentTypeBreakdown from '../components/dashboard/DocumentTypeBreakdown';
import SystemStatusStrip from '../components/dashboard/SystemStatusStrip';
import StatusIndicator from '../components/documents/StatusIndicator';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const RECENT_DOCUMENT_COUNT = 5;

export default function DashboardPage() {
  const navigate = useNavigate();
  const { data: documents, isLoading: documentsLoading, error: documentsError } = useDocuments();
  const { data: patterns, isLoading: patternsLoading } = usePatterns();
  const { data: compliance, isLoading: complianceLoading } = useCompliance();

  const isLoading = documentsLoading || patternsLoading || complianceLoading;
  const totalDocuments = documents?.length ?? 0;
  const totalEntities = documents?.reduce((sum, d) => sum + d.entity_count, 0) ?? 0;
  const complianceScore =
    compliance && compliance.summary.total_clauses > 0
      ? Math.round((compliance.summary.compliant / compliance.summary.total_clauses) * 100)
      : null;

  const patternsLastRun =
    patterns?.reduce<string | null>(
      (latest, p) => (!latest || (p.last_run_at && p.last_run_at > latest) ? p.last_run_at : latest),
      null,
    ) ?? null;

  const recentDocuments = [...(documents ?? [])]
    .sort((a, b) => (a.uploaded_at < b.uploaded_at ? 1 : -1))
    .slice(0, RECENT_DOCUMENT_COUNT);

  const docTypeCounts = groupByDocType(documents ?? []);

  const checklistItems = [
    { label: 'Upload a document', done: totalDocuments > 0, to: '/documents' },
    { label: 'Run pattern analysis', done: (patterns?.length ?? 0) > 0, to: '/intelligence' },
    { label: 'Run a compliance check', done: (compliance?.summary.total_clauses ?? 0) > 0, to: '/intelligence' },
  ];

  return (
    <div className="pt-6 px-4 sm:px-6 pb-10 max-w-[1280px] mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Dashboard</h1>
      <p className="text-sm text-text-muted mt-1">Overview of your CorpusForge workspace</p>

      {documentsError && <div className="mt-6"><ErrorBanner message={documentsError.message} /></div>}
      {isLoading && <div className="mt-6"><LoadingSpinner /></div>}

      {!isLoading && !documentsError && (
        <div className="flex flex-col gap-6 mt-6">
          <GettingStartedChecklist items={checklistItems} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <KPICard title="Total Documents" value={totalDocuments} icon={FileText} />
            <KPICard title="Entities Extracted" value={totalEntities} icon={Tags} />
            <KPICard
              title="Compliance Score"
              value={complianceScore !== null ? `${complianceScore}%` : '—'}
              icon={ShieldCheck}
              caption={complianceScore === null ? 'Run a compliance check to see this' : undefined}
            />
            <KPICard title="Active Alerts" value="—" icon={Bell} caption="Coming soon" />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            <div className="bg-bg-surface border border-border-default rounded-lg p-5">
              <h2 className="text-sm font-semibold text-text-primary">Quick Actions</h2>
              <div className="mt-3">
                <QuickActions />
              </div>
            </div>
            <div className="bg-bg-surface border border-border-default rounded-lg p-5">
              <h2 className="text-sm font-semibold text-text-primary">Document Types</h2>
              <div className="mt-3">
                <DocumentTypeBreakdown counts={docTypeCounts} />
              </div>
            </div>
          </div>

          <SystemStatusStrip patternsLastRun={patternsLastRun} complianceLastRun={compliance?.summary.last_run_at ?? null} />

          <div>
            <h2 className="text-lg font-semibold text-text-primary">Recent Documents</h2>

            {recentDocuments.length === 0 ? (
              <EmptyState
                icon={FolderOpen}
                heading="No documents yet"
                description="Upload your first document to get started."
                actionLabel="Upload Files"
                onAction={() => navigate('/documents')}
              />
            ) : (
              <div className="mt-3 bg-bg-surface border border-border-default rounded-lg divide-y divide-border-subtle overflow-hidden">
                {recentDocuments.map((doc) => (
                  <button
                    key={doc.id}
                    onClick={() => navigate('/documents')}
                    className="w-full flex items-center justify-between gap-4 px-4 py-3 text-left hover:bg-bg-elevated transition-fast min-h-[44px]"
                  >
                    <span className="text-sm text-text-primary truncate">{doc.filename}</span>
                    <span className="flex items-center gap-4 shrink-0">
                      <span className="text-xs text-text-muted hidden sm:inline">
                        {new Date(doc.uploaded_at).toLocaleDateString()}
                      </span>
                      <StatusIndicator status={doc.status} errorMsg={doc.error_msg ?? undefined} />
                    </span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
