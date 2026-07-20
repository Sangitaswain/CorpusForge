import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { Crosshair, Layers } from 'lucide-react';
import type { GraphNode } from '../../types/graph';

interface NodeContextCardProps {
  node: GraphNode;
  renderedDegree: number;
  x: number;
  y: number;
  onExpand: () => void;
  onSetFocus: () => void;
  onClose: () => void;
}

// COMP-10 — a small stamped card at the click point, 2-3 investigation actions only, never
// a long generic OS-style context-menu list. Reuses the Heat Stamp's clipped-corner register
// (IDENT-2) rather than inventing a second card treatment for the same visual idea.
const OUTER_CLIP = 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)';
const INNER_CLIP = 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%)';

export default function NodeContextCard({ node, renderedDegree, x, y, onExpand, onSetFocus, onClose }: NodeContextCardProps) {
  const ref = useRef<HTMLDivElement>(null);
  const moreCount = Math.max(node.degree - renderedDegree, 0);
  // A right-click near the canvas's right/bottom edge must not render this card partially
  // off-screen — clamp against its own measured size once mounted rather than guessing a
  // fixed width/height up front (the button label's length varies with `moreCount`).
  const [position, setPosition] = useState({ left: x, top: y });

  // Layout effect, not a plain effect — runs before paint, so the card never flashes at the
  // unclamped click position before snapping onscreen.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const { width: cardWidth, height: cardHeight } = el.getBoundingClientRect();
    const margin = 8;
    setPosition({
      left: Math.min(x, window.innerWidth - cardWidth - margin),
      top: Math.min(y, window.innerHeight - cardHeight - margin),
    });
  }, [x, y]);

  useEffect(() => {
    const onPointerDown = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('mousedown', onPointerDown);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointerDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <div
      ref={ref}
      role="menu"
      aria-label={`Investigation actions for ${node.name}`}
      className="fixed z-30 w-56"
      style={{ left: position.left, top: position.top }}
    >
      <div className="relative" style={{ clipPath: OUTER_CLIP }}>
        <div className="bg-border-default p-px" style={{ clipPath: OUTER_CLIP }}>
          <div className="bg-bg-surface shadow-elevated" style={{ clipPath: INNER_CLIP }}>
            <div className="px-3 py-2 border-b border-border-subtle">
              <p className="text-xs font-mono text-text-secondary truncate">{node.name}</p>
            </div>
            <button
              role="menuitem"
              onClick={() => {
                onSetFocus();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated transition-fast min-h-[40px]"
            >
              <Crosshair size={14} className="text-accent-teal shrink-0" />
              Set as focus
            </button>
            <button
              role="menuitem"
              disabled={moreCount === 0}
              onClick={() => {
                onExpand();
                onClose();
              }}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-text-primary hover:bg-bg-elevated transition-fast min-h-[40px] disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent"
            >
              <Layers size={14} className="text-accent-teal shrink-0" />
              {moreCount > 0 ? `Expand — ${moreCount} more connection${moreCount === 1 ? '' : 's'}` : 'No further connections'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
