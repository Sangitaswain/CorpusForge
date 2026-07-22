import { useEffect, useState } from 'react';
import { usePatterns } from '../../hooks/useIntelligence';
import PatternCard from '../intelligence/PatternCard';
import { useRevealOnScroll } from './useRevealOnScroll';

const BEATS = ['Incident', 'Correlation', 'Pattern emerges', 'Root cause', 'Recommendation'];

// Real data, real component — whatever the Pattern Engine has actually detected in this corpus
// right now. No fabricated "example" pattern; if nothing has been detected yet, say so honestly
// rather than showing a fake result. The beats above stage the reveal of that real result —
// they don't simulate a live computation that isn't happening.
export default function PatternShowcase() {
  const { data: patterns, isLoading } = usePatterns();
  const top = patterns?.[0];
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [beatIndex, setBeatIndex] = useState(-1);

  useEffect(() => {
    if (!visible || !top) return;
    if (beatIndex >= BEATS.length - 1) return;
    const t = setTimeout(() => setBeatIndex((i) => i + 1), beatIndex === -1 ? 150 : 350);
    return () => clearTimeout(t);
  }, [visible, top, beatIndex]);

  if (isLoading) {
    return <p className="text-sm text-text-muted text-center">Loading detected patterns…</p>;
  }

  if (!top) {
    return (
      <p className="text-sm text-text-muted text-center max-w-md mx-auto">
        No recurring failure pattern has been detected in the current corpus yet.
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
        <PatternCard pattern={top} />
      </div>
    </div>
  );
}
