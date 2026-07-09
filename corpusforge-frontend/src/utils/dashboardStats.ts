import type { Document } from '../types/document';
import { DOC_TYPE_LABELS } from './constants';

export interface DocTypeCount {
  docType: string;
  label: string;
  count: number;
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

export function formatRelativeTime(isoString: string | null): string {
  if (!isoString) return 'Never run';
  const diffMs = Date.now() - new Date(isoString).getTime();
  const diffMin = Math.round(diffMs / 60_000);
  if (diffMin < 1) return 'Just now';
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHr = Math.round(diffMin / 60);
  if (diffHr < 24) return `${diffHr}h ago`;
  const diffDay = Math.round(diffHr / 24);
  return `${diffDay}d ago`;
}
