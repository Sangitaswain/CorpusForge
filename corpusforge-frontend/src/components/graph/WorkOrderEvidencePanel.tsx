import { ArrowRight, ExternalLink } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { NodeDetail } from '../../types/graph';
import { NODE_COLORS, NODE_TYPE_LABELS, nodeTypeOf } from '../../utils/constants';
import { castNumber } from '../../utils/castNumber';
import BatchMark from '../shared/BatchMark';
import CitationChip from '../shared/CitationChip';

interface WorkOrderEvidencePanelProps {
  detail: NodeDetail;
}

// Knowledge_Graph_Design_Bible.md GB-3/NEVER-10 — a Work Order connects to exactly one
// technician today (PERFORMED_BY); a compact evidence-chain panel outperforms a canvas with
// one edge on it, and the framework happening to support a graph view isn't a reason to
// build one. No GraphCanvas, no lens, is ever rendered for this focus type.
export default function WorkOrderEvidencePanel({ detail }: WorkOrderEvidencePanelProps) {
  const navigate = useNavigate();
  const { entity, connected } = detail;

  return (
    <div className="flex-1 flex flex-col items-center justify-center px-4 py-16">
      <div className="w-full max-w-md">
        <div className="flex items-baseline gap-2">
          <h2 className="text-xl font-bold text-text-primary">{entity.name}</h2>
          <span className="font-mono text-2xs text-text-muted shrink-0">{castNumber(entity.id, 'REC')}</span>
        </div>
        <div className="flex items-center gap-2 mt-1.5">
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: NODE_COLORS[nodeTypeOf(entity.type)] }}
          >
            {NODE_TYPE_LABELS[nodeTypeOf(entity.type)]}
          </span>
          <BatchMark count={entity.document_count} />
        </div>

        <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mt-6">
          Evidence chain
        </h3>
        <div className="mt-2 border border-border-default rounded-lg divide-y divide-border-subtle">
          {connected.length === 0 && (
            <p className="text-sm text-text-muted px-4 py-3">No technician recorded against this work order yet.</p>
          )}
          {connected.map((c) => (
            <div key={`${c.id}-${c.relationship}`} className="flex items-start gap-3 px-4 py-3">
              <ArrowRight size={14} className="mt-0.5 shrink-0" style={{ color: NODE_COLORS[nodeTypeOf(c.type)] }} />
              <div className="min-w-0">
                <p className="text-sm font-medium text-text-primary truncate">{c.entity}</p>
                <p className="text-xs text-text-muted italic">{c.relationship}</p>
                {c.source_document && c.source_document_id && (
                  <div className="mt-1">
                    <CitationChip citation={{ document_id: c.source_document_id, filename: c.source_document }} />
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>

        <button
          onClick={() => navigate('/ask-forge', { state: { question: `Who performed work order ${entity.name}, and what was it for?` } })}
          className="w-full mt-6 inline-flex items-center justify-center gap-2 border border-accent-teal text-accent-teal hover:bg-accent-teal-wash px-4 py-2 rounded-md text-sm font-medium transition-fast min-h-[44px]"
        >
          <ExternalLink size={14} /> Ask Forge
        </button>
      </div>
    </div>
  );
}
