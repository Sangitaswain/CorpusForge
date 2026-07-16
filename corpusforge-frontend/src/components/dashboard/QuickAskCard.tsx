import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Search } from 'lucide-react';

const EXAMPLE_QUESTIONS = ['Why did C-205 fail?', 'Show contractor maintenance risks', 'What compliance gaps exist?'];

export default function QuickAskCard() {
  const [value, setValue] = useState('');
  const navigate = useNavigate();

  const ask = (question: string) => {
    if (!question.trim()) return;
    navigate('/ask-forge', { state: { question } });
  };

  return (
    <div className="bg-bg-surface border border-border-default rounded-lg p-5">
      <div className="flex items-center gap-2">
        <MessageSquare size={16} className="text-accent-teal" />
        <h2 className="text-sm font-semibold text-text-primary">Ask CorpusForge</h2>
      </div>

      <form
        onSubmit={(e) => {
          e.preventDefault();
          ask(value);
        }}
        className="mt-3 relative"
      >
        <Search size={14} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-text-muted" />
        <input
          value={value}
          onChange={(e) => setValue(e.target.value)}
          placeholder="Ask about your plant..."
          className="w-full bg-bg-elevated border border-border-default rounded-md pl-9 pr-3.5 py-2.5 text-sm text-text-primary
                     placeholder:text-text-muted focus:outline-none focus:border-accent-teal focus:ring-1
                     focus:ring-accent-teal/20 transition-fast min-h-[44px]"
        />
      </form>

      <div className="flex flex-wrap gap-2 mt-3">
        {EXAMPLE_QUESTIONS.map((q) => (
          <button
            key={q}
            onClick={() => ask(q)}
            className="px-3 py-1.5 rounded-full border border-accent-teal text-accent-teal text-xs font-medium
                       hover:bg-accent-teal-dim transition-fast min-h-[28px]"
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}
