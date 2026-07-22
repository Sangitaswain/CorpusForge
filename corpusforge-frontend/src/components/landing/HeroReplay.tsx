import { useEffect, useState } from 'react';
import { Search, Share2 } from 'lucide-react';
import CitationChip from '../shared/CitationChip';
import ConfidenceBadge from '../shared/ConfidenceBadge';

const QUESTION = 'Why did Pump P-101 fail in July 2022?';
const ANSWER =
  "P-101's Drive End bearing seized after a high-vibration trip on 15 July 2022. SKF's failure " +
  'analysis (Ref SKF-FA-2022-0716) found mineral-based grease had been used instead of the ' +
  'specified Chevron SRI-2 synthetic grease during re-greasing five days earlier under Work Order ' +
  'WO-2022-0710 — the wrong grease degraded at operating temperature and starved the bearing.';

const CITATION = { document_id: '46025b90-549e-4f9b-afb7-9f657f03f97e', filename: 'INC-2022-07_P101_Bearing_Failure.txt', page_number: 1 };

type Stage = 'typing-q' | 'searching' | 'graph' | 'typing-a' | 'done';

interface HeroReplayProps {
  documentCount: number;
}

// Replays a real, previously-verified Copilot answer as a scripted animation. This is
// deliberately NOT a live Gemini call on page load — the free tier's ~20 req/day budget has
// to be reserved for the actual product, not for every landing page visit.
export default function HeroReplay({ documentCount }: HeroReplayProps) {
  const [stage, setStage] = useState<Stage>('typing-q');
  const [qChars, setQChars] = useState(0);
  const [aChars, setACharS] = useState(0);

  useEffect(() => {
    if (stage !== 'typing-q') return;
    if (qChars >= QUESTION.length) {
      const t = setTimeout(() => setStage('searching'), 400);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setQChars((c) => c + 1), 28);
    return () => clearTimeout(t);
  }, [stage, qChars]);

  useEffect(() => {
    if (stage !== 'searching') return;
    const t = setTimeout(() => setStage('graph'), 900);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'graph') return;
    const t = setTimeout(() => setStage('typing-a'), 900);
    return () => clearTimeout(t);
  }, [stage]);

  useEffect(() => {
    if (stage !== 'typing-a') return;
    if (aChars >= ANSWER.length) {
      const t = setTimeout(() => setStage('done'), 200);
      return () => clearTimeout(t);
    }
    const t = setTimeout(() => setACharS((c) => c + 2), 8);
    return () => clearTimeout(t);
  }, [stage, aChars]);

  // Loop the whole replay so the hero stays alive for visitors who linger.
  useEffect(() => {
    if (stage !== 'done') return;
    const t = setTimeout(() => {
      setQChars(0);
      setACharS(0);
      setStage('typing-q');
    }, 4500);
    return () => clearTimeout(t);
  }, [stage]);

  return (
    <div className="bg-bg-surface border border-border-default rounded-2xl shadow-elevated dark:shadow-none text-left w-full max-w-[640px] mx-auto overflow-hidden">
      <div className="flex items-center gap-2 px-4 h-10 border-b border-border-subtle">
        <Search size={13} className="text-text-muted" />
        <span className="text-2xs font-mono text-text-muted">Ask Forge — live on the corpus</span>
      </div>
      <div className="px-5 py-4 min-h-[168px]">
        <p className="text-sm text-text-primary font-medium">
          {QUESTION.slice(0, qChars)}
          {stage === 'typing-q' && <span className="inline-block w-[2px] h-4 bg-accent-teal ml-0.5 align-middle animate-pulse" />}
        </p>

        {stage === 'searching' && (
          <p className="text-xs text-text-muted mt-3 font-mono">
            Searching {documentCount} document{documentCount === 1 ? '' : 's'}…
          </p>
        )}

        {stage === 'graph' && (
          <p className="text-xs text-text-muted mt-3 font-mono flex items-center gap-1.5">
            <Share2 size={12} className="text-accent-teal animate-pulse" />
            Cross-referencing knowledge graph…
          </p>
        )}

        {(stage === 'typing-a' || stage === 'done') && (
          <div className="mt-3 pt-3 border-t border-border-subtle">
            <p className="text-sm text-text-secondary leading-relaxed">
              {ANSWER.slice(0, aChars)}
              {stage === 'typing-a' && <span className="inline-block w-[2px] h-4 bg-accent-teal ml-0.5 align-middle animate-pulse" />}
            </p>
            {stage === 'done' && (
              <>
                <div className="mt-3">
                  <CitationChip citation={CITATION} />
                </div>
                <div className="mt-3 pt-3 border-t-2 border-border-strong">
                  <ConfidenceBadge confidence="High" />
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
