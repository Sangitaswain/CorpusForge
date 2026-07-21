import type { Document } from '../types/document';
import type { ComplianceGap, Pattern, Severity } from '../types/intelligence';
import { DOC_TYPE_LABELS } from './constants';

export interface DocTypeCount {
  docType: string;
  label: string;
  count: number;
}

const SEVERITY_RANK: Record<Severity, number> = {
  'Audit-Critical': 0,
  Critical: 1,
  High: 2,
  Medium: 3,
  Low: 4,
};

const isUnresolvedGap = (gap: ComplianceGap) => gap.verdict !== 'compliant' && gap.verdict !== 'undetermined';

export interface Finding {
  id: string;
  kind: 'pattern' | 'gap';
  title: string;
  detail: string;
  severity: Severity;
}

/** Top findings across the Step 6 pattern engine and Step 7 compliance engine, ranked by severity. */
export function getTopFindings(patterns: Pattern[], gaps: ComplianceGap[], limit = 3): Finding[] {
  const patternFindings: Finding[] = patterns.map((p) => ({
    id: p.id,
    kind: 'pattern',
    title: p.title,
    detail: `${p.incident_count} incident${p.incident_count === 1 ? '' : 's'} detected`,
    severity: p.severity,
  }));
  const gapFindings: Finding[] = gaps.filter(isUnresolvedGap).map((g) => ({
    id: g.id,
    kind: 'gap',
    title: `${g.regulation_ref} · Clause ${g.clause_number}`,
    detail: g.verdict === 'outdated' ? 'Outdated procedure' : 'Compliance gap',
    severity: g.severity,
  }));
  return [...patternFindings, ...gapFindings]
    .sort((a, b) => SEVERITY_RANK[a.severity] - SEVERITY_RANK[b.severity])
    .slice(0, limit);
}

export function countCriticalFindings(patterns: Pattern[], gaps: ComplianceGap[]): number {
  const isCritical = (s: Severity) => s === 'Audit-Critical' || s === 'Critical';
  return patterns.filter((p) => isCritical(p.severity)).length + gaps.filter(isUnresolvedGap).filter((g) => isCritical(g.severity)).length;
}

export function countRiskBySeverity(patterns: Pattern[], gaps: ComplianceGap[]) {
  const severities = [...patterns.map((p) => p.severity), ...gaps.filter(isUnresolvedGap).map((g) => g.severity)];
  const critical = severities.filter((s) => s === 'Audit-Critical' || s === 'Critical').length;
  const high = severities.filter((s) => s === 'High').length;
  return { total: severities.length, critical, high };
}

export interface ActivityEvent {
  id: string;
  label: string;
  timestamp: string;
  tone: 'default' | 'warning' | 'critical';
}

/** Merges real timestamped events (uploads, pattern detections, compliance gaps) — no synthetic event types. */
export function getRecentActivity(documents: Document[], patterns: Pattern[], gaps: ComplianceGap[], limit = 5): ActivityEvent[] {
  const uploadEvents: ActivityEvent[] = documents.map((d) => ({
    id: `doc-${d.id}`,
    label: `Uploaded ${d.filename}`,
    timestamp: d.uploaded_at,
    tone: 'default',
  }));
  const patternEvents: ActivityEvent[] = patterns
    .filter((p) => p.created_at)
    .map((p) => ({
      id: `pattern-${p.id}`,
      label: `Pattern detected: ${p.title}`,
      timestamp: p.created_at as string,
      tone: 'warning',
    }));
  const gapEvents: ActivityEvent[] = gaps
    .filter((g) => isUnresolvedGap(g) && g.created_at)
    .map((g) => ({
      id: `gap-${g.id}`,
      label: `${g.verdict === 'outdated' ? 'Outdated procedure' : 'Compliance gap'} detected: ${g.regulation_ref} Clause ${g.clause_number}`,
      timestamp: g.created_at as string,
      tone: 'critical',
    }));
  return [...uploadEvents, ...patternEvents, ...gapEvents]
    .sort((a, b) => (a.timestamp < b.timestamp ? 1 : -1))
    .slice(0, limit);
}

export function countRecentUploads(documents: Document[], hours = 24): number {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return documents.filter((d) => new Date(d.uploaded_at).getTime() >= cutoff).length;
}

export function groupByDocType(documents: Document[]): DocTypeCount[] {
  const counts = new Map<string, number>();
  for (const doc of documents) {
    const key = doc.doc_type ?? 'other';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return Array.from(counts.entries())
    .map(([docType, count]) => ({
      docType,
      label: DOC_TYPE_LABELS[docType as keyof typeof DOC_TYPE_LABELS] ?? docType,
      count,
    }))
    .sort((a, b) => b.count - a.count);
}

export function formatRelativeTime(value: string | number | null): string {
  // A plain falsy check treats epoch 0 (1970-01-01, a legitimate numeric timestamp) the
  // same as null/'' — only null or an empty string actually mean "never run".
  if (value === null || value === '') return 'Never run';
  const target = typeof value === 'number' ? value : new Date(value).getTime();
  const diffMs = Date.now() - target;
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
