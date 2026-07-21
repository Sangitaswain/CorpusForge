import type { MutableRefObject } from 'react';
import { Home, ZoomIn, ZoomOut } from 'lucide-react';
import type { ForceGraphMethods } from 'react-force-graph-2d';
import type { GraphLink, GraphNodePayload } from '../../types/graph';

interface GraphControlsProps {
  graphRef: MutableRefObject<ForceGraphMethods<GraphNodePayload, GraphLink> | undefined>;
}

const ZOOM_STEP = 1.5;

// Compact on desktop (mouse precision doesn't need a 44px target); bumped to the FP-10
// minimum only on mobile viewports, matching CitationChip's own min-h-[28px]/max-sm:44px
// pattern rather than inventing a new one.
const BUTTON_CLASS =
  'p-2 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-fast min-h-[36px] min-w-[36px] max-sm:min-h-[44px] max-sm:min-w-[44px] flex items-center justify-center';

export default function GraphControls({ graphRef }: GraphControlsProps) {
  const zoomBy = (factor: number) => {
    const fg = graphRef.current;
    if (!fg) return;
    fg.zoom(fg.zoom() * factor, 300);
  };

  const reset = () => {
    graphRef.current?.zoomToFit(400, 40);
  };

  return (
    <div className="absolute bottom-4 right-4 flex flex-col gap-1 bg-bg-surface border border-border-default rounded-lg p-1">
      <button onClick={() => zoomBy(ZOOM_STEP)} aria-label="Zoom in" className={BUTTON_CLASS}>
        <ZoomIn size={16} />
      </button>
      <button onClick={() => zoomBy(1 / ZOOM_STEP)} aria-label="Zoom out" className={BUTTON_CLASS}>
        <ZoomOut size={16} />
      </button>
      <button onClick={reset} aria-label="Reset view" className={BUTTON_CLASS}>
        <Home size={16} />
      </button>
    </div>
  );
}
