import { Files } from 'lucide-react';

// The Batch Mark (Visual_Identity.md, signature element 7) — a claim's evidentiary weight
// legible before a word of detail is read: "backed by N documents," not a bare integer.
// Knowledge_Graph_Design_Bible.md PANEL-5 / IDENT-2 — once per claim/entity, never a full
// stack graphic per row in a dense table (collapse to a plain count there instead).
export default function BatchMark({ count }: { count: number }) {
  return (
    <span className="inline-flex items-center gap-1.5 text-sm text-text-muted">
      <Files size={13} className="shrink-0" />
      {count} document{count === 1 ? '' : 's'}
    </span>
  );
}
