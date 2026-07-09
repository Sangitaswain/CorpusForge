import type { Confidence } from '../../types/query';

const STYLES: Record<Confidence, { pill: string; dot: string }> = {
  High: { pill: 'bg-green-100 text-green-700 dark:bg-green-900/50 dark:text-green-400', dot: 'bg-green-400' },
  Medium: { pill: 'bg-amber-100 text-amber-700 dark:bg-amber-900/50 dark:text-amber-400', dot: 'bg-amber-400' },
  Low: { pill: 'bg-red-100 text-red-700 dark:bg-red-900/50 dark:text-red-400', dot: 'bg-red-400' },
};

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  const style = STYLES[confidence];
  return (
    <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold ${style.pill}`}>
      <span className={`w-1.5 h-1.5 rounded-full ${style.dot}`} />
      {confidence} confidence
    </span>
  );
}
