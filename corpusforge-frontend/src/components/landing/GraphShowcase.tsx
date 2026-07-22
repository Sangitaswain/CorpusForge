import { Gauge, User, ClipboardList, FileText } from 'lucide-react';
import { useRevealOnScroll } from './useRevealOnScroll';

// Node type colors from UI_Design_System.md §2.4 — the only colours allowed on the graph.
// Real entities from the P-101 case, the same facts used in HeroReplay/CopilotShowcase —
// not the generic placeholder story a design mockup might invent.
const ENTITIES = [
  { id: 'P-101', icon: Gauge, color: '#3B82F6', title: 'Centrifugal Pump', detail: 'Bearing failure — 15 Jul 2022' },
  { id: 'WO-2022-0710', icon: ClipboardList, color: '#F97316', title: 'Re-greasing', detail: '10 Jul 2022 — wrong grease used' },
  { id: 'INC-2022-07', icon: FileText, color: '#6B7280', title: 'SKF Failure Report', detail: 'Ref SKF-FA-2022-0716' },
  { id: 'Rajesh Nair', icon: User, color: '#F59E0B', title: 'Technician', detail: 'ABC Engineering Services Pvt Ltd' },
];

function EntityCard({ entity, visible, delay }: { entity: (typeof ENTITIES)[number]; visible: boolean; delay: number }) {
  const Icon = entity.icon;
  return (
    <div
      className={`bg-bg-surface border rounded-lg px-4 py-3 w-full sm:w-56 transition-all duration-500 ${
        visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
      }`}
      style={{ borderColor: entity.color, transitionDelay: visible ? `${delay}ms` : '0ms' }}
    >
      <div className="flex items-center gap-2">
        <Icon size={14} style={{ color: entity.color }} className="shrink-0" />
        <span className="text-xs font-semibold text-text-primary">{entity.id}</span>
      </div>
      <p className="text-sm text-text-primary mt-1.5">{entity.title}</p>
      <p className="text-2xs text-text-muted mt-0.5">{entity.detail}</p>
    </div>
  );
}

export default function GraphShowcase() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div ref={ref} className="max-w-2xl mx-auto flex flex-col items-center gap-3">
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <EntityCard entity={ENTITIES[0]} visible={visible} delay={0} />
        <span className={`text-text-muted transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          →
        </span>
        <EntityCard entity={ENTITIES[1]} visible={visible} delay={150} />
      </div>
      <span className={`text-text-muted transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
        ↓
      </span>
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <EntityCard entity={ENTITIES[2]} visible={visible} delay={300} />
        <span className={`text-text-muted transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`} aria-hidden="true">
          ←
        </span>
        <EntityCard entity={ENTITIES[3]} visible={visible} delay={450} />
      </div>
      <p
        className={`text-xs text-text-secondary text-center mt-2 transition-opacity duration-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        style={{ transitionDelay: visible ? '600ms' : '0ms' }}
      >
        Traced automatically from the ingested corpus — nobody hand-drew these connections.
      </p>
    </div>
  );
}
