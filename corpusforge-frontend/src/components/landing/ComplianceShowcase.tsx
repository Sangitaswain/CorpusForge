import { useEffect, useState } from 'react';
import { useCompliance } from '../../hooks/useIntelligence';
import GapCard from '../intelligence/GapCard';
import { useRevealOnScroll } from './useRevealOnScroll';

const BEATS = ['Clause', 'Comparison', 'Evaluation', 'Verdict'];

// Prefers to show a real determined verdict (gap/outdated/compliant) if one exists in the
// current run. If every clause is still 'undetermined' (e.g. the comparison step hasn't
// completed), that is shown honestly as a mechanism proof instead of dressing it up as a
// finding that didn't actually happen. The beats stage the reveal of whichever is true.
export default function ComplianceShowcase() {
  const { data, isLoading } = useCompliance();
  const gaps = data?.gaps ?? [];
  const determined = gaps.find((g) => g.verdict !== 'undetermined');
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [beatIndex, setBeatIndex] = useState(-1);

  useEffect(() => {
    if (!visible || !data) return;
    if (beatIndex >= BEATS.length - 1) return;
    const t = setTimeout(() => setBeatIndex((i) => i + 1), beatIndex === -1 ? 150 : 350);
    return () => clearTimeout(t);
  }, [visible, data, beatIndex]);

  if (isLoading) {
    return <p className="text-sm text-text-muted text-center">Loading compliance results…</p>;
  }

  const revealed = beatIndex >= BEATS.length - 1;
  const beatsRow = (
    <div className="flex items-center gap-2 flex-wrap justify-center mb-4">
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
  );

  if (determined) {
    return (
      <div ref={ref} className="max-w-2xl mx-auto">
        {beatsRow}
        <div className={`transition-all duration-500 ${revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}>
          <GapCard gap={determined} />
        </div>
      </div>
    );
  }

  const sample = gaps[0];
  return (
    <div ref={ref} className="max-w-2xl mx-auto">
      {beatsRow}
      <div
        className={`bg-bg-surface border border-border-default rounded-lg p-5 transition-all duration-500 ${
          revealed ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
        }`}
      >
        <p className="text-xs font-medium text-text-muted uppercase tracking-wider">
          {data ? `${data.summary.total_clauses} regulatory clauses extracted automatically` : 'Compliance Gap Detection'}
        </p>
        {sample && (
          <div className="bg-bg-elevated rounded-lg p-3 mt-3">
            <p className="text-2xs font-medium text-text-muted uppercase tracking-wider">
              {sample.regulation_ref} · Clause {sample.clause_number}
            </p>
            <p className="text-sm text-text-primary mt-1.5">{sample.clause_text}</p>
          </div>
        )}
        <p className="text-xs text-text-secondary mt-3">
          Each clause is automatically matched against the plant procedure meant to cover it. A
          clause the comparison step can't yet confirm is marked undetermined, never guessed at —
          the same partial-failure protection used everywhere else in the system.
        </p>
      </div>
    </div>
  );
}
