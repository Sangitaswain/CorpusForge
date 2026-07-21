import { X } from 'lucide-react';
import type { Alert } from '../../types/alert';
import SeverityBadge from '../shared/SeverityBadge';
import CitationChip from '../shared/CitationChip';
import AlertTypeIcon from './AlertTypeIcon';
import { SEVERITY_ACCENT_BORDER } from '../../utils/constants';

interface AlertCardProps {
  alert: Alert;
  onDismiss: (id: string) => void;
}

export default function AlertCard({ alert, onDismiss }: AlertCardProps) {
  return (
    <div
      className={`bg-bg-surface border border-border-default border-l-4 ${SEVERITY_ACCENT_BORDER[alert.severity]} rounded-lg p-5`}
    >
      <div className="flex items-start gap-3">
        <AlertTypeIcon type={alert.alert_type} severity={alert.severity} />
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <SeverityBadge severity={alert.severity} />
            <h3 className="font-semibold text-base text-text-primary">{alert.title}</h3>
          </div>
          <p className="text-sm text-text-secondary mt-2">{alert.description}</p>
        </div>
        <button
          onClick={() => onDismiss(alert.id)}
          aria-label={`Dismiss alert: ${alert.title}`}
          className="text-text-secondary hover:text-text-primary hover:bg-bg-elevated rounded-md min-h-[44px] min-w-[44px] flex items-center justify-center shrink-0 -m-2"
        >
          <X size={16} />
        </button>
      </div>

      {alert.affected_entities.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-3">
          <span className="text-xs text-text-muted">Affected:</span>
          {alert.affected_entities.map((entity) => (
            <span key={entity} className="text-xs bg-bg-elevated rounded-full px-2 py-0.5 text-text-secondary">
              {entity}
            </span>
          ))}
        </div>
      )}

      {alert.citations.length > 0 && (
        <div className="flex flex-wrap gap-1.5 mt-2 items-center">
          <span className="text-xs text-text-muted">Evidence:</span>
          {alert.citations.map((citation) => (
            <CitationChip key={citation.document_id} citation={citation} />
          ))}
        </div>
      )}

      {alert.recommendation && (
        <div className="bg-accent-teal-wash border-l-2 border-accent-teal p-3 text-xs text-text-secondary mt-4 rounded">
          <span className="font-medium text-text-primary">Recommendation: </span>
          {alert.recommendation}
        </div>
      )}
    </div>
  );
}
