import { Loader2, RefreshCw } from 'lucide-react';

interface RunButtonProps {
  onRun: () => void;
  isRunning: boolean;
  lastRunAt: string | null;
}

export default function RunButton({ onRun, isRunning, lastRunAt }: RunButtonProps) {
  return (
    <div className="flex items-center justify-between">
      <div>
        <h1 className="text-2xl font-semibold text-text-primary">Failure Patterns</h1>
        <p className="text-xs text-text-muted mt-1">
          {lastRunAt ? `Last run: ${new Date(lastRunAt).toLocaleString()}` : 'Analysis has not been run yet'}
        </p>
      </div>
      <button
        onClick={onRun}
        disabled={isRunning}
        className="inline-flex items-center gap-2 bg-accent-orange hover:bg-accent-orange-bright disabled:opacity-60 text-white font-semibold text-sm px-4 py-2 rounded-md transition-fast min-h-[44px]"
      >
        {isRunning ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
        {isRunning ? 'Analyzing…' : 'Re-run Analysis'}
      </button>
    </div>
  );
}
