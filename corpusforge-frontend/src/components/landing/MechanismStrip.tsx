import { FileText, MessageSquare, Share2, Cpu, ShieldCheck, Bell } from 'lucide-react';
import { useRevealOnScroll } from './useRevealOnScroll';

const OUTPUTS = [
  { icon: MessageSquare, label: 'Copilot' },
  { icon: Share2, label: 'Knowledge Graph' },
  { icon: Cpu, label: 'Patterns' },
  { icon: ShieldCheck, label: 'Compliance' },
  { icon: Bell, label: 'Alerts' },
];

// Explains the transformation (document -> understanding -> knowledge), not the technical
// pipeline. The pipeline stays visible but visually secondary (small, muted, monospace) so it
// can be verified without competing with the primary story for a non-technical viewer.
export default function MechanismStrip() {
  const { ref, visible } = useRevealOnScroll<HTMLDivElement>();

  return (
    <div ref={ref} className="flex flex-col items-center gap-6">
      <div
        className={`flex items-center gap-3 transition-all duration-700 ${visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'}`}
      >
        <div className="flex items-center gap-2 bg-bg-surface border border-border-default rounded-md px-4 py-2.5">
          <FileText size={15} className="text-text-muted" />
          <span className="text-sm font-medium text-text-primary">Document</span>
        </div>
        <span className="text-text-muted text-sm" aria-hidden="true">→</span>
        <div className="flex items-center gap-2 bg-accent-teal-wash border border-accent-teal rounded-md px-4 py-2.5">
          <span className="text-sm font-semibold text-accent-teal">Understood</span>
        </div>
        <span className="text-text-muted text-sm" aria-hidden="true">→</span>
        <div className="flex items-center gap-2 bg-bg-surface border border-border-default rounded-md px-4 py-2.5">
          <span className="text-sm font-semibold text-text-primary">Knowledge</span>
        </div>
      </div>

      <p
        className={`text-2xs font-mono text-text-muted transition-opacity duration-500 delay-300 ${visible ? 'opacity-100' : 'opacity-0'}`}
      >
        parsed → chunked → embedded → entities extracted
      </p>

      <span
        className={`text-text-muted transition-opacity duration-500 delay-500 ${visible ? 'opacity-100' : 'opacity-0'}`}
        aria-hidden="true"
      >
        ↓
      </span>

      <div className="flex flex-wrap items-center justify-center gap-3">
        {OUTPUTS.map(({ icon: Icon, label }, i) => (
          <div
            key={label}
            className={`flex items-center gap-2 bg-bg-surface border border-border-default rounded-md px-3.5 py-2 transition-all duration-500 ${
              visible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
            }`}
            style={{ transitionDelay: visible ? `${650 + i * 120}ms` : '0ms' }}
          >
            <Icon size={14} className="text-accent-teal" />
            <span className="text-xs font-medium text-text-primary">{label}</span>
          </div>
        ))}
      </div>
      <p className="text-xs text-text-muted text-center max-w-[420px]">
        No feature re-reads or reprocesses a document on its own — every view above is a different
        read of the same understanding.
      </p>
    </div>
  );
}
