import { useEffect, useRef, useState } from 'react';
import { Download, Loader2, RefreshCw, SearchX, ShieldCheck } from 'lucide-react';
import { usePatterns, useRunPatternAnalysis, useCompliance, useRunComplianceCheck } from '../hooks/useIntelligence';
import { exportComplianceReport } from '../api/intelligence';
import PatternCard from '../components/intelligence/PatternCard';
import RunButton from '../components/intelligence/RunButton';
import GapCard from '../components/intelligence/GapCard';
import ComplianceSummaryBoxes from '../components/intelligence/ComplianceSummary';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';
import type { ComplianceVerdict } from '../types/intelligence';

// Gemini free tier is 15 req/min, so a run's wall-clock time scales with how
// many rate-limited calls it makes (one per regulation clause, or per pattern
// cluster) — a handful of clauses/clusters can already exceed a minute.
const POLL_TIMEOUT_MS = 180_000;
const POLL_INTERVAL_MS = 4_000;

type Tab = 'patterns' | 'compliance';

export default function IntelligencePage() {
  const [tab, setTab] = useState<Tab>('patterns');

  return (
    <div className="pt-6 px-6 pb-6 max-w-4xl mx-auto">
      <h1 className="text-2xl font-semibold text-text-primary">Intelligence</h1>

      <div className="flex gap-6 mt-4 border-b border-border-default overflow-x-auto">
        <TabButton label="Failure Patterns" active={tab === 'patterns'} onClick={() => setTab('patterns')} />
        <TabButton label="Compliance Gaps" active={tab === 'compliance'} onClick={() => setTab('compliance')} />
      </div>

      <div className="mt-6">{tab === 'patterns' ? <FailurePatternsTab /> : <ComplianceGapsTab />}</div>
    </div>
  );
}

function TabButton({ label, active, onClick }: { label: string; active: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className={`text-sm pb-3 -mb-px border-b-2 whitespace-nowrap min-h-[44px] transition-fast ${
        active
          ? 'text-text-primary font-semibold border-accent-teal'
          : 'text-text-secondary font-medium border-transparent hover:text-text-primary'
      }`}
    >
      {label}
    </button>
  );
}

function FailurePatternsTab() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { data: patterns, isLoading, error, refetch } = usePatterns();
  const runAnalysis = useRunPatternAnalysis();
  const baselineLastRunAt = useRef<string | null>(null);

  const lastRunAt =
    patterns?.reduce<string | null>(
      (latest, p) => (!latest || (p.last_run_at && p.last_run_at > latest) ? p.last_run_at : latest),
      null,
    ) ?? null;

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    const timeout = setTimeout(() => setIsAnalyzing(false), POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isAnalyzing, refetch]);

  // Stop polling as soon as a freshly-fetched last_run_at shows the run actually finished,
  // instead of always waiting out the full POLL_TIMEOUT_MS fallback. A run that finds
  // genuinely zero patterns has no row to carry a fresh timestamp on, so the timeout above
  // stays as the fallback for that case specifically.
  useEffect(() => {
    if (isAnalyzing && lastRunAt !== baselineLastRunAt.current) {
      setIsAnalyzing(false);
    }
  }, [isAnalyzing, lastRunAt]);

  const handleRun = () => {
    baselineLastRunAt.current = lastRunAt;
    setIsAnalyzing(true);
    runAnalysis.mutate();
  };

  return (
    <>
      <p className="text-sm text-text-muted mb-4">
        Finds recurring root causes across incident reports — even when no single report says the cause outright.
      </p>
      <RunButton onRun={handleRun} isRunning={isAnalyzing} lastRunAt={lastRunAt} />

      <div className="mt-6 flex flex-col gap-4">
        {isLoading && <LoadingSpinner />}
        {error && <ErrorBanner message={error.message} />}
        {!isLoading && !error && patterns?.length === 0 && (
          <EmptyState
            icon={SearchX}
            heading="No patterns detected yet"
            description="Run the analysis to search uploaded incident reports for recurring failure patterns."
            actionLabel="Re-run Analysis"
            onAction={handleRun}
          />
        )}
        {patterns?.map((pattern) => (
          <PatternCard key={pattern.id} pattern={pattern} />
        ))}
      </div>
    </>
  );
}

