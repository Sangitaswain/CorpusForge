import { CheckCircle2, Database, FileSearch, KeyRound, ShieldOff } from 'lucide-react';

// Every line here is a claim this codebase actually enforces today (CLAUDE.md permanent
// rules) — deliberately excludes things like RBAC or audit logs that aren't built yet.
const SIGNALS = [
  { icon: FileSearch, label: 'Every answer carries a citation to the exact source page' },
  { icon: ShieldOff, label: "If the corpus doesn't contain the answer, Forge says so instead of guessing" },
  { icon: Database, label: 'SQLAlchemy ORM only — zero raw SQL statements in the codebase' },
  { icon: KeyRound, label: 'Every file served through a time-limited signed URL, never a public link' },
  { icon: CheckCircle2, label: '128 automated backend tests, hermetic — no real API calls in the suite' },
];

export default function TrustSignals() {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-3xl mx-auto">
      {SIGNALS.map(({ icon: Icon, label }) => (
        <div key={label} className="flex items-start gap-3 bg-bg-surface border border-border-default rounded-lg p-4">
          <Icon size={16} className="text-accent-teal shrink-0 mt-0.5" />
          <p className="text-sm text-text-secondary">{label}</p>
        </div>
      ))}
    </div>
  );
}
