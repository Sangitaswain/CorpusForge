import { useEffect, useState } from 'react';
import { SearchX } from 'lucide-react';
import { usePatterns, useRunPatternAnalysis } from '../hooks/useIntelligence';
import PatternCard from '../components/intelligence/PatternCard';
import RunButton from '../components/intelligence/RunButton';
import EmptyState from '../components/shared/EmptyState';
import ErrorBanner from '../components/shared/ErrorBanner';
import LoadingSpinner from '../components/shared/LoadingSpinner';

const ANALYSIS_POLL_TIMEOUT_MS = 45_000;

export default function IntelligencePage() {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const { data: patterns, isLoading, error, refetch } = usePatterns();
  const runAnalysis = useRunPatternAnalysis();

  useEffect(() => {
    if (!isAnalyzing) return;
    const interval = setInterval(refetch, 4000);
    const timeout = setTimeout(() => setIsAnalyzing(false), ANALYSIS_POLL_TIMEOUT_MS);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [isAnalyzing, refetch]);

  const handleRun = () => {
    setIsAnalyzing(true);
    runAnalysis.mutate();
  };

  const lastRunAt = patterns?.reduce<string | null>(
    (latest, p) => (!latest || (p.last_run_at && p.last_run_at > latest) ? p.last_run_at : latest),
    null,
  ) ?? null;

  return (
    <div className="pt-20 px-6 pb-6 max-w-4xl mx-auto">
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
    </div>
  );
}
