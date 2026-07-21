import { BookX, Clock, FileX, Zap } from 'lucide-react';
import type { AlertType } from '../../types/alert';
import type { Severity } from '../../types/intelligence';
import { SEVERITY_TEXT_COLOR } from '../../utils/constants';

const ICON_BY_TYPE: Record<AlertType, typeof Zap> = {
  pattern_match: Zap,
  procedure_outdated: Clock,
  knowledge_cliff: BookX,
  no_coverage: FileX,
};

interface AlertTypeIconProps {
  type: AlertType;
  severity: Severity;
  size?: number;
}

// Uses the shared SEVERITY_TEXT_COLOR scale so an alert's icon color always agrees with
// its own severity badge rather than a fixed per-type color that could contradict it.
export default function AlertTypeIcon({ type, severity, size = 16 }: AlertTypeIconProps) {
  const Icon = ICON_BY_TYPE[type];
  return <Icon size={size} className={`shrink-0 ${SEVERITY_TEXT_COLOR[severity]}`} />;
}
