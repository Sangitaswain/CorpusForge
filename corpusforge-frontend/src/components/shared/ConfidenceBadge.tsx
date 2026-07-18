import type { Confidence } from '../../types/query';

// The Temper Arc (Visual_Identity.md, signature element 4) — confidence rendered as a
// continuous heat-tempering gradient (straw → blue), deliberately never a filled pill with a
// leading dot. That shape is reserved for SeverityBadge; reusing it for confidence is exactly
// the ambiguity the Temper Arc exists to resolve (severity is discrete, confidence is a matter
// of degree). Marker position is fixed per qualitative tier — the backend only returns the
// tier today, not a raw distance score, so the gradient's continuity is a visual language
// choice rather than a plot of an underlying number.
const MARKER_POSITION: Record<Confidence, number> = {
  Low: 12,
  Medium: 50,
  High: 88,
};

const TEMPER_GRADIENT =
  'linear-gradient(to right, #E8C868 0%, #C98A4B 35%, #8B5A8F 65%, #3F5B8C 85%, #6CA0E0 100%)';

export default function ConfidenceBadge({ confidence }: { confidence: Confidence }) {
  return (
    <span className="inline-flex items-center gap-2">
      <span className="relative block w-14 h-1.5 rounded-full" style={{ background: TEMPER_GRADIENT }} aria-hidden="true">
        <span
          className="absolute top-1/2 w-2.5 h-2.5 -translate-y-1/2 -translate-x-1/2 rounded-full bg-bg-surface border-2 border-text-primary"
          style={{ left: `${MARKER_POSITION[confidence]}%` }}
        />
      </span>
      <span className="text-xs font-semibold text-text-primary">{confidence} confidence</span>
    </span>
  );
}
