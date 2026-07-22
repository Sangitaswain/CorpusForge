import { useEffect, useState } from 'react';
import graphShot from '../../assets/graph-showcase.png';
import { useRevealOnScroll } from './useRevealOnScroll';

const OUTER_CLIP = 'polygon(0 0, calc(100% - 10px) 0, 100% 10px, 100% 100%, 0 100%)';
const INNER_CLIP = 'polygon(0 0, calc(100% - 9px) 0, 100% 9px, 100% 100%, 0 100%)';

// Node type colors from UI_Design_System.md §2.4 — the only colours allowed on the graph.
const NODES = [
  { id: 'P-101', color: '#3B82F6' }, // equipment
  { id: 'WO-2022-0710', color: '#F97316' }, // work_order
  { id: 'Rajesh Nair', color: '#F59E0B' }, // person
];

type Stage = 'entities' | 'edges' | 'pin' | 'evidence' | 'timeline' | 'recommendation' | 'settled';
const SEQUENCE: Stage[] = ['entities', 'edges', 'pin', 'evidence', 'timeline', 'recommendation', 'settled'];
const STAGE_DELAY_MS = 650;

// Hand-choreographed intro — real entities, real relationships, authored positions rather
// than a live force-graph physics simulation (see Landing_Page_Experience_Spec.md Scene 3:
// driving the real force-graph component was rejected as the highest-risk, lowest-reliability
// approach). Resolves into the actual product screenshot below as proof this isn't fabricated.
export default function GraphShowcase() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();
  const [stageIndex, setStageIndex] = useState(-1);

  useEffect(() => {
    if (!visible) return;
    if (stageIndex >= SEQUENCE.length - 1) return;
    const t = setTimeout(() => setStageIndex((i) => i + 1), stageIndex === -1 ? 200 : STAGE_DELAY_MS);
    return () => clearTimeout(t);
  }, [visible, stageIndex]);

  const stage = stageIndex >= 0 ? SEQUENCE[stageIndex] : null;
  const reached = (s: Stage) => stage !== null && SEQUENCE.indexOf(stage) >= SEQUENCE.indexOf(s);

  return (
    <div ref={ref} className="max-w-3xl mx-auto flex flex-col gap-6">
      <div className="flex flex-col items-center gap-4 min-h-[180px] justify-center">
        <div className="flex items-center justify-center gap-3 flex-wrap">
          {NODES.map((node, i) => (
            <div key={node.id} className="flex items-center gap-2">
              <div
                className={`flex items-center gap-2 rounded-full border px-3 py-1.5 transition-all duration-500 ${
                  reached('entities') ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
                } ${stage === 'pin' && node.id === 'P-101' ? 'scale-[1.15]' : ''}`}
                style={{
                  borderColor: node.color,
                  transitionDelay: reached('entities') ? `${i * 150}ms` : '0ms',
                  boxShadow: stage === 'pin' && node.id === 'P-101' ? `0 0 0 8px ${node.color}4D` : 'none',
                }}
              >
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: node.color }} />
                <span className="text-xs font-medium text-text-primary whitespace-nowrap">{node.id}</span>
              </div>
              {i < NODES.length - 1 && (
                <span
                  className={`text-text-muted text-sm transition-opacity duration-500 ${reached('edges') ? 'opacity-100' : 'opacity-0'}`}
                  aria-hidden="true"
                >
                  →
                </span>
              )}
            </div>
          ))}
        </div>

        <p
          className={`text-xs text-text-secondary text-center transition-opacity duration-500 ${reached('evidence') ? 'opacity-100' : 'opacity-0'}`}
        >
          Evidence: bearing seized five days after re-greasing with the wrong grease (SKF-FA-2022-0716)
        </p>

        <div
          className={`flex items-center gap-4 text-2xs font-mono text-text-muted transition-opacity duration-500 ${reached('timeline') ? 'opacity-100' : 'opacity-0'}`}
        >
          <span>10 Jul — WO-2022-0710 re-greased</span>
          <span aria-hidden="true">→</span>
          <span>15 Jul — bearing seized</span>
        </div>

        <div
          className={`bg-accent-teal-wash border-l-2 border-accent-teal px-3 py-2 text-xs text-text-secondary rounded max-w-md transition-opacity duration-500 ${reached('recommendation') ? 'opacity-100' : 'opacity-0'}`}
        >
          <span className="font-medium text-text-primary">Recommendation: </span>
          Confirm grease spec before every re-greasing on Drive End bearings plant-wide.
        </div>
      </div>

      <div
        className={`relative group transition-opacity duration-700 ${reached('settled') ? 'opacity-100' : 'opacity-0 h-0 overflow-hidden'}`}
      >
        <div className="border border-border-default rounded-lg overflow-hidden bg-bg-elevated">
          <img
            src={graphShot}
            alt="CorpusForge Knowledge Graph showing equipment, incident, and regulation nodes connected by extracted relationships"
            className="w-full h-auto transition-transform duration-slow group-hover:scale-[1.02]"
          />
        </div>
        <div className="absolute bottom-4 right-4 w-64" style={{ clipPath: OUTER_CLIP }}>
          <div className="bg-border-default p-px" style={{ clipPath: OUTER_CLIP }}>
            <div className="bg-bg-surface shadow-elevated px-3.5 py-3" style={{ clipPath: INNER_CLIP }}>
              <p className="text-2xs font-mono text-text-muted">Evidence chain</p>
              <p className="text-xs text-text-primary mt-1 font-medium">
                P-101 → WO-2022-0710 → Rajesh Nair
              </p>
              <p className="text-2xs text-text-muted mt-1">Traced automatically, no manual tagging.</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
