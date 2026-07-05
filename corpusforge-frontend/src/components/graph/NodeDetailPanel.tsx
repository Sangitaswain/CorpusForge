import { ArrowRight, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useNodeDetail } from '../../hooks/useGraph';
import { NODE_COLORS, NODE_TYPE_LABELS, nodeTypeOf } from '../../utils/constants';
import LoadingSpinner from '../shared/LoadingSpinner';

interface NodeDetailPanelProps {
  entityId: string;
  onClose: () => void;
}

export default function NodeDetailPanel({ entityId, onClose }: NodeDetailPanelProps) {
  const { data, isLoading } = useNodeDetail(entityId);
  const navigate = useNavigate();

  return (
    <div className="fixed sm:static bottom-0 inset-x-0 sm:inset-auto z-20 h-[40vh] sm:h-auto w-full sm:w-80 bg-bg-surface border-t sm:border-t-0 sm:border-l border-border-default rounded-t-2xl sm:rounded-none overflow-y-auto flex flex-col">
      <div className="flex items-start justify-between p-4 pb-2">
        <div>
          {data && (
            <>
              <h2 className="text-xl font-bold text-text-primary">{data.entity.name}</h2>
              <div className="flex items-center gap-2 mt-1.5">
                <span
                  className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                  style={{ backgroundColor: NODE_COLORS[nodeTypeOf(data.entity.type)] }}
                >
                  {NODE_TYPE_LABELS[nodeTypeOf(data.entity.type)]}
                </span>
                <span className="text-sm text-text-muted">
                  {data.entity.document_count} document{data.entity.document_count === 1 ? '' : 's'}
                </span>
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
                      <button
                        onClick={() => navigate(`/document-viewer?id=${connection.source_document_id}`)}
                        className="text-xs text-accent-teal hover:underline mt-0.5 truncate block max-w-full"
                      >
                        Source: {connection.source_document}
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </>
      ) : null}
    </div>
  );
}
