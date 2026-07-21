import type { Severity } from './intelligence';
import type { Citation } from './query';

// The 4 checks alert_service.py actually implements (BP-08) — trimmed from the original
// 6-value plan, which also listed new_gap/pattern_threshold with no corresponding check.
export type AlertType = 'pattern_match' | 'procedure_outdated' | 'knowledge_cliff' | 'no_coverage';

export interface Alert {
  id: string;
  alert_type: AlertType;
  title: string;
  description: string;
  severity: Severity;
  affected_entities: string[];
  citations: Citation[];
  recommendation: string;
  created_at: string;
}
