import type { Citation } from './query';

export type Severity = 'Audit-Critical' | 'Critical' | 'High' | 'Medium' | 'Low';
export type ComplianceVerdict = 'compliant' | 'gap' | 'outdated' | 'undetermined';

export interface Pattern {
  id: string;
  title: string;
  root_cause: string;
  severity: Severity;
  incident_count: number;
  equipment_tags: string[];
  recommendation: string;
  citations: Citation[];
  created_at: string;
  last_run_at: string | null;
}

export interface ComplianceSummary {
  total_clauses: number;
  compliant: number;
  gap: number;
  outdated: number;
  undetermined: number;
  last_run_at: string | null;
}

export interface ComplianceGap {
  id: string;
  regulation_ref: string;
  clause_number: string;
  clause_text: string;
  verdict: ComplianceVerdict;
  explanation: string;
  severity: Severity;
  recommendation: string;
  procedure_text: string | null;
  regulation_citation: Citation | null;
  procedure_citation: Citation | null;
}
