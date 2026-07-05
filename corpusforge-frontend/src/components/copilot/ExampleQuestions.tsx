import { Bot } from 'lucide-react';

const EXAMPLES = [
  'What is the safe operating pressure for P-101?',
  'Has C-205 had a bearing failure before?',
  'What does OISD-STD-105 require for calibration?',
  'Which procedure governs gas detector maintenance?',
];

export default function ExampleQuestions({ onSelect }: { onSelect: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16">
      <Bot size={48} className="text-text-muted" />
      <h2 className="text-lg font-semibold text-text-secondary mt-4">Ask anything about your plant</h2>
      <div className="flex flex-wrap justify-center gap-2 mt-6 max-w-xl">
        {EXAMPLES.map((q) => (
          <button
            key={q}
            onClick={() => onSelect(q)}
            className="text-sm text-accent-teal border border-border-default hover:border-accent-teal rounded-lg px-3 py-2 min-h-[44px] transition-fast text-left"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
