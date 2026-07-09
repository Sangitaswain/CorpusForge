import { formatRelativeTime } from '../../utils/dashboardStats';

interface SystemStatusStripProps {
  patternsLastRun: string | null;
  complianceLastRun: string | null;
}

export default function SystemStatusStrip({ patternsLastRun, complianceLastRun }: SystemStatusStripProps) {
  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-text-muted">
      <span>Patterns last run: {formatRelativeTime(patternsLastRun)}</span>
      <span className="text-border-strong">·</span>
      <span>Compliance last run: {formatRelativeTime(complianceLastRun)}</span>
    </div>
  );
}
