import { BookX, Clock, FileX, Zap } from 'lucide-react';
import type { AlertType } from '../../types/alert';
import type { Severity } from '../../types/intelligence';

const ICON_BY_TYPE: Record<AlertType, typeof Zap> = {
  pattern_match: Zap,
  procedure_outdated: Clock,
  knowledge_cliff: BookX,
  no_coverage: FileX,
};

// Same color scale as SeverityBadge's dots, so an alert's icon color always agrees with
// its own severity badge rather than a fixed per-type color that could contradict it.
const COLOR_BY_SEVERITY: Record<Severity, string> = {
  'Audit-Critical': 'text-red-500',
  Critical: 'text-red-400',
  High: 'text-orange-400',
  Medium: 'text-amber-400',
  Low: 'text-green-400',
};

interface AlertTypeIconProps {
  type: AlertType;
  severity: Severity;
  size?: number;
}

export default function AlertTypeIcon({ type, severity, size = 16 }: AlertTypeIconProps) {
  const Icon = ICON_BY_TYPE[type];
  return <Icon size={size} className={`shrink-0 ${COLOR_BY_SEVERITY[severity]}`} />;
}
