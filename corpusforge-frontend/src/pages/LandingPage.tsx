import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Layers, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocuments } from '../hooks/useDocuments';
import HeroReplay from '../components/landing/HeroReplay';
import MechanismStrip from '../components/landing/MechanismStrip';
import GraphShowcase from '../components/landing/GraphShowcase';
import CopilotShowcase from '../components/landing/CopilotShowcase';
import PatternShowcase from '../components/landing/PatternShowcase';
import ComplianceShowcase from '../components/landing/ComplianceShowcase';
import AlertsShowcase from '../components/landing/AlertsShowcase';
import ArchitectureDiagram from '../components/landing/ArchitectureDiagram';
import TrustSignals from '../components/landing/TrustSignals';

function SectionHeading({
  eyebrow,
  title,
  sub,
  align = 'center',
}: {
  eyebrow: string;
  title: string;
  sub?: string;
  align?: 'center' | 'left';
}) {
  const isCenter = align === 'center';
  return (
    <div className={`mb-10 ${isCenter ? 'text-center' : 'text-left'}`}>
      <p className="text-2xs font-medium tracking-wide uppercase text-accent-teal">{eyebrow}</p>
      <h2 className="text-2xl font-semibold text-text-primary mt-2">{title}</h2>
      {sub && <p className={`text-sm text-text-muted mt-2 max-w-[560px] ${isCenter ? 'mx-auto' : ''}`}>{sub}</p>}
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { data: documents } = useDocuments();

  const totalDocuments = documents?.length ?? 0;
  const totalEntities = documents?.reduce((sum, d) => sum + d.entity_count, 0) ?? 0;

  return (
    <div className="min-h-dvh bg-bg-base">
      <header className="flex items-center justify-between px-4 sm:px-8 h-16 border-b border-border-subtle sticky top-0 bg-bg-base/95 backdrop-blur z-10">
        <div className="flex items-center gap-2">
          <Layers size={20} className="text-accent-teal shrink-0" />
          <span className="font-semibold text-base text-text-primary">CorpusForge</span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={toggleTheme}
            title={theme === 'dark' ? 'Switch to light theme' : 'Switch to dark theme'}
            className="flex items-center justify-center w-10 h-10 rounded-md text-text-secondary hover:text-text-primary hover:bg-bg-elevated transition-fast"
          >
            {theme === 'dark' ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          <button
            onClick={() => navigate('/access')}
            className="inline-flex items-center gap-2 px-4 h-10 rounded-md bg-accent-teal text-white text-sm font-medium hover:bg-accent-teal-bright transition-fast"
          >
            <span className="hidden sm:inline">Launch Workspace</span>
            <span className="sm:hidden">Launch</span>
            <ArrowRight size={14} />
          </button>
        </div>
      </header>

      {/* Scene 1 — Hero: AI understands documents and reasons over them, live. */}
      <section className="px-4 sm:px-8 pt-14 sm:pt-20 pb-14 max-w-[1100px] mx-auto text-center">
        <p className="text-xs font-medium tracking-wide uppercase text-text-muted">
          Industrial Document Intelligence for Bharat Refineries Ltd.
        </p>
        <h1 className="text-3xl sm:text-hero font-bold tracking-tight text-text-primary mt-4 leading-tight">
          One brain for every document<br className="hidden sm:block" /> in your plant.
        </h1>
        <p className="text-base sm:text-lg text-text-secondary mt-5 max-w-[640px] mx-auto">
          The failure that repeats because nobody cross-referenced the last one. The clause
          nobody re-checked after the procedure changed. CorpusForge reads a refinery's manuals,
          SOPs, incident reports, and regulations once, then catches both before anyone has to ask.
        </p>

        <div className="mt-10">
          <HeroReplay documentCount={totalDocuments} />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-10 max-w-[720px] mx-auto">
          <div className="bg-bg-surface border border-border-default rounded-lg p-4 shadow-card dark:shadow-none">
            <p className="text-2xl font-bold text-text-primary">{totalDocuments}</p>
            <p className="text-xs text-text-muted mt-1">Documents ingested</p>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-4 shadow-card dark:shadow-none">
            <p className="text-2xl font-bold text-text-primary">{totalEntities.toLocaleString()}</p>
            <p className="text-xs text-text-muted mt-1">Entities extracted</p>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-4 shadow-card dark:shadow-none">
            <p className="text-2xl font-bold text-text-primary">5</p>
            <p className="text-xs text-text-muted mt-1">Connected capabilities</p>
          </div>
          <div className="bg-bg-surface border border-border-default rounded-lg p-4 shadow-card dark:shadow-none">
            <p className="text-2xl font-bold text-text-primary">0</p>
            <p className="text-xs text-text-muted mt-1">Raw SQL statements</p>
          </div>
        </div>
      </section>

      {/* Scene 2 — Documents become knowledge. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle bg-bg-surface">
        <SectionHeading
          eyebrow="Understanding"
          title="Documents become knowledge."
          sub="Every document is read exactly once, then understood five different ways."
        />
        <MechanismStrip />
      </section>

      {/* Scene 3 — Investigation Board: the primary product reveal. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle">
        <SectionHeading
          eyebrow="Investigation Board"
          title="Hidden relationships expose the evidence."
          sub="Equipment, incidents, work orders, and people connect on their own — nobody hand-draws these edges."
        />
        <GraphShowcase />
      </section>

      {/* Scene 4 — Copilot: every answer is grounded and explainable. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle bg-bg-surface">
        <SectionHeading
          eyebrow="Expert Copilot"
          align="left"
          title="Ask it anything the documents know."
          sub="Every answer is grounded in the corpus and carries a citation — this is the real chat component, not a mockup."
        />
        <CopilotShowcase />
      </section>

      {/* Scene 5 — Failure Pattern Intelligence: failures repeat, and the system notices. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle">
        <SectionHeading
          eyebrow="Failure Pattern Intelligence"
          title="The root cause nobody cross-referenced."
          sub="Detected automatically from this corpus's incident reports — shown exactly as it appears in the product."
        />
        <PatternShowcase />
      </section>

      {/* Scene 6 — Compliance: verified, not asserted. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle bg-bg-surface">
        <SectionHeading
          eyebrow="Compliance Gap Detection"
          title="Every clause, checked against every procedure."
          sub="Regulatory text extracted automatically and compared line by line — never a verdict invented to fill a gap."
        />
        <ComplianceShowcase />
      </section>

      {/* Scene 7 — Alerts: automatic consequence of new evidence. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle">
        <SectionHeading
          eyebrow="Proactive Alerts"
          title="New evidence, checked automatically."
          sub="A new document arrives, and the graph, patterns, and compliance status all update before anyone asks."
        />
        <AlertsShowcase />
      </section>

      {/* Scene 8 — Trust: every claim is checkable. Architecture and Trust merged, side by side. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle bg-bg-surface">
        <SectionHeading eyebrow="Trust & Rigor" title="Built to be checked, not just believed." />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 max-w-5xl mx-auto items-start">
          <ArchitectureDiagram />
          <TrustSignals />
        </div>
      </section>

      {/* Scene 9 — Launch Workspace. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle">
        <div className="max-w-[560px] mx-auto text-center">
          <h2 className="text-2xl font-semibold text-text-primary">Every claim, cited. Every answer, verified.</h2>
          <p className="text-sm text-text-secondary mt-3">
            No hallucinated answers. If the corpus does not contain what you asked, Forge says so
            instead of guessing.
          </p>
          <button
            onClick={() => navigate('/access')}
            className="inline-flex items-center gap-2 px-6 h-12 rounded-md bg-accent-teal text-white text-sm font-semibold hover:bg-accent-teal-bright transition-fast mt-7"
          >
            Launch Workspace
            <ArrowRight size={16} />
          </button>
        </div>
      </section>

      <footer className="px-4 sm:px-8 py-8 border-t border-border-subtle flex flex-col sm:flex-row items-center justify-between gap-3 max-w-[1100px] mx-auto">
        <div className="flex items-center gap-2">
          <Layers size={16} className="text-accent-teal shrink-0" />
          <span className="text-sm text-text-secondary">CorpusForge</span>
        </div>
        <p className="text-xs text-text-muted flex items-center gap-1.5">
          <FileText size={12} className="shrink-0" />
          Industrial Document Intelligence &middot; Bharat Refineries Ltd.
        </p>
      </footer>
    </div>
  );
}
