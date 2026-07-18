import { Share2 } from 'lucide-react';
import type { ChatMessage } from '../../types/query';
import CitationChip from '../shared/CitationChip';
import ConfidenceBadge from '../shared/ConfidenceBadge';

interface MessageBubbleProps {
  message: ChatMessage;
  onFollowUp: (question: string) => void;
}

export default function MessageBubble({ message, onFollowUp }: MessageBubbleProps) {
  if (message.type === 'question') {
    return (
      <div className="bg-bg-elevated rounded-2xl rounded-tr-sm max-w-[85%] sm:max-w-[60%] ml-auto px-4 py-3">
        <p className="text-sm text-text-primary whitespace-pre-wrap">{message.content}</p>
      </div>
    );
  }

  const response = message.response;
  return (
    <div className="bg-bg-surface border border-border-default rounded-2xl rounded-tl-sm w-full px-5 py-4">
      <p className="text-sm text-text-primary whitespace-pre-wrap">{message.content}</p>

      {response && response.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          {response.citations.map((citation, i) => (
            <CitationChip key={`${citation.document_id}-${citation.page_number}-${i}`} citation={citation} />
          ))}
        </div>
      )}

      {/* The Forge Line (Visual_Identity.md, signature element 3) — a single heavier rule
          marking the transition from evidence to the confirmed, trust-bearing result. Kept as
          a plain rule (border-strong, not the Temper Arc gradient) so it stays a distinct
          signature element rather than blurring into confidence. Citations still land as an
          endnote block above this line rather than attaching progressively at the clause each
          one supports mid-stream — that needs the streaming pipeline itself to carry citation
          offsets, a separate change from this component. */}
      {response && (
        <div className="flex flex-wrap items-center gap-3 mt-3 pt-4 border-t-2 border-border-strong">
          <ConfidenceBadge confidence={response.confidence} />
          {response.used_graph && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-medium border border-accent-teal text-accent-teal">
              <Share2 size={10} /> Used Knowledge Graph
            </span>
          )}
        </div>
      )}

      {response && response.follow_ups.length > 0 && (
        <div className="flex flex-col gap-1 mt-3">
          {response.follow_ups.map((q) => (
            <button
              key={q}
              onClick={() => onFollowUp(q)}
              className="text-sm text-accent-teal hover:underline cursor-pointer text-left min-h-[44px] sm:min-h-0"
            >
              → {q}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
