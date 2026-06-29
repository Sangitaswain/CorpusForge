import type { Severity } from './intelligence';

export type AlertType = 'new_gap' | 'pattern_match' | 'pattern_threshold' | 'procedure_outdated' | 'knowledge_cliff' | 'no_coverage';

export interface Alert {
  id: string;
  alert_type: AlertType;
  title: string;
  description: string;
  severity: Severity;
  affected_entities: string[];
  source_doc_ids: string[];
  recommendation: string;
  is_dismissed: boolean;
  created_at: string;
}
