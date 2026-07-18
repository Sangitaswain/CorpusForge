import { FileText } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import type { Citation } from '../../types/query';

function truncate(name: string, max = 16): string {
  return name.length > max ? `${name.slice(0, max)}…` : name;
}

// The Heat Stamp (Visual_Identity.md, signature element 1) — the product's most-repeated
// mark: a small, bordered, monospace tag with one clipped corner, like a physical inspection
// tag. Drawn as two nested clip-path layers (an outer 1px "frame" and an inner "fill" inset by
// margin) since clip-path alone would cut straight through a regular CSS border with no stroke
// along the diagonal. The inner layer stretches to the button's own height (flex default,
// not items-center) so the frame stays a consistent 1px ring at both the desktop and the
// larger max-sm touch-target size, rather than the border ballooning around shrink-wrapped text.
const OUTER_CLIP = 'polygon(0 0, calc(100% - 8px) 0, 100% 8px, 100% 100%, 0 100%)';
const INNER_CLIP = 'polygon(0 0, calc(100% - 7px) 0, 100% 7px, 100% 100%, 0 100%)';

export default function CitationChip({ citation }: { citation: Citation }) {
  const navigate = useNavigate();
  return (
    <button
      title={citation.filename}
      onClick={() => navigate(`/document-viewer?id=${citation.document_id}&page=${citation.page_number}`)}
      className="group relative inline-flex min-h-[28px] max-sm:min-h-[44px] cursor-pointer
                 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-accent-teal
                 focus-visible:ring-offset-1 focus-visible:ring-offset-bg-surface"
    >
      <span
        className="absolute inset-0 bg-border-default group-hover:bg-accent-teal-bright transition-fast"
        style={{ clipPath: OUTER_CLIP }}
        aria-hidden="true"
      />
      <span
        className="relative m-px flex items-center gap-1 px-2 bg-bg-elevated text-text-secondary
                   group-hover:text-accent-teal-bright text-xs font-mono transition-fast"
        style={{ clipPath: INNER_CLIP }}
      >
        <FileText size={10} />
        {truncate(citation.filename)} p.{citation.page_number}
      </span>
    </button>
  );
}
