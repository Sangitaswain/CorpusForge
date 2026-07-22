import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, Layers, Moon, Sun } from 'lucide-react';
import { useTheme } from '../hooks/useTheme';
import { useDocuments } from '../hooks/useDocuments';
import HeroReplay from '../components/landing/HeroReplay';

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

      {/* Hero — one dominant object, no stats, no cards competing for attention. */}
      <section className="px-4 sm:px-8 pt-20 sm:pt-28 pb-24 max-w-[900px] mx-auto text-center">
        <h1 className="text-4xl sm:text-hero font-bold tracking-tight text-text-primary leading-[1.05]">
          Industrial-grade intelligence
          <br className="hidden sm:block" /> for every document in your plant.
        </h1>
        <p className="text-base sm:text-lg text-text-secondary mt-6 max-w-[560px] mx-auto">
          CorpusForge reads a refinery's manuals, SOPs, incident reports, and regulations once,
          then answers questions, traces relationships, and catches gaps before anyone has to ask.
        </p>

        <div className="mt-12">
          <HeroReplay documentCount={totalDocuments} />
        </div>
      </section>

      {/* Ready to deploy — a deliberate, fixed-dark closing moment regardless of the active
          theme toggle, using the exact dark-theme tokens from UI_Design_System.md §2.1
          (not invented colors), for a hard tonal break before the CTA. */}
      <section className="bg-[#070E0D] px-4 sm:px-8 py-20 sm:py-28 text-center">
        <h2 className="text-2xl sm:text-3xl font-semibold text-[#E8F0EE]">Ready to deploy?</h2>
        <p className="text-sm sm:text-base text-[#93ADA8] mt-3 max-w-[440px] mx-auto">
          Secure your data. Empower your engineers.
        </p>
        <button
          onClick={() => navigate('/access')}
          className="inline-flex items-center gap-2 px-6 h-12 rounded-md bg-[#EA580C] text-white text-sm font-semibold hover:bg-[#F97316] transition-fast mt-8"
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
