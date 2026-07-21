import { AlertTriangle, ArrowRight, ExternalLink, Sparkles, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNodeDetail, useNodeSummary } from '../../hooks/useGraph';
import { askForgeQuestionFor, NODE_BADGE_COLORS, NODE_COLORS, NODE_TYPE_LABELS, nodeTypeOf } from '../../utils/constants';
import { castNumber } from '../../utils/castNumber';
import BatchMark from '../shared/BatchMark';
import CitationChip from '../shared/CitationChip';
import LoadingSpinner from '../shared/LoadingSpinner';

interface NodeDetailPanelProps {
  entityId: string;
  onClose: () => void;
}

export default function NodeDetailPanel({ entityId, onClose }: NodeDetailPanelProps) {
  const { data, isLoading } = useNodeDetail(entityId);
  const summary = useNodeSummary();
  const navigate = useNavigate();

  return (
    <div className="fixed sm:static bottom-0 inset-x-0 sm:inset-auto z-20 h-[40vh] sm:h-auto w-full sm:w-80 bg-bg-surface border-t sm:border-t-0 sm:border-l border-border-default rounded-t-2xl sm:rounded-none overflow-y-auto flex flex-col">
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          {data && (
            <>
              <div className="flex items-baseline gap-2">
                <h2 className="text-xl font-bold text-text-primary">{data.entity.name}</h2>
                {/* Cast Number (PANEL-2) — permanent, quiet, reference-only; backend-issued
                    (Entity.cast_number), so it never changes across reloads or re-renders. */}
                {data.entity.cast_number !== null && (
                  <span className="font-mono text-2xs text-text-muted shrink-0">
                    {castNumber(data.entity.cast_number, 'REC')}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: NODE_BADGE_COLORS[nodeTypeOf(data.entity.type)] }}
                >
                  {NODE_TYPE_LABELS[nodeTypeOf(data.entity.type)]}
                </span>
                <BatchMark count={data.entity.document_count} />
              </div>
            </>
          )}
        </div>
        <button
          onClick={onClose}
          aria-label="Close panel"
          className="text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center transition-fast"
        >
          <X size={16} />
        </button>
      </div>

      {isLoading ? (
        <LoadingSpinner />
      ) : data ? (
        <>
          <div className="px-4 pt-2 flex-1">
            <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider">
              Connections ({data.connected.length})
            </h3>
            <div className="max-h-[400px] overflow-y-auto">
              {data.connected.length === 0 && (
                <p className="text-sm text-text-muted py-3">No connections yet.</p>
              )}
              {data.connected.map((connection) => (
                <div key={`${connection.id}-${connection.relationship}`} className="flex items-start gap-3 py-3 border-b border-border-subtle">
                  <ArrowRight size={14} className="mt-0.5 shrink-0" style={{ color: NODE_COLORS[nodeTypeOf(connection.type)] }} />
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-text-primary truncate">{connection.entity}</p>
                    <p className="text-xs text-text-muted italic">{connection.relationship}</p>
                    {connection.source_document && connection.source_document_id && (
                      <div className="mt-1">
                        <CitationChip
                          citation={{
                            document_id: connection.source_document_id,
                            filename: connection.source_document,
                          }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>

            {/* Coordinate Rail (PANEL-8/IDENT-2) — `date` entities co-occurring with the
                focus, most recent first (already sorted by the backend). Dates never render
                as floating canvas nodes (NODE-4); this panel strip is their only surface. */}
            {data.timeline.length > 0 && (
              <div className="pt-4">
                <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Timeline
                </h3>
                <div className="flex gap-4 overflow-x-auto pb-2 -mx-4 px-4">
                  {data.timeline.map((entry) => (
                    <div key={entry.id} className="flex flex-col items-start shrink-0 min-w-[110px]">
                      <div className="w-full flex items-center gap-1.5">
                        <span className="w-1.5 h-1.5 rounded-full bg-accent-teal shrink-0" aria-hidden="true" />
                        <span className="h-px flex-1 bg-border-default" aria-hidden="true" />
                      </div>
                      <p className="font-mono text-xs text-text-primary mt-1.5 whitespace-nowrap">
                        {entry.label}
                      </p>
                      {entry.source_document && entry.source_document_id && (
                        <div className="mt-1">
                          <CitationChip
                            citation={{
                              document_id: entry.source_document_id,
                              filename: entry.source_document,
                            }}
                          />
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Compliance (GB-3/PANEL-10) — real, backend-verified violations only (see
                build_violates_edges); never fabricated against unsupported data, so this
                section simply doesn't render when there's nothing real to show. */}
            {data.compliance.length > 0 && (
              <div className="pt-4">
                <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">
                  Compliance
                </h3>
                <div className="flex flex-col gap-2">
                  {data.compliance.map((finding) => (
                    <div
                      key={finding.id}
                      className="border border-accent-orange/40 bg-accent-orange/10 rounded-md p-3"
                    >
                      <div className="flex items-start gap-2">
                        <AlertTriangle size={14} className="text-accent-orange mt-0.5 shrink-0" />
                        <div className="min-w-0">
                          <p className="text-xs font-semibold text-accent-orange-bright">
                            {finding.severity} · {finding.verdict === 'gap' ? 'Gap' : 'Outdated'}
                          </p>
                          <p className="text-xs font-mono text-text-secondary mt-0.5">
                            {finding.regulation_ref} § {finding.clause_number}
                          </p>
                          <p className="text-sm text-text-primary mt-1.5 leading-relaxed">
                            {finding.explanation}
                          </p>
                          {finding.recommendation && (
                            <p className="text-sm text-text-primary font-medium mt-1.5 leading-relaxed">
                              {finding.recommendation}
                            </p>
                          )}
                          {finding.source_document && finding.source_document_id && (
                            <div className="mt-2">
                              <CitationChip
                                citation={{
                                  document_id: finding.source_document_id,
                                  filename: finding.source_document,
                                }}
                              />
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Forge Line (PANEL-4) — a heavier rule with a small "EVIDENCE" notch label,
                marking the transition from cited connections above to AI synthesis below. */}
            <div className="relative border-t-2 border-border-strong mt-2">
              <span className="absolute -top-2.5 left-3 bg-bg-surface px-1.5 text-2xs font-medium tracking-wider text-text-muted uppercase">
                Evidence
              </span>
            </div>

            {/* AI Summary (PANEL-9) — explicit-trigger only; never fires on panel open.
                No Temper Arc here: this endpoint has no real confidence number (PANEL-7),
                unlike Ask Forge answers, so a confidence indicator would be fabricated. */}
            <div className="pt-5 pb-2">
              <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-2">AI Summary</h3>
              {summary.data ? (
                <p className="text-sm text-text-primary leading-relaxed">{summary.data.summary}</p>
              ) : summary.isPending ? (
                <LoadingSpinner />
              ) : summary.isError ? (
                <div className="text-sm text-status-danger">
                  <p>{summary.error instanceof Error ? summary.error.message : 'Something went wrong.'}</p>
                  <button
                    onClick={() => summary.mutate(data.entity.id)}
                    className="mt-1.5 text-accent-teal hover:underline font-medium"
                  >
                    Retry
                  </button>
                </div>
              ) : (
                <button
                  onClick={() => summary.mutate(data.entity.id)}
                  className="inline-flex items-center gap-1.5 text-sm text-accent-teal hover:underline min-h-[44px] sm:min-h-0"
                >
                  <Sparkles size={14} /> Generate AI Summary
                </button>
              )}
            </div>

            {summary.data?.recommended_next_step && (
              <div className="pb-4">
                <h3 className="text-2xs font-medium text-text-muted uppercase tracking-wider mb-1">
                  Recommended Next Step
                </h3>
                <p className="text-sm text-text-primary font-medium leading-relaxed">
                  {summary.data.recommended_next_step}
                </p>
              </div>
            )}
          </div>
          <div className="p-4">
            <button
              onClick={() =>
                navigate('/ask-forge', {
                  state: { question: askForgeQuestionFor(data.entity.type, data.entity.name) },
                })
              }
              className="w-full inline-flex items-center justify-center gap-2 border border-accent-teal text-accent-teal hover:bg-accent-teal-wash px-4 py-2 rounded-md text-sm font-medium transition-fast min-h-[44px]"
            >
              <ExternalLink size={14} /> Ask Forge
            </button>
          </div>
        </>
      ) : null}
    </div>
  );
}
