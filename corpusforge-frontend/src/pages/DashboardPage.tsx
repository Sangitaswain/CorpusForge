import { useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, FileText, Share2, ShieldCheck } from 'lucide-react';
import { useDocuments } from '../hooks/useDocuments';
import { useCompliance, usePatterns } from '../hooks/useIntelligence';
import { useGraph } from '../hooks/useGraph';
import {
  countCriticalFindings,
  countRecentUploads,
  countRiskBySeverity,
  getRecentActivity,
  getTopFindings,
} from '../utils/dashboardStats';
import KPICard from '../components/dashboard/KPICard';
import SystemStatusStrip from '../components/dashboard/SystemStatusStrip';
import AiInsightsPanel from '../components/dashboard/AiInsightsPanel';
import RecentActivityFeed from '../components/dashboard/RecentActivityFeed';
import QuickAskCard from '../components/dashboard/QuickAskCard';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 18) return 'Good afternoon';
  return 'Good evening';
}

export default function DashboardPage() {
  const navigate = useNavigate();
  const documentsQuery = useDocuments();
  const patternsQuery = usePatterns();
  const complianceQuery = useCompliance();
  const graphQuery = useGraph();

  const { data: documents, isLoading: documentsLoading, error: documentsError } = documentsQuery;
  const { data: patterns, isLoading: patternsLoading } = patternsQuery;
  const { data: compliance, isLoading: complianceLoading } = complianceQuery;
  const { data: graph, isLoading: graphLoading } = graphQuery;

  const isLoading = documentsLoading || patternsLoading || complianceLoading || graphLoading;

  const docs = useMemo(() => documents ?? [], [documents]);
  const pats = useMemo(() => patterns ?? [], [patterns]);
  const gaps = useMemo(() => compliance?.gaps ?? [], [compliance]);

  const totalDocuments = docs.length;
  const totalEntities = docs.reduce((sum, d) => sum + d.entity_count, 0);
  const recentUploads = countRecentUploads(docs);
  const relationshipCount = graph?.edge_count ?? 0;

  const complianceScore =
    compliance && compliance.summary.total_clauses > 0
      ? Math.round((compliance.summary.compliant / compliance.summary.total_clauses) * 100)
      : null;

  const risk = countRiskBySeverity(pats, gaps);
  const criticalCount = countCriticalFindings(pats, gaps);

  const topFindings = useMemo(() => getTopFindings(pats, gaps, 5), [pats, gaps]);
  const recentActivity = useMemo(() => getRecentActivity(docs, pats, gaps, 5), [docs, pats, gaps]);

  const lastSyncedAt =
    Math.max(documentsQuery.dataUpdatedAt, patternsQuery.dataUpdatedAt, complianceQuery.dataUpdatedAt, graphQuery.dataUpdatedAt) ||
    null;
  const processingCount = docs.filter((d) => d.status === 'processing').length;
  const failedCount = docs.filter((d) => d.status === 'failed').length;

  return (
    <div className="pt-6 px-4 sm:px-6 pb-10 max-w-[1280px] mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">{getGreeting()}, Operator</h1>
      <p className={`text-sm mt-1 ${criticalCount > 0 ? 'font-medium text-red-500' : 'text-text-muted'}`}>
        {criticalCount > 0
          ? `${criticalCount} critical issue${criticalCount === 1 ? '' : 's'} need${criticalCount === 1 ? 's' : ''} your attention.`
          : 'All systems normal.'}
      </p>

      {documentsError && (
        <div className="mt-6">
          <ErrorBanner message={documentsError.message} />
        </div>
      )}
      {isLoading && (
        <div className="mt-6">
          <LoadingSpinner />
        </div>
      )}

      {!isLoading && !documentsError && (
        <div className="flex flex-col gap-6 mt-6">
          <SystemStatusStrip processingCount={processingCount} failedCount={failedCount} lastSyncedAt={lastSyncedAt} />

          <div className="grid grid-cols-2 lg:grid-cols-4 gap-6">
            <KPICard
              title="Documents"
              value={totalDocuments}
              icon={FileText}
              caption={recentUploads > 0 ? `+${recentUploads} in the last 24h` : 'No uploads in the last 24h'}
            />
            <KPICard
              title="AI Knowledge"
              value={totalEntities.toLocaleString()}
              icon={Share2}
              caption={`${relationshipCount.toLocaleString()} relationships mapped`}
            />
            <KPICard
              title="Operational Risks"
              value={risk.total}
              icon={AlertTriangle}
              valueTone={risk.critical > 0 ? 'critical' : 'default'}
              caption={
                totalDocuments === 0
                  ? 'Upload documents to get started'
                  : risk.total > 0
                    ? `${risk.critical} Critical · ${risk.high} High`
                    : 'No risks detected'
              }
            />
            <KPICard
              title="Compliance"
              value={complianceScore !== null ? `${complianceScore}%` : '—'}
              icon={ShieldCheck}
              ring={complianceScore ?? undefined}
              caption={
                compliance && compliance.summary.total_clauses > 0
                  ? `${compliance.summary.compliant} compliant · ${compliance.summary.gap} gaps`
                  : 'Run a compliance check to see this'
              }
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div
              className={`bg-bg-surface rounded-lg p-5 border ${
                topFindings.length > 0 ? 'border-border-default border-l-4 border-l-red-500' : 'border-border-default'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-baseline gap-2">
                  <h2 className="text-lg font-semibold text-text-primary">AI Insights</h2>
                  {topFindings.length > 0 && (
                    <span className="text-xs text-text-muted">{topFindings.length} active</span>
                  )}
                </div>
                <button onClick={() => navigate('/intelligence')} className="text-xs text-accent-teal hover:underline">
                  View All →
                </button>
              </div>
              <div className="mt-2">
                <AiInsightsPanel findings={topFindings} />
              </div>
            </div>

            <div className="bg-bg-surface border border-border-default rounded-lg p-5">
              <div className="flex items-center justify-between">
                <h2 className="text-lg font-semibold text-text-primary">Recent Activity</h2>
                <button onClick={() => navigate('/documents')} className="text-xs text-accent-teal hover:underline">
                  View All →
                </button>
              </div>
              <div className="mt-2">
                <RecentActivityFeed events={recentActivity} />
              </div>
            </div>
          </div>

          <QuickAskCard />
        </div>
      )}
    </div>
  );
}
