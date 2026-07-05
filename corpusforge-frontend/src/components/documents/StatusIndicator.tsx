import { CheckCircle2, Clock, Loader2, XCircle } from 'lucide-react';
import type { DocumentStatus } from '../../types/document';

interface StatusIndicatorProps {
  status: DocumentStatus;
  errorMsg?: string;
}

export default function StatusIndicator({ status, errorMsg }: StatusIndicatorProps) {
  if (status === 'queued') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
        <Clock size={14} /> Queued
      </span>
    );
  }
  if (status === 'processing') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-accent-teal">
        <Loader2 size={14} className="animate-spin" /> Processing
      </span>
    );
  }
  if (status === 'done') {
    return (
      <span className="inline-flex items-center gap-1.5 text-sm text-green-400">
        <CheckCircle2 size={14} /> Done
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-red-400" title={errorMsg || 'Processing failed'}>
      <XCircle size={14} /> Failed
    </span>
  );
}
