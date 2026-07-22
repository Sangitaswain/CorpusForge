import { useEffect, useState } from 'react';
import { useAlerts } from '../../hooks/useAlerts';
import AlertCard from '../alerts/AlertCard';
import { useRevealOnScroll } from './useRevealOnScroll';

const BEATS = ['Document arrives', 'Graph updates', 'Pattern score shifts', 'Compliance status shifts', 'Alert fires'];

// Real alert data, staged as cause-and-effect rather than a bare popup — this is the same
// causal chain alert_service.py actually runs (BP-08: cosine similarity > 0.7 between a new
// document and a known pattern triggers the alert), just paced for a viewer to follow.
export default function AlertsShowcase() {
  const { data: alerts, isLoading } = useAlerts();
  const top = alerts?.[0];
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [beatIndex, setBeatIndex] = useState(-1);

  useEffect(() => {
    if (!visible || !top) return;
    if (beatIndex >= BEATS.length - 1) return;
    const t = setTimeout(() => setBeatIndex((i) => i + 1), beatIndex === -1 ? 150 : 400);
    return () => clearTimeout(t);
  }, [visible, top, beatIndex]);

  if (isLoading) {
    return <p className="text-sm text-text-muted text-center">Loading alerts…</p>;
  }

  if (!top) {
    return (
      <p className="text-sm text-text-muted text-center max-w-md mx-auto">
        No active alert in the current corpus right now — the four checks (pattern match,
        outdated procedure, knowledge cliff, no coverage) run automatically after every ingest.
      </p>
    );
  }

  const revealed = beatIndex >= BEATS.length - 1;

  return (
    <div ref={ref} className="max-w-2xl mx-auto flex flex-col items-center gap-4">
      <div className="flex items-center gap-2 flex-wrap justify-center">
        {BEATS.map((beat, i) => (
          <span key={beat} className="flex items-center gap-2">
            <span
              className={`text-2xs font-mono uppercase tracking-wide transition-opacity duration-500 ${
                i <= beatIndex ? 'text-accent-teal opacity-100' : 'text-text-muted opacity-40'
              }`}
            >
              {beat}
            </span>
            {i < BEATS.length - 1 && <span className="text-text-muted text-2xs" aria-hidden="true">→</span>}
          </span>
        ))}
      </div>
      <div className={`w-full transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
        <AlertCard alert={top} onDismiss={() => {}} />
      </div>
    </div>
  );
}
