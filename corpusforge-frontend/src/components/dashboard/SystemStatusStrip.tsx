import { formatRelativeTime } from '../../utils/dashboardStats';

interface SystemStatusStripProps {
  processingCount: number;
  failedCount: number;
  lastSyncedAt: number | null;
}

export default function SystemStatusStrip({ processingCount, failedCount, lastSyncedAt }: SystemStatusStripProps) {
  const healthy = failedCount === 0;
  return (
    <div className="flex items-center justify-between flex-wrap gap-x-4 gap-y-1 text-xs">
      <span className="flex items-center gap-1.5 text-text-secondary">
        <span className={`w-1.5 h-1.5 rounded-full ${healthy ? 'bg-green-500' : 'bg-accent-orange'}`} />
        Bharat Refineries Ltd. ·{' '}
        {healthy ? 'System Optimal' : `${failedCount} document${failedCount === 1 ? '' : 's'} need attention`}
      </span>
      <span className="flex items-center gap-3 text-text-muted">
        <span className="flex items-center gap-1.5">
          <span className={`w-1.5 h-1.5 rounded-full ${processingCount > 0 ? 'bg-accent-teal animate-pulse' : 'bg-green-500'}`} />
          AI Processing · {processingCount > 0 ? `${processingCount} in progress` : 'Online'}
        </span>
        <span className="text-border-strong">|</span>
        <span>Last synced {formatRelativeTime(lastSyncedAt)}</span>
      </span>
    </div>
  );
}
