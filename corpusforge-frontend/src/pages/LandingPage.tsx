import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Layers, Moon, Sun, Upload, Share2, MessageSquareText, type LucideIcon } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocuments } from '../hooks/useDocuments';
import HeroReplay from '../components/landing/HeroReplay';
import GraphShowcase from '../components/landing/GraphShowcase';

function ProcessCard({
  icon: Icon,
  step,
  title,
  description,
  terminal,
}: {
  icon: LucideIcon;
  step: string;
  title: string;
  description: string;
  terminal: string[];
}) {
  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5 flex-1">
      <Icon size={18} className="text-accent-teal" />
      <p className="text-2xs font-medium tracking-wide uppercase text-accent-teal mt-3">{step}</p>
      <h3 className="text-base font-semibold text-text-primary mt-1">{title}</h3>
      <p className="text-sm text-text-secondary mt-1.5">{description}</p>
      <div className="bg-bg-elevated rounded-md px-3 py-2 mt-4 font-mono text-2xs text-text-muted leading-relaxed">
        {terminal.map((line) => (
          <p key={line}>{line}</p>
        ))}
      </div>
    </div>
  );
}

export default function LandingPage() {
  const navigate = useNavigate();
  const { theme, toggleTheme } = useTheme();
  const { data: documents } = useDocuments();

  const totalDocuments = documents?.length ?? 0;

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

      {/* Hero — status pill, monumental headline, one dominant Q&A card. */}
      <section className="px-4 sm:px-8 pt-16 sm:pt-24 pb-20 max-w-[900px] mx-auto text-center">
        <span className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-border-default bg-bg-surface text-2xs font-medium text-text-secondary">
          <span className="w-1.5 h-1.5 rounded-full bg-accent-teal" aria-hidden="true" />
          CorpusForge Active
        </span>

        <h1 className="text-4xl sm:text-hero font-bold tracking-tight text-text-primary mt-6 leading-[1.05]">
          Industrial-grade intelligence
          <br className="hidden sm:block" /> for every document in your plant.
        </h1>
        <p className="text-base sm:text-lg text-text-secondary mt-5 max-w-[560px] mx-auto">
          CorpusForge reads a refinery's manuals, SOPs, incident reports, and regulations once —
          built for the rigorous demands of Bharat Refineries Ltd.
        </p>

        <div className="mt-12">
          <HeroReplay documentCount={totalDocuments} />
        </div>
      </section>

      {/* From unstructured data to actionable intelligence — the real ingest -> map -> query pipeline. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle bg-bg-surface">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-semibold text-text-primary">From unstructured data to actionable intelligence.</h2>
          <p className="text-sm text-text-muted mt-2 max-w-lg">
            A systematic approach to organizing decades of operational knowledge.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-8">
            <ProcessCard
              icon={Upload}
              step="1. Ingest"
              title="Ingest"
              description="Manuals, SOPs, incident reports, and regulations are parsed, chunked, and embedded locally."
              terminal={['> PARSING: INC-2022-07_P101_Bearing_Failure.txt... OK', '> EXTRACTING: entities, relationships']}
            />
            <ProcessCard
              icon={Share2}
              step="2. Map"
              title="Map"
              description="Entities are linked automatically — equipment, work orders, people, and documents form one graph."
              terminal={['LINK ESTABLISHED:', '[P-101] -> (maintained_by) -> [R. Nair]']}
            />
            <ProcessCard
              icon={MessageSquareText}
              step="3. Query"
              title="Query"
              description="Ask complex operational questions in plain language. Every answer traces back to an exact source."
              terminal={['Q: Root cause of P-101 failure?', 'A: Wrong grease (Ref: INC-2022-07)']}
            />
          </div>
        </div>
      </section>

      {/* The Investigation Board — the signature scene, real entities from the P-101 case. */}
      <section className="px-4 sm:px-8 py-16 border-t border-border-subtle">
        <div className="max-w-4xl mx-auto text-center mb-10">
          <h2 className="text-2xl font-semibold text-text-primary">The Investigation Board</h2>
          <p className="text-sm text-text-muted mt-2 max-w-lg mx-auto">
            Visualize connections across the entire plant hierarchy instantly.
          </p>
        </div>
        <GraphShowcase />
      </section>

      {/* Dark closing CTA — deliberate fixed-dark tonal break, exact dark-theme tokens from
          UI_Design_System.md §2.1, regardless of the active theme toggle. */}
      <section className="bg-[#070E0D] px-4 sm:px-8 py-20 sm:py-24 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-[#E8F0EE]">
          Every answer cited. Every gap caught before it's a problem.
        </h2>
        <p className="text-sm sm:text-base text-[#93ADA8] mt-3 max-w-[520px] mx-auto">
          Grounded in your actual manuals, SOPs, and incident reports — never generic training
          data, never a guess.
        </p>
        <button
          onClick={() => navigate('/access')}
          className="inline-flex items-center gap-2 px-6 h-12 rounded-md bg-accent-teal text-white text-sm font-semibold hover:bg-accent-teal-bright transition-fast mt-8"
        >
          Launch Workspace
          <ArrowRight size={16} />
        </button>
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