function ComplianceGapsTab() {
  const [isChecking, setIsChecking] = useState(false);
  const [verdictFilter, setVerdictFilter] = useState<'all' | ComplianceVerdict>('all');
  const [regulationFilter, setRegulationFilter] = useState<string>('all');
  const [exportError, setExportError] = useState<string | null>(null);
  const { data, isLoading, error, refetch } = useCompliance();
  const runCheck = useRunComplianceCheck();
  const baselineLastRunAt = useRef<string | null>(null);

  useEffect(() => {
    if (!isChecking) return;
    const interval = setInterval(refetch, POLL_INTERVAL_MS);
    const timeout = setTimeout(() => setIsChecking(false), POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isChecking, refetch]);

  // Same early-clear as FailurePatternsTab: stop polling once summary.last_run_at moves,
  // instead of always waiting out the full POLL_TIMEOUT_MS fallback.
  useEffect(() => {
    const lastRunAt = data?.summary.last_run_at ?? null;
    if (isChecking && lastRunAt !== baselineLastRunAt.current) {
      setIsChecking(false);
    }
  }, [isChecking, data]);

  const handleRun = () => {
    baselineLastRunAt.current = data?.summary.last_run_at ?? null;
    setIsChecking(true);
    runCheck.mutate();
  };

  const handleExport = async () => {
    setExportError(null);
    try {
      const blob = await exportComplianceReport();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `CorpusForge_Compliance_Report_${new Date().toISOString().split('T')[0]}.txt`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err) {
      setExportError(err instanceof Error ? err.message : 'Export failed. Please try again.');
    }
  };

  const gaps = data?.gaps ?? [];
  const regulations = Array.from(new Set(gaps.map((g) => g.regulation_ref))).sort();
  const filteredGaps = gaps.filter(
    (g) =>
      (verdictFilter === 'all' || g.verdict === verdictFilter) &&
      (regulationFilter === 'all' || g.regulation_ref === regulationFilter),
  );

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-text-primary">Compliance Gaps</h2>
          <p className="text-xs text-text-muted mt-1">
            {data?.summary.last_run_at
              ? `Last run: ${new Date(data.summary.last_run_at).toLocaleString()}`
              : 'Analysis has not been run yet'}
          </p>
          <p className="text-sm text-text-muted mt-2">
            Compares your procedures against regulations and flags where they don't match.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={handleRun}
            disabled={isChecking}
            className="inline-flex items-center gap-2 bg-accent-orange hover:bg-accent-orange-bright disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
          >
            {isChecking ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
            {isChecking ? 'Checking…' : 'Re-run'}
          </button>
          <button
            onClick={handleExport}
            disabled={gaps.length === 0}
            className="inline-flex items-center gap-2 border border-accent-teal text-accent-teal hover:bg-accent-teal-wash disabled:opacity-40 disabled:cursor-not-allowed font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
          >
            <Download size={16} />
            Export Report
          </button>
        </div>
      </div>

      {isLoading && <LoadingSpinner />}
      {error && <ErrorBanner message={error.message} />}
      {exportError && <ErrorBanner message={exportError} />}

      {!isLoading && !error && data && (
        <>
          <ComplianceSummaryBoxes summary={data.summary} activeVerdict={verdictFilter} onSelectVerdict={setVerdictFilter} />

          {gaps.length === 0 && (
            <EmptyState
              icon={ShieldCheck}
              heading="No compliance check run yet"
              description="Run the compliance check to compare regulation documents against plant procedures."
              actionLabel="Re-run"
              onAction={handleRun}
            />
          )}

          {gaps.length > 0 && (
            <div className="flex flex-wrap gap-3">
              <select
                value={regulationFilter}
                onChange={(e) => setRegulationFilter(e.target.value)}
                className="bg-bg-surface border border-border-default rounded-md px-3 py-2 text-sm text-text-primary min-h-[44px]"
              >
                <option value="all">All regulations</option>
                {regulations.map((ref) => (
                  <option key={ref} value={ref}>
                    {ref}
                  </option>
                ))}
              </select>
              <select
                value={verdictFilter}
                onChange={(e) => setVerdictFilter(e.target.value as 'all' | ComplianceVerdict)}
                className="bg-bg-surface border border-border-default rounded-md px-3 py-2 text-sm text-text-primary min-h-[44px]"
              >
                <option value="all">All verdicts</option>
                <option value="compliant">Compliant</option>
                <option value="gap">Gap</option>
                <option value="outdated">Outdated</option>
                <option value="undetermined">Undetermined</option>
              </select>
            </div>
          )}

          {gaps.length > 0 && filteredGaps.length === 0 && (
            <p className="text-sm text-text-muted text-center py-8">No gaps match the selected filters.</p>
          )}

          <div className="flex flex-col gap-4">
            {filteredGaps.map((gap) => (
              <GapCard key={gap.id} gap={gap} />
            ))}
          </div>
        </>
      )}
    </div>
  );
}
